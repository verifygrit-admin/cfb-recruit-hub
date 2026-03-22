# Patch — Agent Memory Index

## Memory Files

| File | Type | Summary |
|------|------|---------|
| `profiles_user_id_null_resolution.md` | project | profiles.user_id NOT NULL blocks saveRecruit() at Step 6. Option 1 approved (DROP NOT NULL + ON DELETE SET NULL). Migration 0005 to create at build session. completePendingAccount must UPDATE user_id after auth creation. RESOLVED — deferred to build session. 2026-03-22. |
