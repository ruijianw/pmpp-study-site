import assert from "node:assert/strict";
import { test } from "node:test";

import {
  CODEX_MODEL,
  CODEX_REASONING_EFFORT,
  artifactCachePath,
  resolveRepoPath,
} from "../server/config.js";
import { artifactTypes, getArtifactType } from "../server/artifactTypes.js";
import { extractJsonObject } from "../server/json.js";
import { loadManifest } from "../server/manifest.js";

test("loads the generated chapter manifest", async () => {
  const manifest = await loadManifest();

  assert.equal(manifest.chapters.length, 24);
  assert.equal(manifest.chapters[0].id, "chapter-01-introduction");
  assert.equal(manifest.chapters[0].number, 1);
  assert.match(manifest.chapters[0].textPath, /^output\/site-data\/chapters\//);
});

test("validates supported artifact types", () => {
  assert.equal(getArtifactType("quiz").id, "quiz");
  assert.equal(getArtifactType("unknown"), undefined);
  assert.deepEqual(
    artifactTypes.map((type) => type.id),
    ["study-guide", "briefing", "data-table", "flashcards", "quiz", "slide-deck"],
  );
});

test("defaults Codex agent to gpt-5.5 extra-high reasoning", () => {
  assert.equal(CODEX_MODEL, "gpt-5.5");
  assert.equal(CODEX_REASONING_EFFORT, "xhigh");
});

test("extracts a JSON object from wrapped Codex output", () => {
  const value = extractJsonObject('Here is the result:\n```json\n{"title":"Intro","items":[1,2]}\n```');

  assert.deepEqual(value, { title: "Intro", items: [1, 2] });
});

test("keeps repository paths and cache paths inside expected roots", () => {
  assert.match(resolveRepoPath("output/site-data/chapters/manifest.json"), /manifest\.json$/);
  assert.throws(() => resolveRepoPath("../outside.txt"), /outside repository/);
  assert.match(
    artifactCachePath("chapter-01-introduction", "quiz"),
    /output\/site-data\/generated\/chapter-01-introduction\/quiz\.json$/,
  );
  assert.throws(() => artifactCachePath("../escape", "quiz"), /Invalid chapter id/);
  assert.throws(() => artifactCachePath("chapter-01-introduction", "../quiz"), /Invalid artifact type/);
});
