import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export const STUDY_SITE_ROOT = path.resolve(__dirname, "..");
export const REPO_ROOT = path.resolve(STUDY_SITE_ROOT, "..");
export const CHAPTER_DATA_DIR = path.join(REPO_ROOT, "output", "site-data", "chapters");
export const GENERATED_DATA_DIR = path.join(REPO_ROOT, "output", "site-data", "generated");
export const STATIC_DATA_DIR = path.join(REPO_ROOT, "output", "static-site-data");
export const PUBLIC_DIR = path.join(STUDY_SITE_ROOT, "public");
export const DIST_DIR = path.join(STUDY_SITE_ROOT, "dist");
export const MANIFEST_PATH = path.join(CHAPTER_DATA_DIR, "manifest.json");
export const CODEX_MODEL = process.env.CODEX_MODEL || "gpt-5.5";
export const CODEX_REASONING_EFFORT = process.env.CODEX_REASONING_EFFORT || "xhigh";

const CHAPTER_ID_PATTERN = /^chapter-\d{2}-[a-z0-9-]+$/;
const ARTIFACT_TYPE_PATTERN = /^[a-z0-9-]+$/;

function assertInside(parent, candidate, message) {
  const relative = path.relative(parent, candidate);
  if (relative === "" || (!relative.startsWith("..") && !path.isAbsolute(relative))) {
    return candidate;
  }
  throw new Error(message);
}

export function resolveRepoPath(relativePath) {
  if (typeof relativePath !== "string" || path.isAbsolute(relativePath)) {
    throw new Error("Expected a repository-relative path");
  }
  return assertInside(
    REPO_ROOT,
    path.resolve(REPO_ROOT, relativePath),
    `Path is outside repository: ${relativePath}`,
  );
}

export function artifactCachePath(chapterId, artifactType) {
  if (!CHAPTER_ID_PATTERN.test(chapterId)) {
    throw new Error(`Invalid chapter id: ${chapterId}`);
  }
  if (!ARTIFACT_TYPE_PATTERN.test(artifactType)) {
    throw new Error(`Invalid artifact type: ${artifactType}`);
  }
  const cachePath = path.join(GENERATED_DATA_DIR, chapterId, `${artifactType}.json`);
  return assertInside(GENERATED_DATA_DIR, cachePath, "Artifact cache path escaped generated data root");
}

export async function readJsonFile(filePath) {
  return JSON.parse(await fs.readFile(filePath, "utf-8"));
}

export async function writeJsonFile(filePath, value) {
  await fs.mkdir(path.dirname(filePath), { recursive: true });
  await fs.writeFile(filePath, JSON.stringify(value, null, 2) + "\n", "utf-8");
}
