---
title: "Tasks: Dynamic CV / Resume"
date: 2026-06-13
source_prd: prd.md
status: active
---

## 1. [x] react-pdf renderer + fidelity spike (full CV)

**Stories:** 4, 3
**Mode:** HITL — requires the owner's side-by-side visual sign-off against `public/resume.pdf`

### What to build

Add `@react-pdf/renderer`, vendor the Roboto TTF faces (Regular / Bold / Italic / BoldItalic) into the repo and register them, and build the deep renderer `renderCvPdf(model: CvDocumentModel): Promise<Buffer>` whose fixed StyleSheet reproduces the current Word document exactly — navy (`~#1F3864`) bold name + role, two-column contact block, summary, bold inline `Skills:` / `Certifications:` / `Languages:` labels with italic parentheticals, navy underlined section headers, bullet lists, A4 page size and margins. Drive it from a **hardcoded `CvDocumentModel`** that mirrors the current full CV content, and expose a way to view the output (a temporary dev route or generated file) so it can be compared against `public/resume.pdf`. The hardcoded model is replaced by `buildCvModel` in task 4; the renderer and the `CvDocumentModel` type shape are the lasting output.

### Acceptance criteria

- [ ] `renderCvPdf(model)` returns a non-empty PDF with selectable text and embedded Roboto.
- [ ] Output matches `public/resume.pdf` on typeface, navy heading color, underlined section rules, bold inline labels, two-column contact block, bullet style, and A4 size within a tight visual tolerance (owner sign-off).
- [ ] The `CvDocumentModel` type is exported and matches the shape in the PRD (header, contact, summary, skills, certifications, languages, education, projects[+techStack], work, volunteering).
- [ ] Styling lives only in the renderer; changing model data never changes the design.
- [ ] `next build` succeeds with the new dependency.

## 2. [x] cv_settings singleton: schema, reader, and initial content

**Stories:** 6, 7
**Mode:** AFK

### What to build

Add a `cv_settings` table (single row, `id` PK = 1) modelled on `home_settings`: jsonb columns for summary, contact (address + phone only — the rest is reused from home), skills[], certifications[], languages[], education[], volunteering[], plus the variant **selection** — ordered lists of experience ids and project slugs, each tagged with short/full membership, and a CV-owned `techStack` string per selected project. Generate + apply the Drizzle migration. Add `getCvSettings()` to `lib/content.ts` returning safe defaults on query failure. Seed the row with the current CV content (transcribe from `public/resume.pdf`: summary, address/phone, the Skills/Certifications/Languages lists, Education, Volunteering, and the project/experience selection + techStacks).

### Acceptance criteria

- [ ] Migration creates `cv_settings`; `npm run db:migrate` applies cleanly against the tunneled DB.
- [ ] `getCvSettings()` returns the seeded content, and returns defaults (not a throw) when the row is missing or the query fails.
- [ ] Seeded content reflects the current `resume.pdf` text for the CV-only sections.

## 3. [x] experiences.kind for the CV Work/Volunteer split

**Stories:** 5, 7
**Mode:** AFK

### What to build

Add a `kind` enum column (`work | volunteer`, default `work`) to the `experiences` table + migration, surface it in `getExperiences()`, and backfill existing rows (volunteer = Developer MultiGroup, GDG on Campus Haliç; everything else work). The `/experience` page must read identically — it ignores `kind` entirely; the column exists only so the CV can route a role into Work Experience vs Volunteering.

### Acceptance criteria

- [ ] `experiences.kind` exists with default `work`; migration applies cleanly.
- [ ] `getExperiences()` includes `kind`.
- [ ] `/experience` renders byte-for-byte the same as before (no display dependence on `kind`).
- [ ] Existing rows are backfilled with correct work/volunteer values.

## 4. [x] buildCvModel assembler (short + full)

**Stories:** 2, 5, 7
**Mode:** AFK

### What to build

Implement `buildCvModel(variant: "short" | "full"): Promise<CvDocumentModel>` — the only place that knows both `cv_settings` and the reused tables. It merges `getCvSettings()` with `getExperiences()` + `getCustomProjects()`: applies the selection + ordering, filters by short/full membership, splits experiences into Work vs Volunteering by `kind`, parses each experience's `comment` dash-lines into bullet items, layers the per-project `techStack`, and assembles the contact block from `home_settings.socials` (email/web/github/linkedin) plus CV-owned address/phone. Renderer stays presentational — it never touches the DB.

### Acceptance criteria

- [ ] `full` produces Education + Projects + Work + Volunteering; `short` omits Volunteering and includes only short-tagged entries/bullets.
- [ ] Experience `comment` dash-lines become bullet items; ordering follows `cv_settings`.
- [ ] Work vs Volunteering partition is driven by `experiences.kind`.
- [ ] Contact merges home socials + CV address/phone; missing socials fall back gracefully.
- [ ] Unit tests cover short/full filtering, ordering, the work/volunteer split, and comment→bullets parsing (pure, via fixtures).

## 5. [x] /api/cv download route

**Stories:** 3
**Mode:** AFK

### What to build

`GET /api/cv?variant=short|full` → `renderCvPdf(buildCvModel(variant))`, streamed as `application/pdf` with `Content-Disposition: attachment` and a meaningful filename (`Furkan-Unsalan-CV.pdf` for full, `Furkan-Unsalan-Resume.pdf` for short). `runtime = "nodejs"`, `export const dynamic = "force-dynamic"`. Unknown/absent `variant` falls back to `full`.

### Acceptance criteria

- [ ] Both variants return a valid downloadable PDF with the correct content-type + disposition + filename.
- [ ] Full is the current 2-page document; Short aims for one page.
- [ ] Unknown variant returns full rather than erroring.
- [ ] Runs within the Node runtime / 512 MB PM2 ceiling (no Chromium).

## 6. [x] /resume viewer page + link preservation

**Stories:** 1, 2, 9
**Mode:** AFK

### What to build

A `/resume` page inside the site chrome that embeds `/api/cv?variant=…` (object/iframe or PDF.js) on a white document against the AMOLED background, with a short/full toggle reflected in the URL (`/resume?variant=short`) and Download buttons for each variant. Repoint the home "CV" link from `/resume.pdf` to `/resume`, and add a rewrite so the legacy `/resume.pdf` URL serves `/api/cv?variant=full` (preserve inbound links). Usable on mobile (document scales/scrolls; download works).

### Acceptance criteria

- [ ] `/resume` shows the embedded PDF; it is the same artifact the download serves.
- [ ] Toggle swaps the variant and updates the URL (reload-stable, shareable).
- [ ] Download buttons fetch the correct variant; legacy `/resume.pdf` still resolves (to full).
- [ ] Readable/usable at mobile width.

## 7. [x] /admin/cv editor + revalidation wiring

**Stories:** 6, 7
**Mode:** AFK

### What to build

An `/admin/cv` form built on `components/admin/form.tsx` primitives that edits `cv_settings` (summary, address/phone, skills, certifications, languages, education, volunteering, the experience selection + ordering, and the project selection + `techStack` + short flags). PATCH route mirrors `app/api/admin/settings/home/route.ts` (validate → `onConflictDoUpdate` on id=1 → `revalidateCollection("cv")` → `recordAudit`), wrapped in `friendlyDbError`, gated by the existing admin auth. Extend `lib/revalidate.ts`: add `cv: ["/resume"]`, and add `/resume` to the `experiences` and `projects` revalidate paths so site-content edits refresh the CV. Add `/admin/cv` to the admin nav.

### Acceptance criteria

- [ ] `/admin/cv` loads current `cv_settings` and saves changes; gated by admin auth.
- [ ] Saving revalidates `/resume` so the viewer + download reflect edits without redeploy.
- [ ] Editing an experience or project also revalidates `/resume`.
- [ ] Errors surface via `friendlyDbError`; the save is audit-logged.
- [ ] Removing an item from the CV selection hides it from the document without deleting site content.
