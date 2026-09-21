"use strict";

const fs = require("fs");
const path = require("path");
const { spawnSync } = require("child_process");

const root = path.join(__dirname, "..");
const dist = path.join(root, "dist");
const buildScripts = [
  "build-events.js",
  "build-ticker.js",
  "build-about.js",
  "build-site.js",
  "build-skills.js",
];

function runBuild(script) {
  const result = spawnSync(process.execPath, [path.join(__dirname, script)], {
    cwd: root,
    stdio: "inherit",
  });
  if (result.status !== 0) process.exit(result.status || 1);
}

function copyFile(rel) {
  const source = path.join(root, rel);
  const target = path.join(dist, rel);
  fs.mkdirSync(path.dirname(target), { recursive: true });
  fs.copyFileSync(source, target);
}

function copyTree(rel, allowedExtensions = null) {
  const sourceDir = path.join(root, rel);
  if (!fs.existsSync(sourceDir)) return;
  for (const entry of fs.readdirSync(sourceDir, { withFileTypes: true })) {
    const child = path.join(rel, entry.name);
    if (entry.isDirectory()) copyTree(child, allowedExtensions);
    else if (!allowedExtensions || allowedExtensions.has(path.extname(entry.name).toLowerCase())) copyFile(child);
  }
}

function collectUploadRefs(value, refs) {
  if (typeof value === "string") {
    const match = value.match(/^\/?(uploads\/[^?#]+)$/i);
    if (match) refs.add(match[1].replace(/\//g, path.sep));
    return;
  }
  if (Array.isArray(value)) value.forEach((item) => collectUploadRefs(item, refs));
  else if (value && typeof value === "object") Object.values(value).forEach((item) => collectUploadRefs(item, refs));
}

buildScripts.forEach(runBuild);
fs.rmSync(dist, { recursive: true, force: true });
fs.mkdirSync(dist, { recursive: true });

["index.html", "_headers", "_redirects"].forEach(copyFile);
["css", "js", "data"].forEach((dir) => copyTree(dir));
copyTree("img", new Set([".jpg", ".jpeg", ".png", ".gif", ".webp", ".svg", ".ico"]));

const uploadRefs = new Set();
for (const file of fs.readdirSync(path.join(root, "data")).filter((name) => name.endsWith(".json"))) {
  collectUploadRefs(JSON.parse(fs.readFileSync(path.join(root, "data", file), "utf8")), uploadRefs);
}
const html = fs.readFileSync(path.join(root, "index.html"), "utf8");
for (const match of html.matchAll(/(?:src|data-src)="\/?(uploads\/[^"?#]+)"/gi)) uploadRefs.add(match[1].replace(/\//g, path.sep));
for (const rel of uploadRefs) {
  const normalized = path.normalize(rel);
  if (!normalized.startsWith(`uploads${path.sep}`) || normalized.includes(`..${path.sep}`)) continue;
  if (fs.existsSync(path.join(root, normalized))) copyFile(normalized);
}

runBuild("build-pages.js");

console.log(`Đã tạo bản public tối giản trong dist/ với ${uploadRefs.size} tài sản uploads được tham chiếu.`);
