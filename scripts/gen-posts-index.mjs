// 生成文章索引：src/data/posts-index.ts
// 供 /posts-editor 前端编辑器作初始 seed（无需打开编辑器就先拉 GitHub）。
// 用法：node scripts/gen-posts-index.mjs
// 字段：path(仓库内完整路径) / folder(分类目录) / slug(文件名无后缀) / 常用 frontmatter
import fs from "node:fs";
import path from "node:path";

const POSTS_DIR = path.resolve("src/content/posts");
const OUT_FILE = path.resolve("src/data/posts-index.ts");

function parseFrontmatter(raw) {
  // raw 为 --- 之间的文本
  const out = {};
  const lines = raw.split(/\r?\n/);
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const m = line.match(/^([A-Za-z_][\w-]*)\s*:\s*(.*)$/);
    if (!m) continue;
    const key = m[1];
    let val = m[2].trim();
    // 数组 [a, b]
    if (val.startsWith("[") && val.endsWith("]")) {
      out[key] = val
        .slice(1, -1)
        .split(",")
        .map((s) => s.trim().replace(/^["']|["']$/g, ""))
        .filter(Boolean);
      continue;
    }
    // 布尔
    if (val === "true") { out[key] = true; continue; }
    if (val === "false") { out[key] = false; continue; }
    // 去掉引号
    out[key] = val.replace(/^["']|["']$/g, "");
  }
  return out;
}

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

const files = walk(POSTS_DIR);
const items = [];
for (const f of files) {
  const rel = path.relative(POSTS_DIR, f).split(path.sep).join("/");
  const parts = rel.split("/");
  const folder = parts.length > 1 ? parts[0] : "";
  const fileSlug = parts[parts.length - 1].replace(/\.md$/, "");
  const raw = fs.readFileSync(f, "utf-8");
  const fmMatch = raw.match(/^---\s*\r?\n([\s\S]*?)\r?\n---/);
  const fm = fmMatch ? parseFrontmatter(fmMatch[1]) : {};
  // slug 优先取 frontmatter（便于自定义干净网址），否则回退文件名
  const slug = (typeof fm.slug === "string" && fm.slug.trim()) ? fm.slug.trim() : fileSlug;
  items.push({
    path: "src/content/posts/" + rel,
    folder,
    slug,
    title: fm.title || slug,
    category: fm.category || "",
    description: fm.description || "",
    tags: Array.isArray(fm.tags) ? fm.tags : [],
    published: fm.published || "",
    updated: fm.updated || "",
    pinned: fm.pinned === true,
    draft: fm.draft === true,
  });
}

// 按 published 倒序，置顶优先
items.sort((a, b) => {
  if (a.pinned !== b.pinned) return a.pinned ? -1 : 1;
  return (b.published || "") > (a.published || "") ? 1 : -1;
});

const ts =
  "// 自动生成，勿手改。重新生成：node scripts/gen-posts-index.mjs\n" +
  "export interface PostIndexItem {\n" +
  "\tpath: string;\n\tfolder: string;\n\tslug: string;\n\ttitle: string;\n" +
  "\tcategory: string;\n\tdescription: string;\n\ttags: string[];\n" +
  "\tpublished: string;\n\tupdated: string;\n\tpinned: boolean;\n\tdraft: boolean;\n}\n" +
  "export const postsIndex: PostIndexItem[] = " +
  JSON.stringify(items, null, "\t") +
  ";\n";

fs.mkdirSync(path.dirname(OUT_FILE), { recursive: true });
fs.writeFileSync(OUT_FILE, ts, "utf-8");
console.log(`✓ 生成 ${items.length} 篇文章索引 -> ${path.relative(process.cwd(), OUT_FILE)}`);

// ========================================================================
// 同步给 PagesCMS 后台使用的「标签/分类候选集合」
// 目的：让 PagesCMS 后台的下拉选项 = 实际文章里出现过的标签/分类，
//       而不是 .pages.yml 里硬编码的几条过时的样例。
// 文件：cms-data/tags.json / cms-data/categories.json
// PagesCMS 引用：options.values: data://cms-data/tags.json
// ========================================================================
const CMS_DATA_DIR = path.resolve("cms-data");
const TAGS_OUT = path.join(CMS_DATA_DIR, "tags.json");
const CATS_OUT = path.join(CMS_DATA_DIR, "categories.json");

// 聚合所有 tags（去重 + 排序 + 含每标签的文章数）
const tagCounts = {};
const catCounts = {};
for (const it of items) {
	for (const t of (it.tags || [])) {
		if (typeof t !== "string" || !t.trim()) continue;
		tagCounts[t.trim()] = (tagCounts[t.trim()] || 0) + 1;
	}
	if (it.category && it.category.trim()) {
		catCounts[it.category.trim()] = (catCounts[it.category.trim()] || 0) + 1;
	}
}
// PagesCMS 接受两种结构：纯字符串数组 或 {value,label} 对象数组。
// 用字符串数组最兼容（PagesCMS 2.x 自动用 value 当 label，count 字段会被忽略）；
// 实际我们额外生成 *_with_count.json 给前端自定义下拉用。
const tagList = Object.entries(tagCounts)
	.sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0], "zh"))
	.map(([value]) => value);
const catList = Object.entries(catCounts)
	.sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0], "zh"))
	.map(([value]) => value);
// 计数版本（前端可视化用，不被 PagesCMS 引用）
const tagListRich = Object.entries(tagCounts)
	.sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0], "zh"))
	.map(([value, count]) => ({ value, label: value, count }));
const catListRich = Object.entries(catCounts)
	.sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0], "zh"))
	.map(([value, count]) => ({ value, label: value, count }));

fs.mkdirSync(CMS_DATA_DIR, { recursive: true });
fs.writeFileSync(TAGS_OUT, JSON.stringify(tagList, null, 2) + "\n", "utf-8");
fs.writeFileSync(CATS_OUT, JSON.stringify(catList, null, 2) + "\n", "utf-8");
fs.writeFileSync(path.join(CMS_DATA_DIR, "tags_with_count.json"), JSON.stringify(tagListRich, null, 2) + "\n", "utf-8");
fs.writeFileSync(path.join(CMS_DATA_DIR, "categories_with_count.json"), JSON.stringify(catListRich, null, 2) + "\n", "utf-8");
console.log(`✓ 聚合 ${tagList.length} 个标签 -> ${path.relative(process.cwd(), TAGS_OUT)}`);
console.log(`✓ 聚合 ${catList.length} 个分类 -> ${path.relative(process.cwd(), CATS_OUT)}`);
