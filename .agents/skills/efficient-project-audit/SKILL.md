---
name: efficient-project-audit
description: Audit an entire software repository, especially development, release, and main branches, for regressions, branch-history damage, security issues, release-readiness problems, and suspicious agent-generated changes. Use when asked for a whole-project audit, branch comparison, release audit, or verification that an AI coding agent did not damage a repository.
---

# Efficient Project Audit

Minimize token usage aggressively while preserving audit coverage and accuracy.

- Reuse cached dependencies, build artifacts, tool output, and already-read context whenever trustworthy.
- Prefer compact, batched read-only commands and targeted searches over full-file dumps.
- Avoid repeating output or re-reading unchanged files. Summarize large diffs mechanically, then inspect only high-risk areas.
- Run independent checks in parallel when safe. Do not install, upgrade, or redownload dependencies when the lockfile and local cache suffice.
- Treat user changes as immutable unless explicitly authorized to fix them.
- Audit branch topology, worktree state, committed secrets, dependency integrity, static checks, tests, builds, CI/release configuration, database migrations, authentication, authorization, and destructive operational scripts.
- Record evidence, commands, limitations, and prioritized findings in a concise repository artifact when the user requests an audit but restricts the chat response.
- Use the completion protocol by default unless the user explicitly disables it for the current request: reply `OK` after understanding, then conclude with `fatto` followed by a concise report of the completed work, verification, findings, and any limitations. Do not emit other user-facing messages unless a necessary clarification or progress update is requested.
