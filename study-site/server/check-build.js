import fs from "node:fs/promises";
import path from "node:path";

import { PUBLIC_DIR } from "./config.js";
import { artifactTypes } from "./artifactTypes.js";
import { loadManifest } from "./manifest.js";

const requiredPublicFiles = ["index.html", "styles.css", "app.js"];

const manifest = await loadManifest();
if (manifest.chapters.length !== 24) {
  throw new Error(`Expected 24 chapters, found ${manifest.chapters.length}`);
}
if (artifactTypes.length !== 6) {
  throw new Error(`Expected 6 artifact types, found ${artifactTypes.length}`);
}
for (const file of requiredPublicFiles) {
  await fs.access(path.join(PUBLIC_DIR, file));
}
console.log("Build check passed");
