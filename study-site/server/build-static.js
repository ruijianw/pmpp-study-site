import { buildStaticSite } from "./buildStatic.js";

const distDir = await buildStaticSite();
console.log(`Static site built at ${distDir}`);
