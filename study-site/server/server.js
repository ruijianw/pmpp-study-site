import fs from "node:fs/promises";
import http from "node:http";
import path from "node:path";
import { URL } from "node:url";

import {
  CODEX_MODEL,
  CODEX_REASONING_EFFORT,
  PUBLIC_DIR,
  artifactCachePath,
  readJsonFile,
} from "./config.js";
import { artifactTypes, getArtifactType } from "./artifactTypes.js";
import { findChapter, loadManifest } from "./manifest.js";
import { generateArtifact, readCachedArtifact } from "./codexRunner.js";

const PORT = Number(process.env.PORT || 5174);
const HOST = process.env.HOST || "127.0.0.1";

const server = http.createServer(async (request, response) => {
  try {
    const url = new URL(request.url || "/", `http://${request.headers.host || `${HOST}:${PORT}`}`);
    if (url.pathname.startsWith("/api/")) {
      await handleApi(request, response, url);
      return;
    }
    await serveStatic(response, url.pathname);
  } catch (error) {
    sendJson(response, statusForError(error), { error: error.message });
  }
});

server.listen(PORT, HOST, () => {
  console.log(`Study site running at http://${HOST}:${PORT}`);
});

async function handleApi(request, response, url) {
  if (request.method === "GET" && url.pathname === "/api/chapters") {
    const manifest = await loadManifest();
    sendJson(response, 200, {
      chapters: manifest.chapters,
      artifactTypes,
      codex: {
        model: CODEX_MODEL,
        reasoningEffort: CODEX_REASONING_EFFORT,
      },
    });
    return;
  }

  if (request.method === "GET" && url.pathname === "/api/artifact") {
    const chapterId = url.searchParams.get("chapterId") || "";
    const type = url.searchParams.get("type") || "";
    artifactCachePath(chapterId, type);
    const cached = await readCachedArtifact(chapterId, type);
    if (!cached) {
      sendJson(response, 404, { error: "Artifact has not been generated yet" });
      return;
    }
    sendJson(response, 200, { artifact: cached, cacheStatus: "hit" });
    return;
  }

  if (request.method === "POST" && url.pathname === "/api/generate") {
    const body = await readRequestJson(request);
    const chapter = await findChapter(String(body.chapterId || ""));
    const artifactType = getArtifactType(String(body.type || ""));
    if (!chapter) throw new HttpError(404, "Unknown chapter");
    if (!artifactType) throw new HttpError(400, "Unknown artifact type");
    const artifact = await generateArtifact({
      chapter,
      artifactType,
      force: Boolean(body.force),
    });
    sendJson(response, 200, { artifact, cacheStatus: artifact.cacheStatus });
    return;
  }

  throw new HttpError(404, "Not found");
}

async function serveStatic(response, pathname) {
  const cleanPath = pathname === "/" ? "/index.html" : pathname;
  const publicPath = path.resolve(PUBLIC_DIR, `.${cleanPath}`);
  const relative = path.relative(PUBLIC_DIR, publicPath);
  if (relative.startsWith("..") || path.isAbsolute(relative)) {
    throw new HttpError(403, "Forbidden");
  }

  try {
    const data = await fs.readFile(publicPath);
    response.writeHead(200, { "content-type": contentType(publicPath) });
    response.end(data);
  } catch (error) {
    if (error.code === "ENOENT") {
      const index = await fs.readFile(path.join(PUBLIC_DIR, "index.html"));
      response.writeHead(200, { "content-type": "text/html; charset=utf-8" });
      response.end(index);
      return;
    }
    throw error;
  }
}

async function readRequestJson(request) {
  const chunks = [];
  for await (const chunk of request) {
    chunks.push(chunk);
  }
  if (chunks.length === 0) return {};
  return JSON.parse(Buffer.concat(chunks).toString("utf-8"));
}

function sendJson(response, status, value) {
  response.writeHead(status, { "content-type": "application/json; charset=utf-8" });
  response.end(JSON.stringify(value));
}

function contentType(filePath) {
  const extension = path.extname(filePath);
  if (extension === ".html") return "text/html; charset=utf-8";
  if (extension === ".css") return "text/css; charset=utf-8";
  if (extension === ".js") return "text/javascript; charset=utf-8";
  if (extension === ".svg") return "image/svg+xml";
  return "application/octet-stream";
}

function statusForError(error) {
  return error instanceof HttpError ? error.status : 500;
}

class HttpError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}
