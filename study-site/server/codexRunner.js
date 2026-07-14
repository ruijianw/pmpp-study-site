import fs from "node:fs/promises";

import {
  CODEX_MODEL,
  CODEX_REASONING_EFFORT,
  REPO_ROOT,
  artifactCachePath,
  readJsonFile,
  resolveRepoPath,
  writeJsonFile,
} from "./config.js";
import { extractJsonObject } from "./json.js";

export async function readCachedArtifact(chapterId, artifactTypeId) {
  const cachePath = artifactCachePath(chapterId, artifactTypeId);
  try {
    return await readJsonFile(cachePath);
  } catch (error) {
    if (error.code === "ENOENT") return undefined;
    throw error;
  }
}

export async function generateArtifact({ chapter, artifactType, force = false }) {
  const cachePath = artifactCachePath(chapter.id, artifactType.id);
  if (!force) {
    const cached = await readCachedArtifact(chapter.id, artifactType.id);
    if (cached) return { ...cached, cacheStatus: "hit" };
  }

  const chapterTextPath = resolveRepoPath(chapter.textPath);
  await fs.access(chapterTextPath);

  const codex = await createCodex();
  const thread = codex.startThread({
    model: CODEX_MODEL,
    modelReasoningEffort: CODEX_REASONING_EFFORT,
    sandboxMode: "read-only",
    workingDirectory: REPO_ROOT,
    skipGitRepoCheck: true,
    networkAccessEnabled: false,
    approvalPolicy: "never",
  });
  const result = await thread.run(buildPrompt({ chapter, artifactType, chapterTextPath }));
  const content = extractJsonObject(result.finalResponse || "");
  const artifact = {
    chapterId: chapter.id,
    chapterTitle: chapter.title,
    artifactType: artifactType.id,
    artifactLabel: artifactType.label,
    generatedAt: new Date().toISOString(),
    content,
  };

  await writeJsonFile(cachePath, artifact);
  return { ...artifact, cacheStatus: "miss" };
}

async function createCodex() {
  let module;
  try {
    module = await import("@openai/codex-sdk");
  } catch (error) {
    throw new Error(
      `Codex SDK is not installed or unavailable. Run "npm install" in study-site. Original error: ${error.message}`,
    );
  }
  const Codex = module.Codex || module.default;
  if (!Codex) {
    throw new Error("Codex SDK did not export Codex");
  }
  return new Codex();
}

function buildPrompt({ chapter, artifactType, chapterTextPath }) {
  return `You are helping a reader quickly learn a chapter from Programming Massively Parallel Processors.

Read this local chapter text file:
${chapterTextPath}

Chapter:
- id: ${chapter.id}
- title: ${chapter.title}
- pages: ${chapter.pageCount}
- approximate words: ${chapter.wordCount}
- Codex model: ${CODEX_MODEL}
- reasoning effort: ${CODEX_REASONING_EFFORT}

Artifact requested: ${artifactType.label}
${artifactType.prompt}

Rules:
- Use only the chapter text file as the source.
- Focus on CUDA, GPU architecture, performance reasoning, and common implementation mistakes.
- Keep explanations concise but technical.
- Return only valid JSON. Do not wrap it in Markdown fences.
- Use this top-level shape:
{
  "title": "string",
  "summary": "string",
  "items": [],
  "sections": []
}
- Put artifact-specific objects inside "items" and explanatory groupings inside "sections".
`;
}
