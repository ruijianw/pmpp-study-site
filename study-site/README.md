# PMPP Study Site

Local study workspace for _Programming Massively Parallel Processors_.

## Dynamic Codex Mode

```bash
~/.cache/codex-runtimes/codex-primary-runtime/dependencies/python/bin/python3 ../scripts/build_study_site_data.py
npm install
npm run dev
```

Open `http://127.0.0.1:5174`.

The local development server can still generate artifacts with the local Codex agent.

The server calls the local Codex agent through `@openai/codex-sdk` and defaults to `gpt-5.5` with `xhigh` reasoning effort.

Override it when needed:

```bash
CODEX_MODEL=gpt-5.5 CODEX_REASONING_EFFORT=xhigh npm run dev
```

Generated artifacts are cached in `../output/site-data/generated/`.

## Offline NotebookLM Static Mode

Generate static JSON with NotebookLM, then build a deployable site:

```bash
python3 ../scripts/nlm_generate_static_site.py --chapters all --types all --timeout 240 --delay 2 --retries 1 --continue-on-error
npm run build
python3 -m http.server 5175 --bind 127.0.0.1 --directory dist
```

Open `http://127.0.0.1:5175`.

Static data is written to `../output/static-site-data/` and copied into `dist/data/` during `npm run build`.

Blog Post artifacts are generated with NotebookLM Studio through MCP as `report` artifacts with `report_format="Blog Post"`. Download the Studio reports as Markdown files under `../output/studio-blog-posts/<chapter-id>.md`, then convert them into static site JSON:

```bash
node ../scripts/convert_studio_blog_posts.mjs --notebook-id 0d5f1463-f72f-4085-b5a4-2da2242d4450
npm run build
```

To test a small sample first:

```bash
python3 ../scripts/nlm_generate_static_site.py --chapters 24 --types study-guide --timeout 240 --delay 0
npm run build
```

Full generation is 24 chapters × 7 artifact types. The first six artifact types can be produced with NotebookLM queries; Blog Post uses NotebookLM Studio report generation.

## GitHub Pages

This repository deploys the already-built static output in `dist/` through GitHub Actions:

```bash
npm run build
git add .
git commit -m "Build PMPP static study site"
git push origin main
```

The workflow publishes `study-site/dist` without regenerating NotebookLM content in CI.
