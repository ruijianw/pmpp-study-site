import assert from "node:assert/strict";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { test } from "node:test";

import { artifactTypes } from "../server/artifactTypes.js";
import { copyDirectory } from "../server/buildStatic.js";
import {
  buildStaticManifest,
  staticArtifactPath,
  staticArtifactRelativePath,
} from "../server/staticData.js";

test("builds a static manifest with all chapters and artifact metadata", async () => {
  const generatedAt = "2026-07-13T00:00:00.000Z";
  const manifest = buildStaticManifest({
    chapterManifest: {
      chapters: [
        {
          id: "chapter-01-introduction",
          number: 1,
          title: "Introduction",
          pdfPath: "output/pdf/chapters/chapter-01-introduction.pdf",
          textPath: "output/site-data/chapters/chapter-01-introduction.txt",
          pageCount: 18,
          wordCount: 9351,
        },
      ],
    },
    generatedAt,
    notebook: "pmpp",
    sourceMap: {
      "chapter-01-introduction": {
        sourceId: "source-1",
        sourceTitle: "chapter-01-introduction.pdf",
      },
    },
    artifacts: {
      "chapter-01-introduction": {
        "study-guide": "artifacts/chapter-01-introduction/study-guide.json",
      },
    },
  });

  assert.equal(manifest.mode, "static");
  assert.equal(manifest.generator.tool, "nlm");
  assert.equal(manifest.generatedAt, generatedAt);
  assert.equal(manifest.notebook, "pmpp");
  assert.deepEqual(
    manifest.artifactTypes.map((type) => type.id),
    artifactTypes.map((type) => type.id),
  );
  assert.equal(manifest.chapters[0].sourceId, "source-1");
  assert.equal(
    manifest.chapters[0].artifacts["study-guide"],
    "artifacts/chapter-01-introduction/study-guide.json",
  );
});

test("keeps static artifact paths under the static data directory", () => {
  assert.equal(
    staticArtifactRelativePath("chapter-01-introduction", "quiz"),
    "artifacts/chapter-01-introduction/quiz.json",
  );
  assert.equal(
    staticArtifactRelativePath("chapter-01-introduction", "blog-post"),
    "artifacts/chapter-01-introduction/blog-post.json",
  );
  assert.match(
    staticArtifactPath("chapter-01-introduction", "quiz"),
    /output\/static-site-data\/artifacts\/chapter-01-introduction\/quiz\.json$/,
  );
  assert.throws(() => staticArtifactPath("../escape", "quiz"), /Invalid chapter id/);
  assert.throws(() => staticArtifactPath("chapter-01-introduction", "../quiz"), /Invalid artifact type/);
});

test("copies a directory tree for static builds", async () => {
  const tmp = await fs.mkdtemp(path.join(os.tmpdir(), "pmpp-static-build-"));
  const source = path.join(tmp, "source");
  const target = path.join(tmp, "target");
  await fs.mkdir(path.join(source, "nested"), { recursive: true });
  await fs.writeFile(path.join(source, "index.html"), "<main></main>", "utf-8");
  await fs.writeFile(path.join(source, "nested", "manifest.json"), "{}", "utf-8");

  await copyDirectory(source, target);

  assert.equal(await fs.readFile(path.join(target, "index.html"), "utf-8"), "<main></main>");
  assert.equal(await fs.readFile(path.join(target, "nested", "manifest.json"), "utf-8"), "{}");
});
