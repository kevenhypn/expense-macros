const { createHash } = require("node:crypto");
const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(process.argv[2] ?? "dist");
const base = process.env.EXPENSE_MACROS_BASE_PATH || "";
const index = path.join(root, "index.html");
let html = fs.readFileSync(index, "utf8");
html = html.replace(/<title>.*?<\/title>/g, "").replace("</head>", [
  "<title>Expense Macros</title>",
  `<link rel="manifest" href="${base}/manifest.webmanifest">`,
  `<link rel="apple-touch-icon" href="${base}/icons/app-180.png">`,
  `<script defer src="${base}/register-worker.js"></script>`,
  "</head>",
].join(""));
fs.writeFileSync(index, html);
fs.writeFileSync(path.join(root, ".nojekyll"), "");
for (const page of ["privacy.html", "support.html"]) fs.copyFileSync(path.join("docs", page), path.join(root, page));

function tree(dir) {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap(file =>
    file.isDirectory() ? tree(path.join(dir, file.name)) : [path.join(dir, file.name)],
  );
}
const files = tree(root).filter(file => ![".nojekyll", "sw.js"].includes(path.basename(file))).sort();
const worker = fs.readFileSync("scripts/worker.js");
const hash = createHash("sha256").update(worker);
const assets = files.map(file => {
  const name = path.relative(root, file).split(path.sep).join("/");
  hash.update(name).update(fs.readFileSync(file));
  return name;
});
fs.writeFileSync(path.join(root, "sw.js"),
  `const BUILD_VERSION = "${hash.digest("hex").slice(0, 16)}";\nconst BUILD_FILES = ${JSON.stringify(assets)};\n${worker}`);
console.log("Prepared Home Screen metadata and offline app shell.");
