# Codex Study Site Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a local website that calls a local Codex agent to generate chapter-specific learning artifacts.

**Architecture:** A Python data preparation script extracts split PDF chapter text into a manifest. A dependency-light Node server serves static UI assets, exposes chapter/generation APIs, calls `@openai/codex-sdk` server-side, and caches artifacts. A static HTML/CSS/JS frontend presents a dense study workspace.

**Tech Stack:** Python 3 with bundled `pypdf`, Node.js 18+, native `node:http`, native `node:test`, vanilla HTML/CSS/JS, `@openai/codex-sdk`.

## Global Constraints

- Keep the app local-only and single-user.
- Do not expose Codex or API credentials in browser code.
- Validate all chapter IDs and artifact types on the server.
- Store generated artifacts under `output/site-data/generated/`.
- Use cached artifacts unless the request explicitly sets `force: true`.

---

### Task 1: Chapter Data Builder

**Files:**
- Create: `scripts/build_study_site_data.py`
- Create: `output/site-data/chapters/manifest.json`
- Create: `output/site-data/chapters/*.txt`

**Interfaces:**
- Produces: `manifest.json` with `{ "chapters": [{ "id", "number", "title", "pdfPath", "textPath", "pageCount", "wordCount" }] }`.
- Produces: text files referenced by `textPath`.

- [ ] Write the data builder that scans `output/pdf/chapters/*.pdf`, extracts text with `pypdf`, writes stable text files, and writes the manifest.
- [ ] Run the builder with the bundled Python runtime.
- [ ] Verify the manifest has 24 chapters and every text file exists.

### Task 2: Server Core and Tests

**Files:**
- Create: `study-site/package.json`
- Create: `study-site/server/config.js`
- Create: `study-site/server/artifactTypes.js`
- Create: `study-site/server/manifest.js`
- Create: `study-site/server/json.js`
- Create: `study-site/server/codexRunner.js`
- Create: `study-site/server/server.js`
- Create: `study-site/test/server.test.js`

**Interfaces:**
- `loadManifest(): Promise<{ chapters: Chapter[] }>`
- `getArtifactType(type: string): ArtifactType | undefined`
- `extractJsonObject(text: string): unknown`
- `generateArtifact({ chapter, artifactType, force }): Promise<object>`

- [ ] Write failing tests for manifest loading, artifact type validation, cache path safety, and JSON extraction.
- [ ] Run `npm test --prefix study-site` and confirm the missing modules fail.
- [ ] Implement server helper modules and HTTP routes.
- [ ] Run `npm test --prefix study-site` until tests pass.

### Task 3: Static Frontend

**Files:**
- Create: `study-site/public/index.html`
- Create: `study-site/public/styles.css`
- Create: `study-site/public/app.js`

**Interfaces:**
- Consumes: `GET /api/chapters`
- Consumes: `GET /api/artifact?chapterId=<id>&type=<type>`
- Consumes: `POST /api/generate` with `{ chapterId, type, force }`

- [ ] Build a three-panel study workspace: chapter list, artifact viewer, generation controls.
- [ ] Render each artifact type with purpose-built HTML instead of raw JSON where possible.
- [ ] Add loading, cached, empty, and error states.
- [ ] Keep controls keyboard-accessible and responsive.

### Task 4: Codex SDK Wiring and Verification

**Files:**
- Modify: `study-site/package.json`
- Modify: `study-site/server/codexRunner.js`
- Modify: `study-site/README.md`

**Interfaces:**
- Uses: `@openai/codex-sdk` server-side only.
- Provides: `npm run dev` for local use.

- [ ] Install `@openai/codex-sdk`.
- [ ] Confirm dynamic import succeeds.
- [ ] Run `npm test --prefix study-site`.
- [ ] Run `npm run build --prefix study-site`.
- [ ] Start `npm run dev --prefix study-site` and verify `GET /api/chapters` returns 24 chapters.

