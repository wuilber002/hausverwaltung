#!/usr/bin/env bash
set -euo pipefail

repo_root="$(git rev-parse --show-toplevel)"
hooks_path="$repo_root/.githooks"

test -x "$repo_root/scripts/check-upstream-issue-refs.sh" || {
  echo "Missing executable safety checker: $repo_root/scripts/check-upstream-issue-refs.sh" >&2
  exit 1
}

git config core.hooksPath "$hooks_path"
echo "Git safety hooks enabled at: $hooks_path"
