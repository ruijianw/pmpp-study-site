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

To test a small sample first:

```bash
python3 ../scripts/nlm_generate_static_site.py --chapters 24 --types study-guide --timeout 240 --delay 0
npm run build
```

Full generation is 24 chapters × 6 artifact types = 144 NotebookLM queries.

## GitHub Pages

This repository deploys the already-built static output in `dist/` through GitHub Actions:

```bash
npm run build
git add .
git commit -m "Build PMPP static study site"
git push origin main
```

The workflow publishes `study-site/dist` without regenerating NotebookLM content in CI.
