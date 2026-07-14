import { MANIFEST_PATH, readJsonFile, resolveRepoPath } from "./config.js";

let cachedManifest;

export async function loadManifest() {
  if (cachedManifest) return cachedManifest;
  const manifest = await readJsonFile(MANIFEST_PATH);
  validateManifest(manifest);
  cachedManifest = manifest;
  return manifest;
}

export async function findChapter(chapterId) {
  const manifest = await loadManifest();
  return manifest.chapters.find((chapter) => chapter.id === chapterId);
}

function validateManifest(manifest) {
  if (!manifest || !Array.isArray(manifest.chapters)) {
    throw new Error("Invalid chapter manifest: missing chapters array");
  }
  for (const chapter of manifest.chapters) {
    for (const key of ["id", "number", "title", "pdfPath", "textPath", "pageCount", "wordCount"]) {
      if (!(key in chapter)) {
        throw new Error(`Invalid chapter manifest: missing ${key}`);
      }
    }
    resolveRepoPath(chapter.pdfPath);
    resolveRepoPath(chapter.textPath);
  }
}
