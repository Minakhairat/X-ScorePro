# X-Score Security Specification (Phase 0: Payload-First Security TDD)

## 1. Data Invariants
1. **Super Admin Authority**: Only the verified email `minakhairat1@gmail.com` (`email_verified == true`) holds Super Admin authority to create/delete employees, create/delete admin accounts, and close monthly cycles.
2. **Scoped Sub-Admin Isolation**: Every sub-admin (`assistant_admin` or `supervisor`) must exist in `/admins/{adminKey}` with `active == true` and verified matching email, and must link their UID via `/user_admin_links/{uid}`. A `supervisor` can only record X-Scores for employees explicitly linked in `/admins/{adminKey}/assignedEmployees/{employeeId}`.
3. **Assistant Admin Assignment Scope**: An `assistant_admin` with `canAssignEmployees == true` can assign/unassign specific employees to admins via `/admins/{adminKey}/assignedEmployees/{employeeId}`, `/employees/{employeeId}.assignedAdminKeys`, and `/directory/admin_assignments`.
4. **Zero PII Leakage**: `/employees/{employeeId}`, `/stats/{statId}`, and `/directory/{docId}` never store personal emails, phone numbers, or addresses. `/admins/{adminKey}` and `/admins/{adminKey}/assignedEmployees/{employeeId}` restrict `list` queries strictly to Super Admin or the matching verified `email` without any `get()`/`exists()` inside `allow list`.
5. **Temporal & Identity Integrity**: All `createdAt` and `updatedAt` fields must equal `request.time`; `createdAt` is immutable on update; `recordedByUid` and `closedByUid` must equal `request.auth.uid`.
6. **Strict Schema & Bounds**: Every write validates required/allowed keys (`hasAll` + `hasOnly`), string `.size()` bounds, numeric range bounds (`excessCount >= 0`, `0 <= discountPercentage <= 100`), and array size caps (`recentLogs.size() <= 50`, `assignedAdminKeys.size() <= 15`).

## 2. The "Dirty Dozen" Adversarial Payloads
1. **Unauthenticated Write**: Unauthenticated user tries `create` on `/employees/emp_999` -> `PERMISSION_DENIED`.
2. **Email Spoofing (Unverified Email)**: User with `email: "minakhairat1@gmail.com"` and `email_verified: false` tries `list` on `/admins` or `create` on `/employees/emp_999` -> `PERMISSION_DENIED`.
3. **Self-Privilege Escalation**: Verified non-admin `attacker@gmail.com` tries to create `/admins/adm_hack` with `role: "assistant_admin"` -> `PERMISSION_DENIED`.
4. **Cross-User UID Link Spoofing**: Verified user tries to create `/user_admin_links/{uid}` pointing to someone else's `adminKey` -> `PERMISSION_DENIED` (email mismatch against `/admins/{adminKey}`).
5. **Supervisor Out-of-Scope X-Score Write**: Active supervisor assigned to `emp_956` attempts to update `excessCount` on unassigned `emp_43698` -> `PERMISSION_DENIED`.
6. **Shadow Field Injection ("Ghost Field")**: Admin attempts to update `/employees/emp_956` including an undeclared field `isVerified: true` -> `PERMISSION_DENIED` (`hasOnly` rejection).
7. **Value Poisoning (Out-of-Bounds Discount)**: Admin sets `discountPercentage: 150` or `excessCount: -10` on `/employees/emp_956` -> `PERMISSION_DENIED`.
8. **ID Poisoning (Path Traversal / Oversized ID)**: Attempt to `get` or `create` `/employees/emp_$$$invalid` or a 200-char doc ID -> `PERMISSION_DENIED` (`isValidId` rejection).
9. **Blanket List Scraping on Employees**: Unauthenticated user or supervisor calls `list` on `/employees` -> `PERMISSION_DENIED`.
10. **Blanket List Scraping on Admins (PII Leak)**: Non-super-admin calls `list` on `/admins` without matching `email` filter -> `PERMISSION_DENIED`.
11. **Timestamp Forgery**: Admin submits `createdAt: Timestamp(2020-01-01)` or alters `createdAt` during an `update` -> `PERMISSION_DENIED`.
12. **Audit Log Attribution Spoofing**: Sub-admin creates `/xscore_logs/log_1` with `recordedByUid: "another_uid"` -> `PERMISSION_DENIED`.
