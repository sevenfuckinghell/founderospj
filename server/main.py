"""
Founder OS — API / Control Plane (production blueprint).

The browser demo runs these exact contracts in-process; this service moves
them server-side so secrets, policy and persistence never touch the client.

    Web App → HTTPS/SSE → this service (Auth / RBAC / Policy / API)
        → PostgreSQL + Redis → workers → AI Gateway / Tool Gateway

Run:  uvicorn main:app --host 0.0.0.0 --port 8000
Env:  DATABASE_URL, REDIS_URL, AUTH_SECRET, CORS_ORIGINS
"""
from __future__ import annotations

import asyncio
import json
import os
import uuid
from datetime import datetime, timezone

import redis.asyncio as redis
from fastapi import Depends, FastAPI, Header, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from pydantic import BaseModel, Field
from sqlalchemy import create_engine, text

DATABASE_URL = os.environ["DATABASE_URL"]
REDIS_URL = os.environ.get("REDIS_URL", "redis://redis:6379/0")
QUEUE_KEY = "founder-os:jobs"
EVENTS_CHANNEL = "founder-os:events"

engine = create_engine(DATABASE_URL, pool_pre_ping=True)
queue = redis.from_url(REDIS_URL)

app = FastAPI(title="Founder OS Control Plane", version="4.2.0")
app.add_middleware(
    CORSMiddleware,
    allow_origins=os.environ.get("CORS_ORIGINS", "*").split(","),
    allow_methods=["*"],
    allow_headers=["*"],
)

# ----------------------------------------------------------------------
# Policy — mirrors the client's autonomy matrix exactly.
# HIGH / CRITICAL tools ALWAYS require a human decision; autonomy levels
# can never bypass that rule.
# ----------------------------------------------------------------------
ROLES = {"OWNER": 4, "ADMIN": 3, "MEMBER": 2, "VIEWER": 1}
AUTO_ALLOWED = {
    "MANUAL": {"READ"},
    "ASSISTED": {"READ", "LOW"},
    "SUPERVISED": {"READ", "LOW", "MEDIUM"},
    "AUTONOMOUS": {"READ", "LOW", "MEDIUM"},
}


def policy_allows(autonomy: str, risk_level: str) -> bool:
    if risk_level in {"HIGH", "CRITICAL"}:
        return False
    return risk_level in AUTO_ALLOWED.get(autonomy, set())


# ----------------------------------------------------------------------
# Auth / RBAC — blueprint hook: swap the token check for real
# verification (AUTH_SECRET-signed sessions or OIDC) before production.
# ----------------------------------------------------------------------
def require_role(minimum: str):
    def dep(authorization: str | None = Header(default=None)):
        token = (authorization or "").removeprefix("Bearer ").strip()
        if not token:
            raise HTTPException(401, "missing bearer token")
        role = "MEMBER"  # resolve role from session store by token
        if ROLES[role] < ROLES[minimum]:
            raise HTTPException(403, f"requires role {minimum}")
        return {"role": role}

    return dep


# ----------------------------------------------------------------------
# Schemas — validate at the edge; workers never see raw client payloads.
# ----------------------------------------------------------------------
class GoalIn(BaseModel):
    title: str = Field(min_length=8, max_length=200)
    description: str = ""
    success_criteria: list[str] = []
    constraints: list[str] = []
    budget: str | None = None
    deadline: str | None = None


class ApprovalDecision(BaseModel):
    decision: str = Field(pattern="^(APPROVED|REJECTED)$")


def emit(event_type: str, project_id: str, message: str) -> None:
    queue.publish(
        EVENTS_CHANNEL,
        json.dumps(
            {
                "id": str(uuid.uuid4()),
                "type": event_type,
                "project_id": project_id,
                "message": message,
                "ts": datetime.now(timezone.utc).isoformat(),
            }
        ),
    )


# ----------------------------------------------------------------------
# Routes
# ----------------------------------------------------------------------
@app.get("/api/v1/health")
def health():
    return {"ok": True, "service": "control-plane", "version": "4.2.0"}


@app.post("/api/v1/goals", status_code=201)
def create_goal(goal: GoalIn, ctx=Depends(require_role("MEMBER"))):
    goal_id, project_id = str(uuid.uuid4()), str(uuid.uuid4())
    with engine.begin() as conn:
        conn.execute(
            text(
                "INSERT INTO projects (id, name, phase) VALUES (:p, :n, 'PLANNING')"
            ),
            {"p": project_id, "n": goal.title[:60]},
        )
        conn.execute(
            text(
                "INSERT INTO goals (id, project_id, title, description, success_criteria, constraints, budget, deadline) "
                "VALUES (:g, :p, :t, :d, :sc, :cs, :b, :dl)"
            ),
            {
                "g": goal_id, "p": project_id, "t": goal.title, "d": goal.description,
                "sc": json.dumps(goal.success_criteria), "cs": json.dumps(goal.constraints),
                "b": goal.budget, "dl": goal.deadline,
            },
        )
    # Hand off to the worker pool — the control plane never runs agents itself.
    queue.lpush(QUEUE_KEY, json.dumps({"job": "plan_goal", "goal_id": goal_id, "project_id": project_id}))
    emit("GOAL_CREATED", project_id, goal.title)
    return {"goal_id": goal_id, "project_id": project_id, "status": "PLANNING"}


@app.get("/api/v1/tasks")
def list_tasks(project_id: str, ctx=Depends(require_role("VIEWER"))):
    with engine.connect() as conn:
        rows = conn.execute(
            text(
                "SELECT id, key, title, status, agent_id, priority_score "
                "FROM tasks WHERE project_id = :p ORDER BY priority_score DESC"
            ),
            {"p": project_id},
        ).mappings().all()
    return {"tasks": [dict(r) for r in rows]}


@app.post("/api/v1/approvals/{approval_id}/decide")
def decide_approval(approval_id: str, body: ApprovalDecision, ctx=Depends(require_role("OWNER"))):
    with engine.begin() as conn:
        conn.execute(
            text("UPDATE approvals SET status = :s, decided_at = now() WHERE id = :id AND status = 'PENDING'"),
            {"s": body.decision, "id": approval_id},
        )
        row = conn.execute(text("SELECT project_id, task_id, tool_id FROM approvals WHERE id = :id"), {"id": approval_id}).mappings().first()
    if not row:
        raise HTTPException(404, "approval not found")
    if body.decision == "APPROVED" and row["tool_id"]:
        queue.lpush(QUEUE_KEY, json.dumps({"job": "run_tool", "task_id": row["task_id"], "tool_id": row["tool_id"], "decision": "founder-approved"}))
    emit("APPROVAL_GRANTED" if body.decision == "APPROVED" else "APPROVAL_REJECTED", row["project_id"], approval_id)
    return {"status": body.decision}


# ----------------------------------------------------------------------
# SSE — the browser subscribes here instead of polling.
# ----------------------------------------------------------------------
@app.get("/api/v1/events")
async def event_stream(ctx=Depends(require_role("VIEWER"))):
    pubsub = queue.pubsub()
    await pubsub.subscribe(EVENTS_CHANNEL)

    async def gen():
        try:
            async for msg in pubsub.listen():
                if msg["type"] == "message":
                    yield f"data: {msg['data'].decode()}\n\n"
        finally:
            await pubsub.unsubscribe(EVENTS_CHANNEL)
            await pubsub.close()

    return StreamingResponse(gen(), media_type="text/event-stream")
