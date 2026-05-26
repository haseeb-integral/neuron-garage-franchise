## Clean up `_ARCHIVED_DO_NOT_USE/`

### Current state
The `_ARCHIVED_DO_NOT_USE/` folder contains 18 files — stale docs from earlier project phases. None are imported or read by the running app. Per the source-of-truth agreement, live code + chat decisions drive development, not these archived files.

### Goal
Keep `TEACHER_IDEAL_PROFILE.md` (client-provided teacher profile) and `DESIGN.md` (reference for future redesigns). Delete the other 16 files.

### Files to DELETE
```
AGENTS.md
APIS.md
CLAUDE.md
DATABASE_LAYER_SPEC.md
DATA_SOURCING_DECISIONS.md
GLOSSARY.md
HOW_IT_WORKS.md
LATER.md
MAY15_MEETING_NOTES.md
OPEN_TASKS.md
PROJECT_CONTEXT.md
QA_CHECKLIST.md
README.md
TPD.md
WORKFLOW.md
```

### Files to KEEP
```
TEACHER_IDEAL_PROFILE.md
DESIGN.md
```

### Recovery
Everything being deleted exists in Git history on the `main` branch. If any file is ever needed again, it can be restored from Git at any time.

### No code, schema, or app changes.
This is purely repository housekeeping.