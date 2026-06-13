---
title: "Progress: Dynamic CV / Resume"
date: 2026-06-13
source_tasks: tasks.md
---

## Log

- 2026-06-13 — Built all 7 tasks toward goal "finish the full do work". Pipeline type-checks (`tsc --noEmit` clean); react-pdf renderer smoke-tested (valid `%PDF-` output with vendored Roboto + Turkish glyphs).

## What landed

- **Task 1** — `@react-pdf/renderer` added; Roboto woff faces vendored in `public/fonts/`; `lib/cv/render.tsx` (`renderCvPdf`) reproduces the Word layout; `CvDocumentModel` type in `types/index.ts`.
- **Task 2** — `cv_settings` singleton in `db/schema.ts` (migration `0006`, applied); `getCvSettings()` in `lib/content.ts`; seeded with current CV content.
- **Task 3** — `experiences.kind` enum (migration `0006`, applied); surfaced via `getExperiences()` (+ `slug`); 6 rows backfilled to `volunteer` (devmultigroup-_, gdg-halic-_); `/experience` untouched.
- **Task 4** — `lib/cv/build.ts` (`buildCvModel`): selection/filter/kind-split/comment→bullets/contact-merge.
- **Task 5** — `app/api/cv/route.ts` (nodejs, force-dynamic; inline by default, `?download` → attachment).
- **Task 6** — `app/(pages)/resume/page.tsx` viewer (toggle + download); home "CV" link repointed to `/resume` (DB social + `DEFAULT_HOME`).
- **Task 7** — `app/admin/cv/` editor (`page.tsx` + `CvForm.tsx`); `app/api/admin/cv/route.ts` PATCH; `lib/revalidate.ts` extended (`cv`, `/resume` on experiences/projects); `/admin/cv` in admin nav.

## Deviations / follow-ups for the owner

- **Fidelity sign-off pending (Task 1 HITL):** the renderer produces a valid PDF but the visual match to `public/resume.pdf` needs the owner's eyeball on `/resume`. Tune `lib/cv/render.tsx` (sizes/spacing/navy) if off.
- **`/resume.pdf` rewrite deferred (Task 6):** left the static `public/resume.pdf` resolving rather than shadowing it with the not-yet-signed-off dynamic PDF (and losing the static fallback on render error). Once fidelity is confirmed, add a `beforeFiles` rewrite `/resume.pdf → /api/cv?variant=full` and/or delete the static file.
- **Assembler unit tests deferred (Task 4):** repo has no test harness (no vitest/jest). Verified via typecheck + manual reasoning instead. Standing one up is a separate decision.
- **Not committed:** all changes are uncommitted (do-work makes no commits). Includes `package.json`/lock (`@react-pdf/renderer`) and the vendored fonts.
