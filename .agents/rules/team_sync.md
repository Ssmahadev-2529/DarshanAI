# Team Collaboration & Auto-Sync Rule

Whenever starting any conversation, session, or implementing changes in this workspace:
1. **Always Check Remote Updates First**:
   - Proactively inform the developer: *"Checking for latest team changes from GitHub..."*
   - Execute `git pull --autostash origin main` (or `./pull_latest.bat` on Windows / `./pull_latest.ps1`) before editing any file to ensure complete synchronization with teammates.
2. **Safe Conflict Stashing**:
   - Always include `--autostash` to safely preserve in-flight local modifications.
3. **Continuous Commit & Push**:
   - Immediately upon completing any feature, optimization, or bug fix, stage all modified files, commit using conventional commit syntax (e.g. `feat: ...`, `fix: ...`, `docs: ...`), and push directly to `origin/main`.
