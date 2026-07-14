# Codex Study Site Design

## Goal

Build a local study website for _Programming Massively Parallel Processors_ that lets the reader select a chapter and ask a local Codex agent to generate focused learning artifacts.

## Scope

The first version is a single-user local app. It reads the already split chapter PDFs under `output/pdf/chapters/`, extracts chapter text into `output/site-data/chapters/`, serves a browser UI, and calls the local Codex agent through the server-side Codex SDK. It does not support login, cloud hosting, collaborative notebooks, or direct browser access to Codex.

## Architecture

The app has three parts:

- `scripts/build_study_site_data.py` builds `manifest.json` and one text file per chapter from the split PDFs.
- `study-site/server/` exposes local HTTP APIs, validates chapter/artifact requests, calls `@openai/codex-sdk`, parses JSON responses, and caches generated artifacts under `output/site-data/generated/`.
- `study-site/public/` is a static frontend served by the Node server. It renders chapter navigation, generation controls, cached artifacts, and status/error states.

## Artifact Types

The app supports six artifact types:

- `study-guide`: overview, learning objectives, key concepts, pitfalls, practice plan.
- `briefing`: executive-style summary, important claims, implications, prerequisite links.
- `data-table`: structured concepts, definitions, performance considerations, CUDA relevance.
- `flashcards`: front/back cards for definitions, formulas, and common mistakes.
- `quiz`: multiple-choice and short-answer questions with answers and explanations.
- `slide-deck`: presentation outline with slide titles, bullets, speaker notes, and visual suggestions.

## Data Flow

1. The user starts the local server.
2. The frontend loads `GET /api/chapters`.
3. The user selects a chapter and artifact type.
4. The frontend calls `POST /api/generate`.
5. The server returns a cached artifact if present.
6. If no cache exists, the server starts a Codex SDK thread and prompts Codex to read the chapter text file and return strict JSON.
7. The server validates and stores the JSON artifact, then returns it to the frontend.

## Error Handling

The server rejects unknown chapter IDs and artifact types. If the Codex SDK package is missing or Codex fails, the API returns a readable JSON error. If Codex returns non-JSON text, the server attempts to extract the first JSON object; if parsing still fails, it saves a diagnostic error and returns failure without corrupting the cache.

## Testing

Use Node's built-in test runner for server helper modules and Python's standard library plus the bundled PDF dependencies for the data builder. Verify the app with:

- `npm test --prefix study-site`
- `npm run build --prefix study-site`
- `npm run dev --prefix study-site`

