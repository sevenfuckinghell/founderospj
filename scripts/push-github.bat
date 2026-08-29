@echo off
setlocal enabledelayedexpansion
title Founder OS - Push to GitHub
echo.
echo  FOUNDER OS - push all changes to GitHub
echo  Requires: Git (https://git-scm.com/download/win)
echo.

where git >nul 2>nul
if errorlevel 1 (
  echo  Git is not installed. Get it from https://git-scm.com/download/win
  pause
  exit /b 1
)

if not exist .git (
  echo  [1/5] Initializing repository...
  git init -b main
) else (
  echo  [1/5] Repository already initialized.
)

echo  [2/5] Staging all changes...
git add -A

echo  [3/5] Committing...
git commit -m "Founder OS v4.2 - AI operating console (multi-tenant, agents, approvals, backlog)"
if errorlevel 1 echo        ^(nothing new to commit - continuing^)

if not "%~1"=="" (
  git remote remove origin >nul 2>nul
  git remote add origin %1
) else (
  git remote get-url origin >nul 2>nul
  if errorlevel 1 (
    echo.
    set /p REMOTE_URL="  Paste your GitHub repo URL (e.g. https://github.com/you/founder-os.git): "
    git remote add origin !REMOTE_URL!
  )
)

echo  [4/5] Pushing to origin/main ...
echo        ^(a browser window may open for GitHub sign-in^)
git push -u origin main
if errorlevel 1 goto :fail

echo.
echo  [5/5] DONE. Your repository is live:
git remote get-url origin
echo.
pause
exit /b 0

:fail
echo.
echo  Push failed. Common fixes:
echo    - Create the empty repository on github.com first (no README)
echo    - Sign in: the credential manager will prompt, or use a Personal Access Token
echo    - Docs: https://docs.github.com/en/get-started/getting-started-with-git
pause
exit /b 1
