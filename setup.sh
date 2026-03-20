#!/usr/bin/env bash
set -e

# setup.sh - initialize repo, create GitHub repo with gh (optional), add remote and push
# Usage: ./setup.sh [remote_url_or_owner/repo]

ROOT_DIR=$(cd "$(dirname "$0")" && pwd)
cd "$ROOT_DIR"

echo "== Setup script for Eventos_traslados =="

# Ensure git initialized
if [ ! -d .git ]; then
  echo "Git repo not found. Initializing..."
  git init
else
  echo "Git repo detected."
fi

# Ensure there is at least one commit
if [ -z "$(git status --porcelain)" ]; then
  echo "No changes to commit."
else
  echo "Staging and committing changes..."
  git add .
  git commit -m "Initial commit"
fi

# Ensure branch main
git branch --show-current >/dev/null 2>&1 || true
CURRENT_BRANCH=$(git rev-parse --abbrev-ref HEAD)
if [ "$CURRENT_BRANCH" != "main" ]; then
  echo "Setting branch to main"
  git branch -M main
fi

ARG=$1
REMOTE_URL=""

# If remote already exists, show and ask to replace
if git remote get-url origin >/dev/null 2>&1; then
  echo "Remote 'origin' already exists: $(git remote get-url origin)"
  read -p "Do you want to replace it? (y/N): " REPLACE
  if [[ "$REPLACE" =~ ^[Yy]$ ]]; then
    git remote remove origin
  else
    REMOTE_URL=$(git remote get-url origin)
  fi
fi

# If remote not set yet, try to create with gh or use ARG
if [ -z "$REMOTE_URL" ]; then
  if [ -n "$ARG" ]; then
    # If arg is owner/repo, build https url
    if [[ "$ARG" != http* ]]; then
      REMOTE_URL="https://github.com/$ARG.git"
    else
      REMOTE_URL="$ARG"
    fi
  fi

  if [ -z "$REMOTE_URL" ] && command -v gh >/dev/null 2>&1; then
    echo "gh CLI detected."
    read -p "Create a new GitHub repo for this project using gh? (y/N): " CREATE_GH
    if [[ "$CREATE_GH" =~ ^[Yy]$ ]]; then
      DEFAULT_NAME=$(basename "$ROOT_DIR")
      read -p "Repo name (default: $DEFAULT_NAME): " REPO_NAME
      REPO_NAME=${REPO_NAME:-$DEFAULT_NAME}
      read -p "Public or private? (public/private, default public): " VIS
n      VIS=${VIS:-public}
      if [[ "$VIS" == "private" ]]; then
        gh repo create "$REPO_NAME" --private --source=. --remote=origin --push
      else
        gh repo create "$REPO_NAME" --public --source=. --remote=origin --push
      fi
      REMOTE_URL=$(git remote get-url origin)
    fi
  fi

  if [ -z "$REMOTE_URL" ]; then
    if [ -z "$ARG" ]; then
      read -p "Enter remote URL (https://github.com/USER/REPO.git) or owner/repo: " INPUT_URL
      if [[ "$INPUT_URL" != http* ]]; then
        REMOTE_URL="https://github.com/$INPUT_URL.git"
      else
        REMOTE_URL="$INPUT_URL"
      fi
    else
      REMOTE_URL="$REMOTE_URL"
    fi

    if [ -n "$REMOTE_URL" ]; then
      git remote add origin "$REMOTE_URL"
      echo "Added remote origin -> $REMOTE_URL"
    fi
  fi
fi

# Push
if [ -n "$(git ls-remote --heads origin main 2>/dev/null)" ]; then
  echo "Remote has main branch. Pushing updates..."
  git push origin main
else
  echo "Pushing branch main and setting upstream..."
  git push -u origin main
fi

echo "\nSetup complete. Next steps:"
echo "- In GitHub: set repository secrets (VERCEL_TOKEN, VERCEL_ORG_ID, VERCEL_PROJECT_ID, RENDER_API_KEY, RENDER_SERVICE_ID)"
echo "- In Vercel/Render: configure environment variables for VITE_API_URL, JWT_SECRET, and Firebase if needed."

echo "Done."