import fs from "node:fs/promises";
import path from "node:path";

import { DIST_DIR, PUBLIC_DIR, STATIC_DATA_DIR } from "./config.js";
import { STATIC_MANIFEST_PATH } from "./staticData.js";

export async function buildStaticSite({
  publicDir = PUBLIC_DIR,
  staticDataDir = STATIC_DATA_DIR,
  distDir = DIST_DIR,
} = {}) {
  const manifestPath = path.join(staticDataDir, "manifest.json");
  await fs.access(manifestPath).catch(() => {
    throw new Error(
      "Static data is missing. Run scripts/nlm_generate_static_site.py before npm run build.",
    );
  });

  await fs.rm(distDir, { recursive: true, force: true });
  await fs.mkdir(distDir, { recursive: true });
  await copyDirectory(publicDir, distDir);
  await copyDirectory(staticDataDir, path.join(distDir, "data"));
  await fs.writeFile(path.join(distDir, ".nojekyll"), "", "utf-8");
  return distDir;
}

export async function copyDirectory(source, target) {
  await fs.mkdir(target, { recursive: true });
  const entries = await fs.readdir(source, { withFileTypes: true });
  for (const entry of entries) {
    const sourcePath = path.join(source, entry.name);
    const targetPath = path.join(target, entry.name);
    if (entry.isDirectory()) {
      await copyDirectory(sourcePath, targetPath);
      continue;
    }
    if (entry.isFile()) {
      await fs.copyFile(sourcePath, targetPath);
    }
  }
}
