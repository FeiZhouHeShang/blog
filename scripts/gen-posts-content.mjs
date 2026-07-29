// 生成文章全文静态副本 + 预渲染 HTML：
//   public/posts-content/<相对路径无后缀>.md   ← 全文 Markdown（必生成）
//   public/posts-content/<相对路径无后缀>.html ← 预渲染 HTML（dev API 可达时才生成）
//
// 用途：
//   - .md  → 「编辑当前文章」在未填 PAT 时也能加载原文
//   - .html → 编辑器预览面板的静态副本（dev 走 /api/render-preview/，prod 也兼容）
//
// 共享渲染管线：src/utils/markdown-render.mjs
//   与发布页（Astro content）使用同一份插件链。
//   任何 markdown 插件/自定义组件的修改都会自动同步到编辑器预览。
//
// 用法：node scripts/gen-posts-content.mjs [devPort]
//   - 不带参数 → 只生成 .md；如检测到 dev server 在 4321/4400/4500 也尝试生成 .html
//   - 带端口号 → 调 http://localhost:<port>/api/render-preview/ 生成 .html
import fs from "node:fs";
import path from "node:path";

const POSTS_DIR = path.resolve("src/content/posts");
const OUT_DIR = path.resolve("public/posts-content");

// 候选 dev server 端口（按项目惯例）
const CANDIDATE_PORTS = [4321, 4400, 4500];

function walk(dir) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  const files = [];
  for (const e of entries) {
    const full = path.join(dir, e.name);
    if (e.isDirectory()) files.push(...walk(full));
    else if (e.name.endsWith(".md")) files.push(full);
  }
  return files;
}

function splitFrontmatter(raw) {
  const m = raw.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?([\s\S]*)$/);
  if (!m) return { fm: "", body: raw };
  return { fm: m[1], body: m[2] };
}

async function tryApiHtml(baseUrl, body) {
  const r = await fetch(`${baseUrl}/api/render-preview/`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ markdown: body }),
  });
  if (!r.ok) throw new Error(`HTTP ${r.status}`);
  const j = await r.json();
  if (typeof j.html !== "string") throw new Error("bad response shape");
  return j.html;
}

async function detectDevServer() {
  for (const port of CANDIDATE_PORTS) {
    try {
      const r = await fetch(`http://localhost:${port}/`, {
        signal: AbortSignal.timeout(800),
      });
      if (r.ok) return `http://localhost:${port}`;
    } catch (_e) {
      // 不在跑
    }
  }
  return null;
}

const argPort = process.argv[2];
let apiBase = null;
if (argPort && /^\d+$/.test(argPort)) {
  apiBase = `http://localhost:${argPort}`;
} else {
  apiBase = await detectDevServer();
}
if (apiBase) {
  console.log(`→ 检测到 dev server：${apiBase}（将通过 /api/render-preview/ 预渲染 HTML）`);
} else {
  console.log(`→ 未检测到 dev server（候选端口 ${CANDIDATE_PORTS.join("/")}）；仅生成 .md 副本`);
}

const files = walk(POSTS_DIR);
let mdCount = 0;
let htmlCount = 0;
let htmlErrCount = 0;
for (const f of files) {
  const rel = path.relative(POSTS_DIR, f).split(path.sep).join("/").replace(/\.md$/, "");
  const raw = fs.readFileSync(f, "utf-8");
  // 1) 全文 .md 副本
  const mdOut = path.join(OUT_DIR, rel + ".md");
  fs.mkdirSync(path.dirname(mdOut), { recursive: true });
  fs.writeFileSync(mdOut, raw, "utf-8");
  mdCount++;
  // 2) 预渲染 .html（仅在 dev server 可达时执行）
  if (apiBase) {
    try {
      const { body } = splitFrontmatter(raw);
      const html = await tryApiHtml(apiBase, body);
      const htmlOut = path.join(OUT_DIR, rel + ".html");
      fs.writeFileSync(htmlOut, html, "utf-8");
      htmlCount++;
    } catch (e) {
      htmlErrCount++;
      console.warn(`  ! ${rel} 预渲染失败:`, e instanceof Error ? e.message : e);
    }
  }
}

console.log(
  `✓ 生成 ${mdCount} 篇 .md 全文` + (apiBase ? ` + ${htmlCount} 个 .html 预览副本 (${htmlErrCount} 失败)` : "") + ` -> public/posts-content/`,
);


