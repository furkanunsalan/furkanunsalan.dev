---
title: "Dynamic CV / Resume"
date: 2026-06-13
status: draft
driver: The CV is a hand-maintained Word→PDF (public/resume.pdf) that drifts from the site's own data; now that all content lives in Postgres we can render it from one source and offer short + full versions.
---

## Problem Statement

The résumé at `/resume.pdf` is a static, 2-page A4 file exported from Microsoft Word (Roboto throughout). Every update is a manual round-trip through Word, and the document has already **drifted** from the site's real data — its Projects section lists builds (MultiGroup HQ, Event page, Travel Map) that no longer match the current Postgres-backed projects, and its work bullets are maintained separately from the `experiences` the site already renders.

There is also only **one** version. A recruiter skimming wants a tight one-pager; a detailed application wants the full record. Today both audiences get the same 2-page file, and there's no in-site way to read it — the link just downloads a PDF.

## Solution

Render the document from the database via `@react-pdf/renderer`, in two variants:

- **Full** — the current 2-page CV (Education, Projects, Work Experience, Volunteering, all bullets).
- **Short** — a curated 1-page résumé (trimmed entries / bullets, no Volunteering).

A `/resume` **viewer page** embeds the generated PDF behind the site chrome with a short/full toggle and one-click **Download** buttons. Because the viewer embeds the _same_ PDF the download serves, what you see is exactly what you get — one renderer, no drift between preview and file.

The visual design stays **identical** to today's document (navy underlined section headers, bold inline `Skills:`/`Certifications:`/`Languages:` labels, Roboto, the same contact block) and is fixed in the renderer regardless of data. Content that already lives in Postgres (`experiences`, `projects`) is reused as the source of truth — so the CV reflects the _current_ site data — while the CV-only sections (summary, contact, skills, certifications, languages, education, volunteering) plus the short/full curation live in a new editable `cv_settings` singleton.

## User Stories

1. As a **visitor**, I want to open `/resume` and read the CV in the browser, so that I don't have to download a file just to skim it.

   - [ ] Acceptance: `/resume` renders the full CV inside the site layout (AMOLED chrome around a white document), no separate tab required.
   - [ ] Acceptance: the embedded document is the byte-identical PDF that the download serves (same renderer/output).
   - [ ] Acceptance: page is reachable from the existing home "CV" link (which currently points at `/resume.pdf`).

2. As a **visitor**, I want to switch between a short and full version, so that I can pick the depth I need.

   - [ ] Acceptance: a short/full toggle on `/resume` swaps the embedded document.
   - [ ] Acceptance: the selected variant is reflected in the URL (e.g. `/resume?variant=short`) so it's shareable and reload-stable.
   - [ ] Acceptance: Full contains Education + Projects + Work Experience + Volunteering; Short omits Volunteering and shows the curated subset only.

3. As a **visitor**, I want to download either version as a PDF, so that I can attach it to an application.

   - [ ] Acceptance: a Download button fetches `/api/cv?variant=short|full` and the browser saves a PDF named meaningfully (e.g. `Furkan-Unsalan-CV.pdf` / `Furkan-Unsalan-Resume.pdf`).
   - [ ] Acceptance: the response is `application/pdf` with a `Content-Disposition: attachment` header.
   - [ ] Acceptance: the downloaded file is selectable text (not a rasterized image) with embedded Roboto.

4. As the **owner**, I want the CV to render in the exact current styling, so that switching to dynamic generation doesn't visibly change my résumé.

   - [ ] Acceptance: side-by-side with `public/resume.pdf`, the full variant matches typeface (Roboto), navy heading color, underlined section rules, bold inline labels, two-column contact block, bullet style, and A4 page size within a tight visual tolerance.
   - [ ] Acceptance: styling is defined once in the renderer and does not change with content edits.

5. As the **owner**, I want the document to reflect my current Postgres data, so that I maintain content in one place.

   - [ ] Acceptance: Work Experience entries are sourced from the `experiences` table; Projects from the `projects` table.
   - [ ] Acceptance: editing an experience/project (via existing admin) is reflected in the CV after cache revalidation.
   - [ ] Acceptance: the CV shows the _current_ DB projects/experiences, not the legacy Word content.

6. As the **owner**, I want to edit the CV-only content (summary, address + phone, skills, certifications, languages, education, volunteering), so that the parts not in any other table are still editable without touching code. (Email / Web / GitHub / LinkedIn are reused from `home_settings.socials`.)

   - [ ] Acceptance: an `/admin/cv` form edits these fields and persists to `cv_settings`.
   - [ ] Acceptance: saving revalidates `/resume` (and the download) so changes appear without redeploy.
   - [ ] Acceptance: the form follows the existing admin auth + `friendlyDbError` + audit patterns.

7. As the **owner**, I want to choose which experiences/projects appear and in which order per variant, so that Short stays a curated one-pager.

   - [ ] Acceptance: the CV editor lets me select + order which `experiences` and `projects` appear, and mark each as included in Short.
   - [ ] Acceptance: removing an item from the CV selection does not delete it from the site; it only hides it from the document.
   - [ ] Acceptance: an experience's `kind` (`work` | `volunteer`) decides its CV section; the `/experience` page renders unchanged regardless of `kind`.
   - [ ] Acceptance: each selected project carries a CV-owned `techStack` string rendered on its "Tech Stack:" line.

8. As the **owner**, I want the build/deploy to keep working, so that adding PDF generation doesn't break the VPS.

   - [ ] Acceptance: the `/api/cv` route runs on the Node runtime and stays within the PM2 512 MB ceiling (no headless Chromium).
   - [ ] Acceptance: `next build` succeeds with the new dependency; DB-backed routes remain `force-dynamic`.

9. As a **visitor on mobile**, I want the viewer to be usable on a small screen, so that the document is readable without desktop.
   - [ ] Acceptance: the viewer fits mobile width (the document scales/scrolls; download still works).

## Implementation Decisions

Architecture vocabulary per `refactor-hunt/LANGUAGE.md`.

- **Module: CvSettings store** — a `cv_settings` singleton (id = 1) mirroring `home_settings`, plus a reader `getCvSettings()` in `lib/content.ts` that fails soft (returns defaults on query error).

  - **Interface:** `getCvSettings(): Promise<CvSettings>` — header, contact, summary, skills[], certifications[], languages[], education[], volunteering[], and the variant **selection/ordering** of experience ids + project slugs (each tagged short/full + Work/Volunteer placement).
  - **Seam:** internal; persistence boundary only.
  - **Depth delta:** consolidates all CV-only content + curation behind one read.
  - **Dependency category:** `local-substitutable` (Postgres via Drizzle, same as every other reader).

- **Module: CV model assembler** — `buildCvModel(variant)` merges `getCvSettings()` with `getExperiences()` + `getCustomProjects()` into a flat, render-ready `CvDocumentModel` (applies selection, ordering, short/full filtering, Work/Volunteer split, and parses each experience `comment` dash-lines into bullet items).

  - **Interface:** `buildCvModel(variant: "short" | "full"): Promise<CvDocumentModel>`.
  - **Depth delta:** all "which data, in what order, trimmed how" logic lives here, so the renderer is purely presentational.
  - **Dependency category:** `in-process` (pure composition over already-fetched data).

- **Module: CV renderer (deep)** — `renderCvPdf(model)` builds the `@react-pdf/renderer` document (registered Roboto faces, the fixed StyleSheet that reproduces the Word layout) and returns a PDF buffer/stream.

  - **Interface:** `renderCvPdf(model: CvDocumentModel): Promise<Buffer>` (or a readable stream).
  - **Depth:** a large amount of layout/typography behind a tiny `model → bytes` interface; reused by both the viewer embed and the download (high **leverage**, single point of styling change).
  - **Dependency category:** `external` library, but `in-process` at runtime (no network, no Chromium). Roboto TTFs vendored into the repo and registered at module load.

- **Interface/Seam: `/api/cv` route handler** — `GET /api/cv?variant=short|full` → `renderCvPdf(buildCvModel(variant))`, streamed as `application/pdf` with `Content-Disposition: attachment; filename=...`. `runtime = "nodejs"`, `export const dynamic = "force-dynamic"`.

- **Module: `/resume` viewer page** — embeds `/api/cv?variant=…` (via `<object>`/`<iframe>` or PDF.js) inside the site chrome, with a URL-driven short/full toggle and Download buttons. Replaces the bare `/resume.pdf` link target.

- **Module: `/admin/cv` editor + PATCH route** — a form (built on `components/admin/form.tsx` primitives) editing `cv_settings`; the route mirrors `app/api/admin/settings/home/route.ts` (validate → `onConflictDoUpdate` on id=1 → `revalidateCollection("cv")` → `recordAudit`).

- **Schema changes:**

  - New table `cv_settings` (id integer PK, jsonb columns for the sections above, `updated_at`). Drizzle migration via `db:generate` → `db:migrate`.
  - Add `experiences.kind` — enum `work | volunteer`, default `work` — used **only** by the CV to route a role into Work Experience vs Volunteering. The `/experience` page ignores it entirely (no display change).
  - `projects` columns unchanged. The CV's per-project **Tech Stack** line is CV-owned data carried on the project-selection entry inside `cv_settings` (reuse name / url / description from `projects`, layer `techStack` on top).
  - Selection / ordering / short-flag all live in `cv_settings`, never as columns on `projects`.

- **Integration boundaries:** the renderer never reads the DB; it consumes `CvDocumentModel`. The assembler is the only place that knows about both `cv_settings` and the reused tables. Revalidation map extended: `cv: ["/resume"]` (and `experiences`/`projects` edits should also revalidate `/resume`).

- **Decision-encoding shape** (the variant model the renderer consumes — not implementation):

  ```ts
  type CvDocumentModel = {
    variant: "short" | "full";
    header: { name: string; role: string };
    contact: { address; phone; email; github; web; linkedin };
    summary: string;
    skills: string[];
    certifications: { name: string; date: string }[];
    languages: { name: string; level: string }[];
    education: { degree; school; location; gpa; dates; bullets: string[] }[];
    projects: { name; url; description; techStack: string }[];
    work: { org; role; dates; bullets: string[] }[];
    volunteering: { org; role; dates; bullets: string[] }[]; // [] when short
  };
  ```

## Testing Decisions

- **CV model assembler** gets the most tests — it's pure and behavior-rich: short vs full filtering, ordering, Work/Volunteer split, `comment`→bullets parsing, and graceful handling of missing/empty `cv_settings`. Test at the `buildCvModel(variant)` interface with fixture experiences/projects + a fixture settings object; survives renderer refactors.
- **Renderer**: not unit-tested for pixels (brittle). Validate via a one-time visual diff against `public/resume.pdf` during build-out; afterward a smoke test that `renderCvPdf(model)` returns a non-empty PDF buffer with the expected page count per variant.
- **`/api/cv` route**: assert content-type, disposition header, and that an unknown `variant` falls back to a default rather than erroring.
- **Adapters:** DB is `local-substitutable`; reuse whatever DB test harness the repo already uses (or fixture objects passed straight into `buildCvModel`, bypassing the DB for the pure path).
- **Prior art:** `getHomeSettings` + the home PATCH route for the singleton read/write pattern.

## Risks & Assumptions

- **Risks**

  - **Fidelity**: `@react-pdf/renderer` uses a flexbox subset, not full CSS — the recreation will be _visually indistinguishable_ but not byte-identical to Word's output. Section underlines, exact line spacing, and Roboto metrics must be hand-tuned. Mitigation: keep serving `public/resume.pdf` until the dynamic full variant is signed off side-by-side.
  - **Page breaks**: react-pdf auto-paginates; keeping Short to exactly one page and Full to the current two requires `wrap`/`break` control and may need content trimming. Risk of a stray third page if data grows.
  - **Nested bullets**: the Volunteering section has sub-bullets (Organized Events → per-event lines). Flat `comment` parsing loses that nesting — fidelity gap if volunteering is reused from `experiences`.
  - **Bundle/runtime weight**: react-pdf + embedded fonts add to the server bundle; must confirm it renders within the 512 MB PM2 process under load (it's pure JS, so expected fine, but unverified).

- **Assumptions**

  - Roboto (free Google font) matches the document's typeface 1:1 (confirmed from embedded fonts; Times/Calibri/Arial/Symbol in the Word file are incidental).
  - The current experiences' `comment` fields are dash-prefixed bullet lists (observed on the experience page) and parse cleanly into bullets.
  - The owner accepts that the dynamic CV reflects current DB content, replacing the legacy Word Projects.

- **Unknowns**
  - _(resolved 2026-06-13)_ Tech Stack → CV-owned `techStack` on each project-selection entry in `cv_settings`. Work/Volunteer split → new `experiences.kind` (CV-only). CV bullets → reuse `experiences.comment` as-is, no overrides. Contact → reuse `home_settings.socials` (email/web/github/linkedin), with address + phone CV-owned.
  - Whether `home_settings.socials` actually carries clean email/web/github/linkedin values in the shape the contact block needs, or some need a CV-owned fallback.

## Out of Scope

**Deferred**

- Editing/altering the visual _design_ of the document (themes, colors, alternate templates).
- Multiple language editions of the CV (e.g. Turkish CV).
- Cover-letter generation, per-application tailoring, or analytics on downloads.
- A third "tailored/role-specific" variant beyond short/full.
- Rich nested-bullet authoring UI for volunteering (flat bullets for v1 unless fidelity demands otherwise).

**Rejected approaches**

- **Server-side Puppeteer/headless Chromium HTML→PDF** — rejected: pixel-perfect but ~280 MB + memory-hungry, breaks the 512 MB PM2 ceiling on the VPS.
- **Browser `window.print()` from a styled HTML page** — rejected: browser print headers/footers and dialog friction; not a clean one-click downloadable file.
- **Two separate renderers (HTML viewer + PDF download)** — rejected: guarantees eventual visual drift; instead the viewer embeds the single generated PDF.
- **Satori / `next/og`** (already in the stack) — rejected: produces images, not multi-page selectable-text A4 PDFs.
- **Adding CV inclusion / short / order flags onto `experiences`/`projects`** — rejected: curation lives in `cv_settings` to avoid coupling site tables to CV presentation. (Exception: a single `experiences.kind` categorization column is added — a property of the role itself, used only by the CV split, not a presentation flag.)

## Slicing Hints

- The **renderer + a hardcoded full model** should land first as a fidelity spike — it's the gating risk; everything else is wasted if the look can't match.
- `cv_settings` schema + reader + `/admin/cv` editor can proceed in parallel with the renderer (independent seams).
- `buildCvModel` depends on both the renderer's model shape and the settings reader — sequence it after both interfaces are fixed.
- The `/resume` viewer + `/api/cv` route are thin and land last, once renderer + assembler exist.
- Resolve the four Unknowns (tech-stack source, work/volunteer split, bullet overrides, contact reuse) before the assembler task — they change its inputs.

## Related

- Current artifact: `public/resume.pdf` (Word export, replaced by this feature)
- Singleton prior art: `home_settings` (`lib/content.ts` `getHomeSettings`, `app/api/admin/settings/home/route.ts`)
- Project conventions: [CLAUDE.md](../../../CLAUDE.md), [CODEMAP.md](../../../CODEMAP.md)

## Open Questions

- Should the CV download filename / route live under `/api/cv` or `/resume.pdf` (preserving the existing public URL by rewriting it to the dynamic route)? Preserving `/resume.pdf` keeps inbound links working.
- Do we keep `public/resume.pdf` as a fallback after launch, or delete it once parity is confirmed?
- Is one page a hard cap for Short, or "aim for one"?
