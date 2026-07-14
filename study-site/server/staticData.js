import path from "node:path";

import { artifactTypes } from "./artifactTypes.js";
import { STATIC_DATA_DIR, readJsonFile } from "./config.js";

const CHAPTER_ID_PATTERN = /^chapter-\d{2}-[a-z0-9-]+$/;
const ARTIFACT_TYPE_PATTERN = /^[a-z0-9-]+$/;

export const STATIC_MANIFEST_PATH = path.join(STATIC_DATA_DIR, "manifest.json");

export function staticArtifactRelativePath(chapterId, artifactType) {
  assertStaticArtifactParts(chapterId, artifactType);
  return `artifacts/${chapterId}/${artifactType}.json`;
}

export function staticArtifactPath(chapterId, artifactType) {
  const artifactPath = path.join(STATIC_DATA_DIR, staticArtifactRelativePath(chapterId, artifactType));
  const relative = path.relative(STATIC_DATA_DIR, artifactPath);
  if (relative.startsWith("..") || path.isAbsolute(relative)) {
    throw new Error("Static artifact path escaped static data root");
  }
  return artifactPath;
}

export async function loadStaticManifest() {
  return readJsonFile(STATIC_MANIFEST_PATH);
}

export function buildStaticManifest({
  chapterManifest,
  generatedAt = new Date().toISOString(),
  notebook = "pmpp",
  sourceMap = {},
  artifacts = {},
}) {
  if (!chapterManifest || !Array.isArray(chapterManifest.chapters)) {
    throw new Error("Invalid chapter manifest");
  }

  return {
    mode: "static",
    generatedAt,
    notebook,
    generator: {
      tool: "nlm",
      mode: "query",
      sourceScope: "chapter source ids",
    },
    artifactTypes,
    chapters: chapterManifest.chapters.map((chapter) => {
      const source = sourceMap[chapter.id] || {};
      return {
        ...chapter,
        sourceId: source.sourceId || null,
        sourceTitle: source.sourceTitle || null,
        artifacts: artifacts[chapter.id] || {},
      };
    }),
  };
}

function assertStaticArtifactParts(chapterId, artifactType) {
  if (!CHAPTER_ID_PATTERN.test(chapterId)) {
    throw new Error(`Invalid chapter id: ${chapterId}`);
  }
  if (!ARTIFACT_TYPE_PATTERN.test(artifactType)) {
    throw new Error(`Invalid artifact type: ${artifactType}`);
  }
}
