#!/usr/bin/env node
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { markdownReportToArtifactContent } from "../study-site/server/blogPostMarkdown.js";
import { artifactTypes } from "../study-site/server/artifactTypes.js";
import { buildStaticManifest } from "../study-site/server/staticData.js";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const chapterManifestPath = path.join(repoRoot, "output/site-data/chapters/manifest.json");
const staticDataDir = path.join(repoRoot, "output/static-site-data");

const args = parseArgs(process.argv.slice(2));
const markdownDir = path.resolve(repoRoot, args.markdownDir || "output/studio-blog-posts");
const outDir = path.resolve(repoRoot, args.outDir || "output/static-site-data");
const notebookId = args.notebookId || "";
const notebook = args.notebook || "pmpp";
const generatedAt = new Date().toISOString();

const chapterManifest = await readJson(chapterManifestPath);
const sourceMap = await readJson(path.join(outDir, "source-map.json"));

let converted = 0;
for (const chapter of chapterManifest.chapters) {
  const markdownPath = path.join(markdownDir, `${chapter.id}.md`);
  if (!(await exists(markdownPath))) continue;

  const source = sourceMap[chapter.id] || {};
  const markdown = await fs.readFile(markdownPath, "utf-8");
  const artifact = {
    chapterId: chapter.id,
    chapterTitle: chapter.title,
    sourceId: source.sourceId || null,
    sourceTitle: source.sourceTitle || null,
    artifactType: "blog-post",
    artifactLabel: "Blog Post",
    generatedAt,
    generator: {
      tool: "notebooklm-mcp",
      mode: "studio",
      studioArtifactType: "report",
      reportFormat: "Blog Post",
      notebook,
      notebookId,
      language: "zh-CN",
    },
    content: markdownReportToArtifactContent(markdown),
  };
  await writeJson(path.join(outDir, "artifacts", chapter.id, "blog-post.json"), artifact);
  converted += 1;
}

const artifacts = await discoverArtifacts(outDir, chapterManifest.chapters);
const manifest = buildStaticManifest({
  chapterManifest,
  generatedAt,
  notebook,
  sourceMap,
  artifacts,
});
manifest.generator.tool = "notebooklm-mcp";
manifest.generator.mode = "studio-and-query";
manifest.generator.sourceScope = "chapter source ids";
await writeJson(path.join(outDir, "manifest.json"), manifest);

console.log(`Converted ${converted} Studio Blog Post markdown files.`);
console.log(`Static data manifest updated at ${path.join(outDir, "manifest.json")}`);

async function discoverArtifacts(outDir, chapters) {
  const artifacts = {};
  for (const chapter of chapters) {
    const chapterArtifacts = {};
    for (const type of artifactTypes) {
      const relativePath = `artifacts/${chapter.id}/${type.id}.json`;
      if (await exists(path.join(outDir, relativePath))) {
        chapterArtifacts[type.id] = relativePath;
      }
    }
    if (Object.keys(chapterArtifacts).length > 0) {
      artifacts[chapter.id] = chapterArtifacts;
    }
  }
  return artifacts;
}

function parseArgs(rawArgs) {
  const parsed = {};
  for (let index = 0; index < rawArgs.length; index += 1) {
    const arg = rawArgs[index];
    if (!arg.startsWith("--")) continue;
    const key = arg.slice(2).replace(/-([a-z])/g, (_, char) => char.toUpperCase());
    parsed[key] = rawArgs[index + 1];
    index += 1;
  }
  return parsed;
}

async function exists(filePath) {
  try {
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
}

async function readJson(filePath) {
  return JSON.parse(await fs.readFile(filePath, "utf-8"));
}

async function writeJson(filePath, value) {
  await fs.mkdir(path.dirname(filePath), { recursive: true });
  await fs.writeFile(filePath, `${JSON.stringify(value, null, 2)}\n`, "utf-8");
}
