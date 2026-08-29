"""
Founder OS — Worker / Agent runner (production blueprint).

Consumes the Redis job queue and runs agents against the AI Gateway and
Tool Gateway. Same contracts as the in-browser demo engine: structured
agent output, permission-checked tools, immutable domain events,
bounded retries with a dead-letter queue. Never an unbounded agent loop.

Run:  python worker.py
Env:  REDIS_URL, DATABASE_URL, AI_API_KEY
"""
from __future__ import annotations

import json
import os
import time
import traceback
import uuid

import redis
from sqlalchemy import create_engine, text

REDIS_URL = os.environ.get("REDIS_URL", "redis://redis:6379/0")
DATABASE_URL = os.environ["DATABASE_URL"]
QUEUE_KEY = "founder-os:jobs"
DLQ_KEY = "founder-os:dead-letter"
EVENTS_CHANNEL = "founder-os:events"

MAX_RETRIES = 2  # hard bound — failures escalate to a human after this

r = redis.from_url(REDIS_URL)
engine = create_engine(DATABASE_URL, pool_pre_ping=True)


# ----------------------------------------------------------------------
# AI Gateway — one seam between agents and model providers. Swap the
# call below per provider; agents only ever see structured output.
# ----------------------------------------------------------------------
def ai_gateway(prompt: str, model: str, timeout: int = 60) -> dict:
    try:
        import openai  # optional — only needed when not in demo mode

        client = openai.OpenAI(api_key=os.environ["AI_API_KEY"], timeout=timeout)
        resp = client.responses.create(model=model, input=prompt)
        return {"ok": True, "text": resp.output_text, "model": model}
    except Exception as e:  # rate limit / network / model errors
        return {"ok": False, "error": str(e), "model": model}


# ----------------------------------------------------------------------
# Tool Gateway — every tool passes the permission matrix before it runs.
# HIGH / CRITICAL can only arrive here with a founder-approved job.
# ----------------------------------------------------------------------
TOOL_RISK = {
    "github.read_repo": "READ", "github.create_branch": "LOW", "github.create_pr": "LOW",
    "docs.create": "LOW", "calendar.create_event": "LOW",
    "email.send": "MEDIUM", "content.publish": "MEDIUM",
    "cloud.provision": "HIGH", "deploy.production": "HIGH", "db.delete": "CRITICAL",
}


def tool_gateway(tool_id: str, decision: str) -> dict:
    risk = TOOL_RISK.get(tool_id, "HIGH")
    if risk in {"HIGH", "CRITICAL"} and decision != "founder-approved":
        return {"ok": False, "error": f"{tool_id} ({risk}) requires founder approval"}
    # dispatch to the real integration (github/slack/gmail/calendar/cloud)…
    return {"ok": True, "tool": tool_id, "risk": risk}


# ----------------------------------------------------------------------
# Agents — capability-keyed dispatch, structured results only.
# ----------------------------------------------------------------------
def run_agent(job: dict) -> dict:
    kind = job.get("job")
    if kind == "plan_goal":
        out = ai_gateway(f"Decompose goal {job['goal_id']} into a task DAG", model="gpt-5")
        if not out["ok"]:
            raise RuntimeError(out["error"])
        return {"status": "completed", "artifacts": [], "next_actions": ["create_tasks"]}
    if kind == "run_tool":
        res = tool_gateway(job["tool_id"], job.get("decision", "auto"))
        if not res["ok"]:
            raise PermissionError(res["error"])
        return {"status": "completed", "tool_result": res}
    raise ValueError(f"unknown job kind: {kind}")


def emit(event_type: str, project_id: str, message: str) -> None:
    r.publish(EVENTS_CHANNEL, json.dumps({
        "id": str(uuid.uuid4()), "type": event_type,
        "project_id": project_id, "message": message, "ts": time.time(),
    }))


def main() -> None:
    print("founder-os worker online — waiting for jobs")
    while True:
        _, raw = r.brpop(QUEUE_KEY)
        job = json.loads(raw)
        attempt = job.get("attempt", 0)
        try:
            result = run_agent(job)
            emit("AGENT_COMPLETED", job.get("project_id", "system"), json.dumps(job)[:80])
            with engine.begin() as conn:
                conn.execute(
                    text("INSERT INTO agent_runs (id, project_id, status, result) VALUES (:i, :p, 'completed', :r)"),
                    {"i": str(uuid.uuid4()), "p": job.get("project_id", "system"), "r": json.dumps(result)},
                )
        except Exception as e:
            if attempt < MAX_RETRIES:
                job["attempt"] = attempt + 1
                time.sleep(2 ** attempt)  # exponential backoff
                r.lpush(QUEUE_KEY, json.dumps(job))
                emit("TASK_FAILED", job.get("project_id", "system"), f"retry {attempt + 1}: {e}")
            else:
                r.lpush(DLQ_KEY, raw)  # dead-letter → human escalation
                emit("TASK_FAILED", job.get("project_id", "system"), f"escalated: {e}")
                traceback.print_exc()


if __name__ == "__main__":
    main()
