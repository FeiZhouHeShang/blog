// 文章前端编辑器引导（持久化模块，由 Layout 在每次导航后调用）
// UI 完全按 fqzlr /write/ 1:1 复刻：WRITE 标题 + 6 按钮工具栏 + 双栏（主区编辑 + 侧栏表单），仅保留自研标签三连框。
// 后台：PAT(导入密钥) + draftStore(本地草稿) + uploadCenter(统一推送) + ImgBed(图片上传) + server preview(/api/render-preview/)。
// 删掉的旧逻辑：分类 combo-box、目录派生、单一「修改保存」按钮 + 脏检测、channel 切换(图床/仓库本地)。

import { putDraft, getDraft, getDrafts, deleteDraft } from "@/scripts/draftStore";

var IMGBED_URL = "";
var IMGBED_AUTH = "";
var IMGBED_API_TOKEN = "";
var $ = function (id) { return document.getElementById(id); };
var REPO = "FeiZhouHeShang/blog";
var API_TREE_URL = "https://api.github.com/repos/" + REPO + "/git/trees/main?recursive=1";
var API_CONTENT = function (p) { return "https://api.github.com/repos/" + REPO + "/contents/" + p + "?ref=main"; };
var PAT_STORAGE_KEY = "__pe_session_pat__";

// 状态
var state = {
	posts: [],          // [{path, folder, slug, title, category, published, pinned, draft, sha}]
	seed: [],           // 服务端注入的全文索引
	editingPath: null,  // 正在编辑的文件仓库路径（null=新建）
	editingSha: null,   // 文件 blob sha（新建为 null）
	originalTitle: "",  // 编辑前的标题
	isNew: true,
	saving: false,
	pendingEditSlug: null, // URL ?edit=<slug>：待定位的目标 slug
	_tagChips: [],
	_tagPool: [],
	_tagCounts: {},
};

// 工具
function setStatus(el, msg, kind) {
	if (!el) return;
	el.textContent = msg || "";
	el.classList.remove("is-error", "is-ok");
	if (kind) el.classList.add("is-" + kind);
}
function base64ToUtf8(b64) {
	try { return decodeURIComponent(escape(atob(b64.replace(/\s/g, "")))); }
	catch (_e) { return atob(b64.replace(/\s/g, "")); }
}
function utf8ToBase64(str) { return btoa(unescape(encodeURIComponent(str))); }
function escHtml(s) {
	return String(s).replace(/[&<>"']/g, function (c) {
		return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
	});
}
function slugify(s) {
	var out = String(s).toLowerCase().trim().replace(/\s+/g, "-").replace(/[^a-z0-9\-]/g, "");
	return out || ("post-" + new Date().toISOString().slice(0, 10));
}
function nowDate() { return new Date().toISOString().slice(0, 10); }
function autoSizeTitle() {
	var ta = $("pe-f-title"); if (!ta) return;
	ta.style.height = "auto";
	ta.style.height = (ta.scrollHeight || ta.clientHeight) + "px";
}
function updateCharCount() {
	var ta = $("pe-f-body"); var el = $("pe-char-count");
	if (!ta || !el) return;
	el.textContent = (ta.value || "").length + " 字";
}

// 预览（POST /api/render-preview/，保证预览 == 发布页）
var _previewTimer = null;
function renderPreview() {
	var ta = $("pe-f-body"); var box = $("pe-preview");
	if (!ta || !box || box.hidden) return;
	fetch("/api/render-preview/", {
		method: "POST",
		headers: { "Content-Type": "application/json" },
		body: JSON.stringify({ markdown: ta.value || "" }),
	})
		.then(function (r) { return r.ok ? r.text() : Promise.reject(); })
		.then(function (html) { box.innerHTML = html; })
		.catch(function () {});
}
function schedulePreview() {
	if (_previewTimer) clearTimeout(_previewTimer);
	_previewTimer = setTimeout(renderPreview, 400);
}
function togglePreview() {
	var box = $("pe-preview"); var ta = $("pe-f-body");
	if (!box || !ta) return;
	box.hidden = !box.hidden;
	if (!box.hidden) { ta.style.display = "none"; renderPreview(); }
	else { ta.style.display = ""; }
}

// Markdown 工具栏
function mdAction(act) {
	var ta = $("pe-f-body"); if (!ta) return;
	var start = ta.selectionStart, end = ta.selectionEnd;
	var sel = ta.value.slice(start, end);
	var before = ta.value.slice(0, start), after = ta.value.slice(end);
	function set(newVal, sStart, sEnd) {
		ta.value = before + newVal + after;
		ta.selectionStart = sStart; ta.selectionEnd = sEnd;
		ta.focus();
		updateCharCount(); schedulePreview();
	}
	switch (act) {
		case "bold": { var v = "**" + (sel || "粗体") + "**"; set(v, start + 2, start + 2 + (sel || "粗体").length); break; }
		case "italic": { var v = "*" + (sel || "斜体") + "*"; set(v, start + 1, start + 1 + (sel || "斜体").length); break; }
		case "code": { var v = "`" + (sel || "代码") + "`"; set(v, start + 1, start + 1 + (sel || "代码").length); break; }
		case "codeblock": { var v = "```\n" + (sel || "代码块") + "\n```"; set(v, start + 4, start + 4 + (sel || "代码块").length); break; }
		case "link": { var v = "[" + (sel || "链接文字") + "](url)"; set(v, start, start + v.length); break; }
		case "image": { var v = "![" + (sel || "图片描述") + "](url)"; set(v, start, start + v.length); break; }
		case "quote": { var lines = (sel || "引用").split("\n").map(function (l) { return "> " + l; }).join("\n"); set(lines, start, start + lines.length); break; }
		case "ul": { var lines = (sel || "项目").split("\n").map(function (l) { return "- " + l; }).join("\n"); set(lines, start, start + lines.length); break; }
		case "ol": { var lines = (sel || "项目").split("\n").map(function (l, i) { return (i + 1) + ". " + l; }).join("\n"); set(lines, start, start + lines.length); break; }
		case "h1": { var v = "# " + (sel || "标题"); set(v, start, start + v.length); break; }
		case "h2": { var v = "## " + (sel || "标题"); set(v, start, start + v.length); break; }
		case "h3": { var v = "### " + (sel || "标题"); set(v, start, start + v.length); break; }
		case "hr": { var v = (before && !before.endsWith("\n") ? "\n" : "") + "---" + (after && !after.startsWith("\n") ? "\n" : ""); set(v, start, start + 3); break; }
	}
}

// ===== PAT =====
function getPat() { return sessionStorage.getItem(PAT_STORAGE_KEY) || ""; }
function setPat(v) { if (v) sessionStorage.setItem(PAT_STORAGE_KEY, v); else sessionStorage.removeItem(PAT_STORAGE_KEY); }
async function validatePat(token) {
	var r = await fetch("https://api.github.com/user", {
		headers: { Authorization: "Bearer " + token, Accept: "application/vnd.github+json" },
	});
	if (!r.ok) {
		var err = await r.json().catch(function () { return {}; });
		throw new Error("令牌无效（" + r.status + "：" + (err.message || r.statusText) + "）");
	}
	return true;
}
function renderSessionState() {
	var chip = $("pe-session-chip");
	var keyBtn = $("pe-toolbar-key");
	var notice = $("pe-key-notice");
	var pub = $("pe-toolbar-publish");
	if (getPat()) {
		if (chip) { chip.textContent = "🔓 本次浏览已验证"; chip.className = "pe-session-chip is-ok"; }
		if (keyBtn) { keyBtn.textContent = "🔑 密钥已导入"; keyBtn.classList.add("has-key"); }
		if (notice) notice.classList.add("is-hidden");
		if (pub) { pub.disabled = false; pub.classList.remove("is-disabled"); pub.innerHTML = "🚀 发表呀"; pub.title = "保存到本地草稿 + 打开上传中心统一推送"; }
	} else {
		if (chip) { chip.textContent = "🔒 未验证"; chip.className = "pe-session-chip is-lock"; }
		if (keyBtn) { keyBtn.textContent = "🔑 导入密钥"; keyBtn.classList.remove("has-key"); }
		if (notice) notice.classList.remove("is-hidden");
		if (pub) { pub.disabled = true; pub.classList.add("is-disabled"); pub.innerHTML = "🔒 需密钥"; pub.title = "请先导入密钥"; }
	}
}

// ===== 图床上传（与 fqzlr 一致：默认图床；删掉仓库本地方案 A 切换）=====
function extractImgUrl(data) {
	if (!data) return "";
	if (typeof data === "string") return data;
	if (Array.isArray(data)) {
		var f = data[0];
		if (!f || typeof f !== "object") return "";
		return f.src || f.url || f.link || f.absolute_url || f.full_url || f.pathname || f.publicUrl || "";
	}
	var inner = data.data;
	if (inner && typeof inner === "object") {
		var arr = Array.isArray(inner) ? inner : [inner];
		var ff = arr[0];
		if (ff && typeof ff === "object") return ff.src || ff.url || ff.publicUrl || "";
	}
	return data.src || data.url || data.publicUrl || "";
}
async function uploadToImgbed(file, folder) {
	var fd = new FormData();
	fd.append("file", file);
	var base = (IMGBED_URL || "").replace(/\/+$/, "");
	var url = base + "/upload?returnFormat=full&uploadNameType=origin";
	if (folder) url += "&uploadFolder=" + encodeURIComponent(folder);
	var headers = { Accept: "application/json" };
	if (IMGBED_API_TOKEN) headers["Authorization"] = "Bearer " + IMGBED_API_TOKEN;
	else if (IMGBED_AUTH) url += "&authCode=" + encodeURIComponent(IMGBED_AUTH);
	var r = await fetch(url, { method: "POST", body: fd, headers: headers });
	if (!r.ok) throw new Error("图床上传失败 " + r.status);
	var data = await r.json().catch(function () { return null; });
	var u = extractImgUrl(data);
	if (!u) throw new Error("无法从图床响应解析图片 URL");
	return u;
}
async function handleImgUpload() {
	var fileInput = $("pe-img-file");
	if (!fileInput || !fileInput.files || !fileInput.files.length) return;
	var title = ($("pe-f-title").value || "").trim();
	if (!title) { setStatus($("pe-img-tip"), "⚠️ 请先填写标题，图片才能归到 /文章/<标题>/ 目录", "is-error"); return; }
	var folder = "文章/" + title;
	var files = Array.from(fileInput.files);
	var tip = $("pe-img-tip");
	var done = 0;
	setStatus(tip, "上传中 0/" + files.length, "");
	try {
		for (var i = 0; i < files.length; i++) {
			var url = await uploadToImgbed(files[i], folder);
			insertImageMarkdown(url);
			done++;
			setStatus(tip, "上传 " + done + "/" + files.length, "is-ok");
		}
		setStatus(tip, "已上传 " + done + " 张到图床", "is-ok");
	} catch (e) {
		setStatus(tip, "❌ " + e.message, "is-error");
	} finally {
		fileInput.value = "";
	}
}
function insertImageMarkdown(url) {
	var ta = $("pe-f-body"); if (!ta) return;
	var md = "\n![](" + url + ")\n";
	var start = ta.selectionStart || ta.value.length;
	ta.value = ta.value.slice(0, start) + md + ta.value.slice(start);
	ta.focus();
	ta.selectionStart = ta.selectionEnd = start + md.length;
	updateCharCount(); schedulePreview();
}

// ===== Frontmatter =====
function splitFrontmatter(raw) {
	var m = raw.match(/^---\s*\r?\n([\s\S]*?)\r?\n---\s*\r?\n?([\s\S]*)$/);
	if (!m) return { fm: "", body: raw };
	return { fm: m[1], body: m[2] || "" };
}
function parseFm(fm) {
	var out = {};
	fm.split(/\r?\n/).forEach(function (line) {
		var mm = line.match(/^([A-Za-z_][\w-]*)\s*:\s*(.*)$/);
		if (!mm) return;
		var k = mm[1], v = mm[2].trim();
		if (v.startsWith("[") && v.endsWith("]")) {
			out[k] = v.slice(1, -1).split(",").map(function (s) { return s.trim().replace(/^["']|["']$/g, ""); }).filter(Boolean);
		} else if (v === "true") out[k] = true;
		else if (v === "false") out[k] = false;
		else out[k] = v.replace(/^["']|["']$/g, "");
	});
	return out;
}
function buildMarkdown(fm, body) {
	var lines = Object.keys(fm).map(function (k) {
		var v = fm[k];
		if (Array.isArray(v)) return k + ": [" + v.map(function (x) { return '"' + x + '"'; }).join(", ") + "]";
		if (typeof v === "boolean") return k + ": " + (v ? "true" : "false");
		return k + ': "' + String(v).replace(/"/g, '\\"') + '"';
	});
	return "---\n" + lines.join("\n") + "\n---\n\n" + body + "\n";
}

// ===== 列表视图（按分类分组，fqzlr catalog 风）=====
function renderCatalog() {
	var cat = $("pe-root").querySelector("[data-pe-catalog]");
	if (!cat) return;
	var groups = {};
	state.posts.forEach(function (p) {
		var c = (p.category || "").trim() || "未分类";
		if (!groups[c]) groups[c] = [];
		groups[c].push(p);
	});
	var names = Object.keys(groups).sort(function (a, b) {
		if (a === "未分类") return 1;
		if (b === "未分类") return -1;
		return groups[b].length - groups[a].length || a.localeCompare(b, "zh");
	});
	cat.innerHTML = names.map(function (name) {
		var items = groups[name].map(function (p) {
			var meta = p.published ? '<span class="pe-catalog-item-meta">' + escHtml(p.published) + "</span>" : "";
			var pin = p.pinned ? '<span class="pe-catalog-item-pin">📌</span> ' : "";
			var draft = p.draft ? '<span class="pe-catalog-item-draft">草稿</span> ' : "";
			return '<li class="pe-catalog-item" data-pe-edit="' + escHtml(p.path) + '">' +
				'<span class="pe-catalog-item-title">' + pin + draft + escHtml(p.title || p.slug) + '</span>' +
				meta + "</li>";
		}).join("");
		return '<div class="pe-catalog-group">' +
			'<div class="pe-catalog-group-header">' + escHtml(name) + '<span class="pe-catalog-group-count">(' + groups[name].length + ')</span></div>' +
			'<ul class="pe-catalog-items">' + items + '</ul></div>';
	}).join("");
	var empty = $("pe-root").querySelector("[data-pe-catalog-empty]");
	if (empty) empty.hidden = state.posts.length > 0;
}
function findBySlug(slug) {
	var hit = state.posts.find(function (p) {
		var n = (p.path || "").replace(/^src\/content\/posts\//, "").replace(/\.md$/, "");
		var base = p.path.split("/").pop().replace(/\.md$/, "");
		return n === slug || base === slug || n.endsWith("/" + slug);
	});
	if (!hit) return null;
	var p = hit.path;
	if (!p.endsWith(".md")) p += ".md";
	return p;
}

// ===== 分类候选项（datalist）=====
function populateCategoryOptions() {
	var dl = $("pe-f-cat-list");
	if (!dl) return;
	var counts = {};
	state.seed.forEach(function (p) {
		var c = p.category ? String(p.category).trim() : "";
		if (!c) return;
		counts[c] = (counts[c] || 0) + 1;
	});
	dl.innerHTML = Object.keys(counts).sort(function (a, b) {
		return counts[b] - counts[a] || a.localeCompare(b, "zh");
	}).map(function (n) { return '<option value="' + escHtml(n) + '"></option>'; }).join("");
}

// ===== 标签三连框 =====
function populateTagOptions() {
	var counts = {};
	state.seed.forEach(function (p) {
		(p.tags || []).forEach(function (t) {
			t = String(t).trim();
			if (!t) return;
			counts[t] = (counts[t] || 0) + 1;
		});
	});
	state._tagPool = Object.keys(counts).sort(function (a, b) {
		return counts[b] - counts[a] || a.localeCompare(b, "zh");
	});
	state._tagCounts = counts;
	renderTagPool();
}
function renderTagPool() {
	var pool = $("pe-tags-pool"); if (!pool) return;
	var sel = state._tagChips || [];
	pool.innerHTML = (state._tagPool || []).map(function (t) {
		var isSel = sel.indexOf(t) >= 0;
		var cnt = state._tagCounts ? state._tagCounts[t] : 0;
		return "<button type=\"button\" class=\"pe-tags3-pool-item" + (isSel ? " is-selected" : "") +
			"\" data-tag=\"" + escHtml(t) + "\"" + (isSel ? " disabled" : "") + ">" +
			escHtml(t) + "<span class=\"pe-tags3-pool-count\">" + cnt + "</span></button>";
	}).join("");
}
function renderTags() {
	var box = $("pe-tags-selected"); if (!box) return;
	box.innerHTML = (state._tagChips || []).map(function (t) {
		return "<span class=\"pe-tags3-selected-item\" data-tag=\"" + escHtml(t) + "\">" + escHtml(t) +
			"<button type=\"button\" class=\"pe-tags3-remove-btn\" aria-label=\"移除标签 " + escHtml(t) + "\">×</button></span>";
	}).join("");
	var hidden = $("pe-f-tags"); if (hidden) hidden.value = (state._tagChips || []).join(", ");
	renderTagPool();
}
function setTags(arr) {
	state._tagChips = [];
	(arr || []).forEach(function (t) {
		t = String(t || "").trim();
		if (t && state._tagChips.indexOf(t) === -1) state._tagChips.push(t);
	});
	renderTags();
}
function addTag(t) {
	t = String(t || "").trim();
	if (!t) return;
	if (!state._tagChips) state._tagChips = [];
	if (state._tagChips.indexOf(t) >= 0) return;
	state._tagChips.push(t);
	renderTags();
}
function removeTag(t) {
	if (!state._tagChips) return;
	var i = state._tagChips.indexOf(t);
	if (i >= 0) { state._tagChips.splice(i, 1); renderTags(); }
}
function bindTags() {
	var inp = $("pe-tag-input");
	var pool = $("pe-tags-pool");
	var selected = $("pe-tags-selected");
	var addBtn = $("pe-tag-add-btn");
	function tryAdd() {
		var v = (inp.value || "").trim();
		if (v) { addTag(v); inp.value = ""; }
	}
	inp?.addEventListener("keydown", function (e) {
		if (e.key === "Enter" || e.key === ",") { e.preventDefault(); tryAdd(); }
		else if (e.key === "Backspace" && !inp.value && state._tagChips && state._tagChips.length) {
			removeTag(state._tagChips[state._tagChips.length - 1]);
		}
	});
	addBtn?.addEventListener("click", function (e) { e.preventDefault(); tryAdd(); });
	pool?.addEventListener("click", function (e) {
		var btn = e.target.closest(".pe-tags3-pool-item");
		if (!btn || btn.disabled) return;
		addTag(btn.dataset.tag);
	});
	selected?.addEventListener("click", function (e) {
		var btn = e.target.closest(".pe-tags3-remove-btn");
		if (!btn) return;
		var item = btn.closest(".pe-tags3-selected-item");
		if (item) removeTag(item.dataset.tag);
	});
}

// ===== 加载远端（GitHub tree）=====
async function loadRemote() {
	var token = getPat();
	if (!token) { setStatus($("pe-editor-status"), "请先验证 GitHub PAT", "is-error"); return; }
	setStatus($("pe-editor-status"), "正在从 GitHub 加载文章树...", "");
	try {
		var r = await fetch(API_TREE_URL, { headers: { Accept: "application/vnd.github+json", Authorization: "Bearer " + token } });
		if (!r.ok) { var e = await r.json().catch(function(){return{};}); throw new Error("加载失败 " + r.status + "：" + (e.message || r.statusText)); }
		var data = await r.json();
		var posts = (data.tree || [])
			.filter(function (n) { return n.path.startsWith("src/content/posts/") && n.path.endsWith(".md"); })
			.map(function (n) {
				var rel = n.path.slice("src/content/posts/".length);
				var parts = rel.split("/");
				var folder = parts.length > 1 ? parts[0] : "";
				var slug = parts[parts.length - 1].replace(/\.md$/, "");
				return { path: n.path, folder: folder, slug: slug, title: slug, sha: n.sha, published: "", pinned: false, draft: false };
			});
		var seedMap = {};
		state.seed.forEach(function (s) { seedMap[s.path] = s; });
		posts.forEach(function (p) {
			var s = seedMap[p.path];
			if (s) { p.title = s.title; p.published = s.published; p.pinned = s.pinned; p.draft = s.draft; p.category = s.category; }
		});
		state.posts = posts;
		setStatus($("pe-editor-status"), "已加载 " + posts.length + " 篇", "is-ok");
		renderSessionState();
		renderCatalog();
		if (state.pendingEditSlug) {
			var target = state.pendingEditSlug;
			var match = posts.find(function (p) {
				var n = (p.path || "").replace(/^src\/content\/posts\//, "").replace(/\.md$/, "");
				var base = p.path.split("/").pop().replace(/\.md$/, "");
				return n === target || base === target || n.endsWith("/" + target);
			});
			if (match) { state.pendingEditSlug = null; openEditor(match.path); }
			else { setStatus($("pe-editor-status"), "⚠️ 未找到 slug 为「" + target + "」的文章", "is-error"); state.pendingEditSlug = null; }
		}
	} catch (e) {
		setStatus($("pe-editor-status"), "❌ " + e.message, "is-error");
	}
}

// ===== 视图切换 =====
function showListView() {
	var list = $("pe-list-view"); if (list) list.hidden = false;
	var ed = $("pe-editor"); if (ed) ed.hidden = true;
	renderCatalog();
	try { history.replaceState(null, "", location.pathname); } catch(_e) {}
}
function showEditorView() {
	var list = $("pe-list-view"); if (list) list.hidden = true;
	var ed = $("pe-editor"); if (ed) ed.hidden = false;
}

// ===== 打开编辑器 / 编辑某篇 =====
async function restorePostDraft(path) {
	if (typeof getDraft !== "function") return;
	var d = await getDraft("posts", path);
	if (!d || !d.files || !d.files.length || d.files[0].delete) return;
	var raw = base64ToUtf8(d.files[0].content || "");
	var sp = splitFrontmatter(raw);
	var fm = parseFm(sp.fm);
	fillForm(fm, sp.body, path);
	setStatus($("pe-editor-status"), "⚠️ 已载入本地未上传草稿（覆盖远程内容）", "is-ok");
}
async function restoreNewPostDraft() {
	var all = await getDrafts("posts");
	var savedPaths = state.posts.map(function (p) { return p.path; });
	var draft = all.find(function (d) { return savedPaths.indexOf(d.id) < 0 && d.files && d.files[0] && !d.files[0].delete; });
	if (!draft) return;
	var raw = base64ToUtf8(draft.files[0].content || "");
	var sp = splitFrontmatter(raw);
	var fm = parseFm(sp.fm);
	fillForm(fm, sp.body, draft.id);
	state.isNew = true; state.editingPath = draft.id; state.originalTitle = fm.title || "";
	setStatus($("pe-editor-status"), "⚠️ 已恢复未推送的新文章草稿", "is-ok");
}
function openEditor(path) {
	showEditorView();
	renderSessionState();
	if (path) { editPost(path).then(function () { return restorePostDraft(path); }).catch(function(){}); }
	else { newPost(); restoreNewPostDraft(); }
}
function newPost() {
	showEditorView();
	state.isNew = true; state.editingPath = null; state.editingSha = null; state.originalTitle = "";
	$("pe-editor-title").textContent = "写新文章";
	clearForm();
	var t = $("pe-f-title"); if (t) setTimeout(function () { t.focus(); }, 50);
	setStatus($("pe-editor-status"), "填写信息后保存即创建新文章", "");
}
async function editPost(path) {
	state.isNew = false; state.editingPath = path;
	$("pe-editor-title").textContent = "编辑文章";
	setStatus($("pe-editor-status"), "正在拉取文章内容...", "");
	// 优先：静态全文副本（无需令牌，构建时生成于 public/posts-content/）
	try {
		var rel = path.replace(/^src\/content\/posts\//, "").replace(/\.md$/, "");
		var sr = await fetch("/posts-content/" + rel + ".md", { headers: { Accept: "text/markdown" } });
		if (sr.ok) {
			var sraw = await sr.text();
			if (sraw && sraw.trim()) {
				state.editingSha = null;
				var ssp = splitFrontmatter(sraw);
				var sfm = parseFm(ssp.fm);
				fillForm(sfm, ssp.body, path);
				state.originalTitle = sfm.title || "";
				setStatus($("pe-editor-status"), "✅ 已载入（静态副本，无需令牌）", "is-ok");
				return;
			}
		}
	} catch (_es) {}
	// 兜底：GitHub API（需要 PAT）
	var token = getPat();
	if (!token) { setStatus($("pe-editor-status"), "未找到静态副本，请验证 GitHub PAT", "is-error"); return; }
	try {
		var r = await fetch(API_CONTENT(path), { headers: { Accept: "application/vnd.github+json", Authorization: "Bearer " + token } });
		if (!r.ok) { var e = await r.json().catch(function(){return{};}); throw new Error("拉取失败 " + r.status + "：" + (e.message || r.statusText)); }
		var file = await r.json();
		state.editingSha = file.sha;
		var raw = base64ToUtf8(file.content || "");
		var sp = splitFrontmatter(raw);
		var fm = parseFm(sp.fm);
		fillForm(fm, sp.body, path);
		state.originalTitle = fm.title || "";
		setStatus($("pe-editor-status"), "✅ 已载入", "is-ok");
	} catch (e) {
		setStatus($("pe-editor-status"), "❌ " + e.message, "is-error");
	}
}
function fillForm(fm, body, path) {
	$("pe-f-title").value = fm.title || "";
	var rel = (path || "").replace(/^src\/content\/posts\//, "").replace(/\.md$/, "");
	var segs = rel.split("/");
	$("pe-f-slug").value = segs[segs.length - 1] || "";
	$("pe-f-cat").value = fm.category || "";
	$("pe-f-desc").value = fm.description || "";
	$("pe-f-cover-preview").value = fm.coverPreview || "";
	setTags(Array.isArray(fm.tags) ? fm.tags : []);
	$("pe-f-pub").value = (fm.published || "").slice(0, 10);
	$("pe-f-cover").value = fm.image || "";
	$("pe-f-pinned").checked = fm.pinned === true;
	$("pe-f-draft").checked = fm.draft === true;
	$("pe-f-body").value = body || "";
	autoSizeTitle(); updateCharCount();
}
function clearForm() {
	["pe-f-title","pe-f-slug","pe-f-cat","pe-f-desc","pe-f-cover","pe-f-cover-preview","pe-f-body"].forEach(function (id) {
		if ($(id)) $(id).value = "";
	});
	setTags([]);
	$("pe-f-pub").value = nowDate();
	$("pe-f-pinned").checked = false;
	$("pe-f-draft").checked = false;
	autoSizeTitle(); updateCharCount();
}

// ===== 分类目录自动派生（保留旧逻辑，用以生成保存路径）=====
function deriveFolder(category) {
	var cat = (category || "").trim();
	if (!cat) return "others";
	var folderCount = {};
	state.seed.forEach(function (p) {
		if (p.category && String(p.category).trim() === cat && p.folder) {
			folderCount[p.folder] = (folderCount[p.folder] || 0) + 1;
		}
	});
	var folders = Object.keys(folderCount);
	if (folders.length > 0) {
		folders.sort(function (a, b) { return folderCount[b] - folderCount[a]; });
		return folders[0];
	}
	if (/项目|实践/.test(cat)) return "projects";
	if (/AI|部署|技术|设计/.test(cat)) return "ai";
	return "others";
}

// ===== 收集表单 =====
function collectForm() {
	var title = ($("pe-f-title").value || "").trim();
	var slugRaw = ($("pe-f-slug").value || "").trim();
	var slug = slugRaw || slugify(title);
	var fm = {
		title: title,
		description: ($("pe-f-desc").value || "").trim(),
		category: ($("pe-f-cat").value || "").trim(),
		tags: (state._tagChips || []).slice(),
		published: (($("pe-f-pub").value || nowDate())).slice(0, 10),
		image: ($("pe-f-cover").value || "").trim(),
		pinned: !!($("pe-f-pinned") && $("pe-f-pinned").checked),
		draft: !!($("pe-f-draft") && $("pe-f-draft").checked),
	};
	var cp = ($("pe-f-cover-preview").value || "").trim();
	if (cp) fm.coverPreview = cp;
	var body = $("pe-f-body").value || "";
	var folder = deriveFolder(fm.category);
	var path = "src/content/posts/" + (folder && folder !== "others" ? folder + "/" : "") + slug + ".md";
	return { fm: fm, body: body, path: path, folder: folder, slug: slug };
}

// ===== 保存草稿（本地）=====
async function saveDraftLocal() {
	if (state.saving) return;
	state.saving = true;
	try {
		var c = collectForm();
		if (!c.fm.title) throw new Error("标题不能为空");
		var content = utf8ToBase64(buildMarkdown(c.fm, c.body));
		var files = [{ path: c.path, content: content, sha: state.editingSha || null }];
		var pathChanged = !state.isNew && c.path !== state.editingPath;
		if (pathChanged && state.editingPath) { files.push({ path: state.editingPath, delete: true }); }
		await putDraft({ feature: "posts", id: c.path, label: c.fm.title + (c.fm.draft ? "（草稿）" : ""), files: files });
		state.editingPath = c.path; state.isNew = false; state.originalTitle = c.fm.title;
		var t = new Date();
		var hh = String(t.getHours()).padStart(2, "0"), mm = String(t.getMinutes()).padStart(2, "0"), ss = String(t.getSeconds()).padStart(2, "0");
		setStatus($("pe-editor-status"), "✅ 已存为本地草稿（" + hh + ":" + mm + ":" + ss + "）· 待上传中心推送", "is-ok");
		refreshLocalPost(c);
	} catch (e) {
		setStatus($("pe-editor-status"), "❌ " + e.message, "is-error");
	} finally {
		state.saving = false;
	}
}
function refreshLocalPost(c) {
	var idx = state.posts.findIndex(function (p) { return p.path === c.path; });
	var item = { path: c.path, folder: c.folder, slug: c.slug, title: c.fm.title, sha: state.editingSha || "local", published: c.fm.published, pinned: c.fm.pinned, draft: c.fm.draft, category: c.fm.category };
	if (idx >= 0) state.posts[idx] = item; else state.posts.unshift(item);
	renderCatalog();
}

// ===== 发表呀 = 保存草稿 + 打开上传中心（保留我们的统一推送）=====
function openUploadCenter() {
	var trigger = document.getElementById("uc-dock-trigger");
	if (trigger) { trigger.click(); return; }
	var fab = document.getElementById("uc-fab");
	if (fab) fab.click();
}
async function publish() {
	await saveDraftLocal();
	openUploadCenter();
}

// ===== 导入 MD =====
async function importMdFile(file) {
	try {
		var text = await file.text();
		var sp = splitFrontmatter(text);
		var fm = parseFm(sp.fm);
		fillForm(fm, sp.body, "");
		state.isNew = true; state.editingPath = null; state.editingSha = null;
		setStatus($("pe-editor-status"), "✅ 已导入本地 .md", "is-ok");
	} catch (e) {
		setStatus($("pe-editor-status"), "❌ 导入失败：" + e.message, "is-error");
	}
}

// ===== 事件绑定 =====
var _peBound = new WeakSet();
function bind() {
	var root = $("pe-editor"); if (root && _peBound.has(root)) return;
	if (!root) return;

	// 工具栏 6 按钮
	$("pe-toolbar-back")?.addEventListener("click", showListView);
	$("pe-new-post")?.addEventListener("click", function () { newPost(); try { history.replaceState(null, "", location.pathname); } catch(_e) {} });
	$("pe-toolbar-key")?.addEventListener("click", function () {
		// fqzlr 式：点击直接弹出文件选择器，选择密钥文件（.txt/.pem）一键导入，免手动粘贴
		var fi = $("pe-pat-file");
		if (fi) { fi.value = ""; fi.click(); }
	});
	// 密钥文件选择 → 读取文本 → 校验 → 写入会话
	$("pe-pat-file")?.addEventListener("change", async function (e) {
		var f = e.target.files && e.target.files[0];
		if (!f) return;
		var status = $("pe-editor-status");
		setStatus(status, "正在读取密钥文件…", "");
		try {
			var text = (await f.text()).trim();
			if (!text) { setStatus(status, "❌ 文件内容为空", "is-error"); return; }
			setStatus(status, "正在验证密钥…", "");
			await validatePat(text);
			setPat(text);
			renderSessionState();
			var p = $("pe-pat-panel"); if (p) p.hidden = true;
			var inp = $("pe-editor-pat"); if (inp) inp.value = "";
			setStatus(status, "✅ 密钥已导入并验证", "is-ok");
			if (state && state.pendingEditSlug) { await loadRemote(); }
		} catch (err) {
			setPat("");
			renderSessionState();
			setStatus(status, "❌ " + (err && err.message ? err.message : "导入失败"), "is-error");
		} finally {
			e.target.value = "";
		}
	});
	// 「或手动粘贴」链接：打开/收起手动粘贴面板（兜底）
	$("pe-pat-manual-link")?.addEventListener("click", function (e) {
		e.preventDefault();
		var p = $("pe-pat-panel"); if (!p) return;
		p.hidden = !p.hidden;
		if (!p.hidden) { var inp = $("pe-editor-pat"); if (inp) inp.focus(); }
	});
	$("pe-toolbar-save")?.addEventListener("click", function () { saveDraftLocal(); });
	$("pe-toolbar-publish")?.addEventListener("click", function () { publish(); });
	$("pe-toolbar-import-md")?.addEventListener("click", function () { $("pe-md-import")?.click(); });
	$("pe-toolbar-preview")?.addEventListener("click", togglePreview);

	// PAT 面板
	$("pe-editor-pat")?.addEventListener("input", function () {
		if (sessionStorage.getItem(PAT_STORAGE_KEY)) { sessionStorage.removeItem(PAT_STORAGE_KEY); renderSessionState(); }
	});
	$("pe-editor-pat-toggle")?.addEventListener("click", function () {
		var inp = $("pe-editor-pat"); if (!inp) return; inp.type = inp.type === "password" ? "text" : "password";
	});
	$("pe-editor-pat-validate")?.addEventListener("click", async function () {
		var inp = $("pe-editor-pat");
		if (!inp || !inp.value.trim()) { setStatus($("pe-editor-status"), "请先填写 GitHub PAT", "is-error"); return; }
		this.disabled = true; setStatus($("pe-editor-status"), "正在校验令牌...", "");
		try {
			await validatePat(inp.value.trim());
			setPat(inp.value.trim());
			renderSessionState();
			setStatus($("pe-editor-status"), "✓ 令牌有效", "is-ok");
			if (state.pendingEditSlug) { await loadRemote(); }
		} catch (e) { setStatus($("pe-editor-status"), "✗ " + e.message, "is-error"); }
		finally { this.disabled = false; }
	});
	$("pe-editor-pat-clear")?.addEventListener("click", function () {
		if (!confirm("确定退出本次浏览会话（清除已验证的令牌）？")) return;
		setPat(""); var inp = $("pe-editor-pat"); if (inp) inp.value = "";
		setStatus($("pe-editor-status"), "已退出会话", "is-ok"); renderSessionState();
	});

	// 字段
	$("pe-f-title")?.addEventListener("input", autoSizeTitle);
	$("pe-f-body")?.addEventListener("input", function () { updateCharCount(); schedulePreview(); });

	// 图片上传
	$("pe-img-pick")?.addEventListener("click", function () { $("pe-img-file")?.click(); });
	$("pe-img-file")?.addEventListener("change", handleImgUpload);

	// Markdown 工具栏
	var mdTb = document.querySelector(".pe-md-toolbar");
	mdTb?.addEventListener("click", function (e) {
		var btn = e.target.closest(".pe-md-tb");
		if (!btn) return;
		var act = btn.getAttribute("data-md");
		if (act) mdAction(act);
	});
	$("pe-f-body")?.addEventListener("keydown", function (e) {
		if (!(e.ctrlKey || e.metaKey)) return;
		var k = e.key.toLowerCase();
		if (k === "b") { e.preventDefault(); mdAction("bold"); }
		else if (k === "i") { e.preventDefault(); mdAction("italic"); }
		else if (k === "k") { e.preventDefault(); mdAction("link"); }
		else if (k === "s") { e.preventDefault(); saveDraftLocal(); }
	});

	// 导入 MD
	$("pe-md-import")?.addEventListener("change", function (e) {
		var f = e.target.files && e.target.files[0];
		if (f) importMdFile(f);
		e.target.value = "";
	});

	// 列表委托（点击 catalog item 打开编辑）
	var catalog = $("pe-root").querySelector("[data-pe-catalog]");
	catalog?.addEventListener("click", function (e) {
		var item = e.target.closest(".pe-catalog-item");
		if (!item) return;
		var path = item.getAttribute("data-pe-edit");
		if (path) {
			openEditor(path);
			try {
				var slug = path.replace(/^src\/content\/posts\//, "").replace(/\.md$/, "");
				history.replaceState(null, "", "?edit=" + encodeURIComponent(slug));
			} catch(_e) {}
		}
	});

	populateCategoryOptions();
	populateTagOptions();
	bindTags();
	if (root) _peBound.add(root);
}

// ===== 初始化 =====
function init() {
	state.seed = window.__peSeed || [];
	state.posts = state.seed.map(function (s) {
		return { path: s.path, folder: s.folder, slug: s.slug, title: s.title, published: s.published, pinned: s.pinned, draft: s.draft, category: s.category, sha: "" };
	});
	try {
		var qp = new URLSearchParams(location.search);
		var editSlug = qp.get("edit");
		if (editSlug) state.pendingEditSlug = editSlug;
	} catch (_e) {}
	if (state.pendingEditSlug) {
		var seedPath = findBySlug(state.pendingEditSlug);
		if (seedPath) {
			state.pendingEditSlug = null;
			showEditorView();
			openEditor(seedPath);
		} else {
			// 找不到时显示列表 + 提示（不弹 PAT 面板）
			showListView();
			setStatus($("pe-editor-status"), "请先验证 GitHub PAT 后会自动加载「" + state.pendingEditSlug + "」", "is-error");
		}
	} else {
		showListView();
	}
	renderSessionState();
	updateCharCount();
}

// ===== 引导入口（由 Layout 持久化脚本在首屏与每次 Swup 切换后调用）=====
export async function bootPostEditor() {
	var root = document.getElementById("pe-editor");
	if (!root) return;
	IMGBED_URL = root.getAttribute("data-imgbed-url") || "";
	IMGBED_AUTH = root.getAttribute("data-imgbed-auth") || "";
	IMGBED_API_TOKEN = root.getAttribute("data-imgbed-token") || "";
	if (!window.__peSeed) {
		try {
			var mod = await import("@/data/posts-index");
			window.__peSeed = mod.postsIndex;
		} catch (_e) { window.__peSeed = []; }
	}
	init();
	bind();
}
