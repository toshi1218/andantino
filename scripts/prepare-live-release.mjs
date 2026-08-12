import { readFile, writeFile, readdir } from "node:fs/promises";
import { extname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("../", import.meta.url));
const OLD_HOST = "https://andantino-shoes.jp";
const NEW_HOST = "https://andantino-shoes.jp";
const allowedExtensions = new Set([".html", ".xml", ".txt", ".mjs", ".js", ".json", ".md"]);
const ignoredDirectories = new Set([".git", "node_modules"]);

async function walk(dir) {
  const entries = await readdir(dir, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) {
      if (!ignoredDirectories.has(entry.name)) files.push(...await walk(full));
      continue;
    }
    if (allowedExtensions.has(extname(entry.name))) files.push(full);
  }
  return files;
}

let changed = 0;
for (const file of await walk(root)) {
  const current = await readFile(file, "utf8");
  const next = current.split(OLD_HOST).join(NEW_HOST);
  if (next !== current) {
    await writeFile(file, next);
    changed += 1;
  }
}

console.log(`Canonical host normalized in ${changed} file(s): ${OLD_HOST} -> ${NEW_HOST}`);
