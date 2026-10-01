#!/usr/bin/env bash
set -euo pipefail

# A public fork belongs to the upstream repository network. GitHub can add a
# timeline event to an upstream issue when a pushed commit message contains
# `#123` or `owner/repository#123`. Keep those references in approved upstream
# PR bodies, never in commits pushed to this fork.

usage() {
  cat >&2 <<'EOF'
Usage:
  check-upstream-issue-refs.sh --message-file <path>
  check-upstream-issue-refs.sh --range <revision-range>
EOF
  exit 2
}

contains_issue_reference() {
  grep -nE '(^|[^[:alnum:]_])#[0-9]+|[[:alnum:]_.-]+/[[:alnum:]_.-]+#[0-9]+' "$1"
}

fail() {
  cat >&2 <<'EOF'
ERROR: upstream issue reference found in a commit message.

This public fork must not create automatic activity on upstream issues. Use a
neutral commit message, for example:

  fix(i18n): preserve locale after sign-out

Put `Fixes #<issue>` only in an explicitly approved upstream pull request.
EOF
  exit 1
}

case "${1:-}" in
  --message-file)
    [ "$#" -eq 2 ] || usage
    if contains_issue_reference "$2"; then fail; fi
    ;;
  --range)
    [ "$#" -eq 2 ] || usage
    messages="$(mktemp)"
    trap 'rm -f "$messages"' EXIT
    git log --format=%B "$2" >"$messages"
    if contains_issue_reference "$messages"; then fail; fi
    ;;
  *) usage ;;
esac
