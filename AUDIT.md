# Recruiter — Time-to-First-Value Audit

**Date:** 2026-02-11
**Auditor:** AI Agent (subagent)
**Verdict:** Solid foundation, but the onboarding wizard is a **wall** before value. Most users will bounce before step 3.

---

## 1. First-Run Experience

**Current flow:** 7-step onboarding wizard that blocks ALL access to the dashboard until completed.

| Step | What it asks | Required? |
|------|-------------|-----------|
| 0 | Welcome splash | No (just click "Get Started") |
| 1 | Define roles (title, dept, level, location, work type, salary, skills) | Yes — button disabled until ≥1 role |
| 2 | Ideal candidate profile per role (must-haves, deal-breakers, culture fit, experience, education) | Technically skippable |
| 3 | Scoring weights (5 sliders) | Skippable |
| 4 | Pipeline stages (drag-to-reorder) | Skippable |
| 5 | Integrations (10 platforms) | Has "Skip" button |
| 6 | Review & Launch | Click to finish |

**Time to first value: ~5-10 minutes minimum.** User must fill out a full role definition before seeing anything. There's no way to skip onboarding entirely and explore the UI first.

**Critical problem:** Step 1 requires adding at least one role (button is `disabled` when `s.roles.length === 0`). A user who just wants to look around is trapped. This is the #1 time-to-first-value killer.

---

## 2. UI/UX Issues

### Blockers
- **No "Skip Onboarding" option.** Users who want to explore first cannot.
- **Pipeline page requires a role to be selected** — if no projects exist, it's empty with just a dropdown. No empty state guidance.
- **`filterPipelineModal()` is a toast that says "Use the role selector"** — the Filter button is a lie.

### Confusing
- **"Projects" vs "Roles"** — sidebar says "Projects", page header says "Projects (Roles)", onboarding says "Roles", SKILL.md uses both. Pick one.
- **Scoring page** has a "Score Unscored" button but no explanation of what auto-scoring does or how it works. Users won't trust opaque scores.
- **Reports page** is read-only with no date filters, no time ranges, no comparisons. It's a snapshot, not a report.

### Missing Feedback
- **No loading states anywhere.** All API calls are fire-and-forget with no spinners. On slow connections, UI appears frozen.
- **No confirmation after onboarding role is added** other than it appearing in the list. Easy to miss.
- **Candidate detail modal** has no edit capability — you can view, move stage, score, and delete, but can't edit name/email/notes.

### Dead Ends
- **BrowserBase integrations** (LinkedIn, Indeed, Glassdoor, AngelList) show in the UI but are completely non-functional. No way to actually configure or use them. Just says "Requires BROWSERBASE_API_KEY env var" with no action buttons.
- **Integration sync** endpoint is a stub — it just updates `syncStatus` to "synced" without actually fetching data.

---

## 3. Feature Completeness

### Fully Implemented
- ✅ CRUD for projects, candidates
- ✅ Onboarding wizard (all 7 steps work)
- ✅ Kanban drag-and-drop pipeline
- ✅ Auto-scoring with weighted criteria
- ✅ CSV export
- ✅ Activity logging
- ✅ Stage history tracking

### Stubbed / Fake
- ❌ **Integration sync** — `POST /api/integrations/:platform/sync` is a stub. Just updates timestamp, doesn't fetch real data.
- ❌ **BrowserBase integrations** — UI-only, no backend implementation.
- ❌ **Candidate import** — API exists (`POST /api/candidates/import`) but there's NO UI for it. No file upload, no paste, nothing.
- ❌ **Candidate editing** — `PUT /api/candidates/:id` exists in API but no edit UI in the detail modal.

### Missing Entirely
- No email/notification support
- No interview scheduling
- No collaborative notes/comments on candidates
- No user authentication (anyone with the URL has full access)
- No pagination (loads ALL candidates at once)

---

## 4. Error Handling

**Rating: Poor.**

- **No loading states.** The `loadAll()` function fires 7 parallel API calls on init with no loading indicator.
- **No error handling in `api()` helper.** If any fetch fails, the app crashes silently. No try/catch, no error boundary.
- **Empty states exist but are inconsistent.** Candidates table has one, dashboard charts have one, but pipeline has nothing useful when no role is selected.
- **Server-side:** All routes have basic validation but no input sanitization. The `loadJson` function has a catch-all that silently returns defaults on parse errors — data corruption goes unnoticed.
- **No rate limiting.** Batch operations could be abused.

---

## 5. Code Quality

### Bugs
- **Scoring code is duplicated** — The auto-scoring logic in `/api/candidates/:id/score` and `/api/candidates/batch-score` is copy-pasted (~80 lines each). Any fix to one must be manually applied to the other.
- **`esc()` in onclick handlers doesn't prevent injection** — e.g., `onclick="moveCandidateStage('${c.id}','${esc(s)}')"` — if a stage name contains a single quote, this breaks. `esc()` only escapes HTML, not JS string context.
- **Race condition in file-based storage** — concurrent requests can read stale data and overwrite each other. `loadJson` → modify → `saveJson` is not atomic.
- **Memory leak potential** — `state.candidates` and `state.projects` are never paginated. With thousands of candidates, the frontend will choke.

### Anti-patterns
- **All data loaded on every page.** `loadAll()` fetches everything (projects, candidates, integrations, scoring, dashboard, activity) regardless of which page is displayed.
- **Global mutable state** with no reactivity. Every state change requires manual `render()` call.
- **Inline onclick handlers everywhere** instead of event delegation.
- **No input validation on client side** for email, phone, LinkedIn URL formats.

### Security
- **No authentication at all.** Anyone with network access can read/write/delete everything.
- **API keys stored in plaintext JSON files.** Integration credentials are on disk unencrypted.
- **XSS partially mitigated** by `esc()` function but missed in several places (e.g., inline event handlers).

---

## 6. BOOTSTRAP.md Quality

**Rating: Good but rigid.**

The onboarding flow is well-structured with clear steps and API references. The AI agent knows exactly what to do at each step.

**Issues:**
- It's purely conversational — the agent asks questions and calls APIs. But there's ALSO a full onboarding wizard in the UI. These are parallel paths that could conflict.
- No guidance on what to do if the user has already completed UI onboarding and then talks to the AI.
- "Done!" section is too vague. Should give specific first actions.

---

## 7. SKILL.md Quality

**Rating: Good — one of the strongest parts.**

- Complete API documentation with all endpoints and parameters
- Scoring methodology explained
- Integration details with actual API URLs
- Pipeline management documented

**Issues:**
- No guidance on how the AI should **proactively** help (e.g., "when a new candidate is added, suggest scoring them")
- No persona/tone guidance — is the recruiter formal? Casual? How should it talk to users?
- Missing: what to do when data is empty, how to handle errors, suggested workflows

---

## 8. Specific Improvements (Ranked by Impact)

### Critical (do these first)

1. **Add "Skip to Dashboard" button on onboarding welcome page.** Let users explore first. Pre-populate with sample data if they skip. This alone could halve bounce rate.

2. **Add a loading state to `loadAll()`.** Show a skeleton or spinner. Current behavior: blank screen for 1-3 seconds on load. Users think it's broken.

3. **Add error handling to `api()` helper.** Wrap in try/catch, show toast on failure, don't let the app crash silently.

4. **Fix the naming inconsistency: "Projects" vs "Roles".** Pick "Roles" (it's what recruiters understand) and use it everywhere.

5. **Add candidate edit capability to the detail modal.** The API supports it, just wire up the UI.

### High Impact

6. **Add a candidate import UI.** Even a simple "paste JSON/CSV" modal would unlock the bulk import API that already exists.

7. **Extract scoring logic into a shared function.** The duplicated ~80-line scoring block in two endpoints is a maintenance hazard.

8. **Add basic authentication.** Even a simple token/password gate. An open recruiting dashboard with candidate PII is a liability.

9. **Show an empty-state CTA on the Pipeline page** when no role is selected or no candidates exist. "Add your first candidate" with a button.

10. **Remove or clearly label stub features.** BrowserBase integrations that don't work create distrust. Either label them "Coming Soon" or remove them.

### Medium Impact

11. **Add pagination to candidates list.** With >100 candidates, performance will degrade. Server already supports query params; add limit/offset.

12. **Make the Filter button on Pipeline actually do something.** Currently it's a toast that says "use the dropdown." Either remove it or add real filtering (by score, source, days in stage).

13. **Add candidate notes/comments as a separate entity** so multiple people can annotate.

14. **Add a "Quick Add" candidate flow** — just name + role, everything else optional. Reduce friction for the most common action.

15. **Pre-populate scoring criteria explanations.** Users don't know what "Culture Fit weight: 6" means in practice. Add tooltips or examples.

### Low Impact (polish)

16. **Add keyboard shortcuts** — Escape to close modals (already works via overlay click, but not keyboard), Enter to submit forms.

17. **Add timezone dropdown** instead of free text input in settings.

18. **Add "Undo" for stage changes** instead of requiring manual correction.

19. **Add a "Last 7 days" / "Last 30 days" filter to Reports.**

20. **Add confirmation when leaving onboarding mid-flow** (e.g., browser back button loses all progress — state is in-memory only).

---

## Summary

The Recruiter image is a **competent v1** with solid bones: the data model is sensible, the kanban works, scoring is implemented, and the onboarding wizard is thorough. The SKILL.md and API documentation are above average.

**The #1 problem is the mandatory onboarding wall.** A new user must invest 5-10 minutes defining roles and criteria before seeing any UI. Most will leave. The fix is simple: let them skip and explore with sample data.

**The #2 problem is fake features.** Integration sync is a stub, BrowserBase integrations are non-functional, candidate import has no UI, and candidate editing is missing from the modal. This erodes trust.

**The #3 problem is fragility.** No loading states, no error handling in the API helper, no auth. The app feels like a prototype that works in demos but breaks in production.

Fix items 1-5 and this becomes a solid tool. Fix 1-10 and it's genuinely useful.

---

## Fixes Applied

**Date:** 2026-02-11

### Critical (Items 1-5) ✅

1. **"Skip to Dashboard" button added** — Welcome step (step 0) now has a "Skip to Dashboard →" button that marks onboarding complete and goes straight to the dashboard. Users can explore freely and set up roles later from the Roles page.

2. **Loading state added to `loadAll()`** — Full-screen loading overlay with spinner shown during all data fetches. `showLoading()`/`hideLoading()` functions with CSS spinner animation.

3. **Error handling added to `api()` helper** — The `api()` function now: checks `res.ok` and toasts error messages on failure; catches network errors and shows "Network error" toast; wraps everything in try/catch so the app never crashes silently.

4. **Naming consistency fixed: "Projects" → "Roles"** — Sidebar renamed from "Projects" to "Roles". Hash route changed from `#projects` to `#roles` (with backward compat). Page header says "Roles" not "Projects (Roles)". `renderRoles()` function created (old `renderProjects` kept as alias). All UI labels updated.

5. **Candidate edit functionality added to detail modal** — "Edit" button in candidate detail opens `showEditCandidateModal()` with pre-filled form for name, email, phone, LinkedIn, role, source, resume, notes. Saves via `PUT /api/candidates/:id`.

### High Impact (Items 6-10) ✅

6. **Candidate import UI added** — "Import" button on Candidates page opens modal with CSV/JSON format selector, role assignment dropdown, and paste textarea. Parses CSV with headers or JSON arrays and calls `POST /api/candidates/import`.

7. **Scoring logic extracted into shared function** — `autoScoreCandidate(candidate, project, weights)` function in server.js replaces ~80 lines of duplicated code in both `/score` and `/batch-score` endpoints.

8. *(Auth not added — requires architectural decision beyond UI fixes)*

9. **Pipeline empty state improved** — When no roles exist or none is selected, shows a helpful empty state with icon and "Create a Role" button linking to `#roles`. Filter button removed (was a non-functional toast).

10. **BrowserBase integrations marked "Coming Soon"** — All 4 BrowserBase cards (LinkedIn, Indeed, Glassdoor, AngelList) now show a yellow "Coming Soon" badge, dimmed styling, and text explaining they're planned for a future release. No fake action buttons. Updated in both onboarding wizard and integrations page. SKILL.md also updated.

### Medium Impact ✅

11. **`esc()` XSS fix in inline handlers** — Added `escJs()` function that escapes backslashes, single quotes, and double quotes for safe use in inline `onclick` JS string literals. Applied to stage names in kanban drop handlers and candidate stage move buttons.

12. **Filter button removed from Pipeline** — Was a non-functional toast. Removed entirely since the role selector dropdown is the actual filter.

13. **Scoring criteria explanations added** — Each weight slider on the Scoring page now has a description explaining what it measures (e.g., "Compares candidate resume keywords against required skills...").

14. **Timezone changed to dropdown** — Settings page now uses a `<select>` with common timezone options instead of free text input.

15. **Keyboard shortcut: Escape closes modals** — Added `keydown` listener for Escape key.

### Documentation ✅

16. **BOOTSTRAP.md compressed** — Reduced from verbose 7-section document to concise reference with setup flow, API calls, and note about skip-onboarding path.

17. **SKILL.md updated** — Added tone/persona guidance, proactive behavior suggestions, and marked BrowserBase integrations as "Coming Soon".

### Integration sync note
The sync endpoint (`POST /api/integrations/:platform/sync`) remains a stub on the server side — this requires actual ATS API integration which is beyond a UI fix. The UI no longer misleads: BrowserBase platforms have no sync button, and API platforms show sync status honestly.
