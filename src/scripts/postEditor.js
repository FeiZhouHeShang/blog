// 文章前端编辑器引导（持久化模块，由 Layout 在每次导航后调用）
// 原始逻辑来自 posts-editor.astro 的内联脚本；此处改为模块，保证 Swup 软导航后仍能重新初始化。

import { putDraft, getDraft, getDrafts, deleteDraft } from "@/scripts/draftStore";

let IMGBED_URL = "";
let IMGBED_AUTH = "";
let IMGBED_API_TOKEN = "";

		var $ = function (id) { return document.getElementById(id); };
		var REPO = "FeiZhouHeShang/blog";
		var API_TREE_URL = "https://api.github.com/repos/" + REPO + "/git/trees/main?recursive=1";
		var API_CONTENT = function (p) { return "https://api.github.com/repos/" + REPO + "/contents/" + p + "?ref=main"; };
		var IMGBED_POST_DIR_PREFIX = "文章";
		var PAT_STORAGE_KEY = "__pe_session_pat__";

		// 图床配置（构建时注入）
		
		// ===== 状态 =====
		var state = {
			posts: [],          // { path, folder, slug, title, sha, ...meta }
			editingPath: null,  // 正在编辑的文件仓库路径（null=新建）
			editingSha: null,   // 文件 blob sha（新建为 null）
			originalTitle: "",  // 编辑前的标题（用于变更提示）
			isNew: true,
			saving: false,
			pendingEditSlug: null,
			originalSnapshot: null, // URL ?edit=<slug>：文章详情页「编辑当前文章」跳转携带的目标 slug
			// 一键恢复：冻结载入时的「原始内容」与原始路径，供恢复到修改前
			_originalRaw: null,
			_originalPath: null,
		};
		// 图片去重：本次会话已上传哈希 -> URL
		var uploadedHashes = {};

		// ===== 工具 =====
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
		function utf8ToBase64(str) {
			return btoa(unescape(encodeURIComponent(str)));
		}
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
		// ===== 编辑器辅助函数（抽模块时遗漏，此处补全）=====
		function autoSizeTitle() {
			var ta = $("pe-f-title");
			if (!ta) return;
			ta.style.height = "auto";
			ta.style.height = (ta.scrollHeight || ta.clientHeight) + "px";
		}
		function autoSlugFromTitle() {
			var t = ($("pe-f-title").value || "").trim();
			var sl = slugify(t);
			if (t && !/[a-z0-9]/i.test(t)) $("pe-f-slug").value = sl;
		}
		function showTitleWarn(msg) { var w = $("pe-title-warn"); if (w) { w.textContent = msg; w.style.display = ""; } }
		function hideTitleWarn() { var w = $("pe-title-warn"); if (w) w.style.display = "none"; }
		function updateCharCount() {
			var ta = $("pe-f-body");
			var el = $("pe-char-count");
			if (!ta || !el) return;
			el.textContent = (ta.value || "").length + " 字";
		}
		var _previewTimer = null;
		function renderPreview() {
			var ta = $("pe-f-body");
			var box = $("pe-preview");
			if (!ta || !box || box.hidden) return;
			var md = ta.value || "";
			fetch("/api/render-preview/", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ markdown: md }),
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
			var box = $("pe-preview");
			if (!box) return;
			box.hidden = !box.hidden;
			if (!box.hidden) renderPreview();
		}
		async function importMdFile(file) {
			try {
				var text = await file.text();
				var sp = splitFrontmatter(text);
				var fm = parseFm(sp.fm);
				fillForm(fm, sp.body, "");
				state.isNew = true; state.editingPath = null; state.editingSha = null;
				hideTitleWarn();
				setStatus($("pe-editor-foot-status"), "✅ 已导入本地 .md", "is-ok");
			} catch (e) {
				setStatus($("pe-editor-foot-status"), "❌ 导入失败：" + e.message, "is-error");
			}
		}
		function mdAction(act) {
			var ta = $("pe-f-body");
			if (!ta) return;
			var start = ta.selectionStart, end = ta.selectionEnd;
			var sel = ta.value.slice(start, end);
			var before = ta.value.slice(0, start), after = ta.value.slice(end);
			function set(newVal, sStart, sEnd) {
				ta.value = before + newVal + after;
				ta.selectionStart = sStart; ta.selectionEnd = sEnd;
				ta.focus();
				updateCharCount(); schedulePreview(); onEdit();
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
				default: break;
			}
		}


		// ===== 会话令牌 =====
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
			if (!chip) return;
			if (getPat()) { chip.textContent = "🔓 本次浏览已验证"; chip.className = "pe-session-chip is-ok"; }
			else { chip.textContent = "🔒 未验证"; chip.className = "pe-session-chip is-lock"; }
		}

		// ===== 图床上传 =====
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
		async function hashFile(file) {
			try {
				var buf = await file.arrayBuffer();
				var digest = await crypto.subtle.digest("SHA-256", buf);
				return Array.from(new Uint8Array(digest)).map(function (b) { return b.toString(16).padStart(2, "0"); }).join("");
			} catch (_e) { return ""; }
		}
		async function uploadToImgbed(file, folder) {
			var fd = new FormData();
			fd.append("file", file);
			var base = (IMGBED_URL || "").replace(/\/+$/, "");
			var url = base + "/upload?returnFormat=full&uploadNameType=origin";
			if (folder) url += "&uploadFolder=" + encodeURIComponent(folder);
			var headers = { Accept: "application/json" };
			// 单令牌（list+upload）优先 Bearer；否则 authCode 兜底
			if (IMGBED_API_TOKEN) headers["Authorization"] = "Bearer " + IMGBED_API_TOKEN;
			else if (IMGBED_AUTH) url += "&authCode=" + encodeURIComponent(IMGBED_AUTH);
			var r = await fetch(url, { method: "POST", body: fd, headers: headers });
			if (!r.ok) throw new Error("图床上传失败 " + r.status);
			var data = await r.json().catch(function () { return null; });
			var u = extractImgUrl(data);
			if (!u) throw new Error("无法从图床响应解析图片 URL");
			return u;
		}
		// ===== 方案 A：直传 GitHub 仓库（本地加载）=====
		// folder 对应站点资源目录：文章 → "文章/<标题>"
		// 上传目标：public/assets/images/<folder>/<filename> → 运行期 URL /assets/images/<folder>/<filename>
		async function uploadToRepo(file, folder) {
			var token = getPat();
			if (!token) throw new Error("请先在顶部「验证令牌」后再上传到仓库");
			var dotIdx = file.name.lastIndexOf(".");
			var rawExt = dotIdx > 0 ? file.name.slice(dotIdx + 1) : "";
			var ext = rawExt.toLowerCase().replace(/[^a-z0-9]/g, "");
			var rawBase = dotIdx > 0 ? file.name.slice(0, dotIdx) : file.name;
			var base = rawBase.replace(/[^a-z0-9\u4e00-\u9fa5_-]/gi, "-").replace(/^-+|-+$/g, "") || "img";
			base = base.slice(0, 48);
			var filename = base + (ext ? "." + ext : "");
			// 重名则追加短随机后缀（GitHub PUT 无「不存在才创建」语义）
			var repoPath = "public/assets/images/" + folder + "/" + filename;
			var apiUrl = "https://api.github.com/repos/" + REPO + "/contents/" + repoPath + "?ref=main";
			try {
				var headR = await fetch(apiUrl, { headers: { Accept: "application/vnd.github+json", Authorization: "Bearer " + token } });
				if (headR.ok) {
					filename = base + "-" + Math.random().toString(36).slice(2, 8) + (ext ? "." + ext : "");
					repoPath = "public/assets/images/" + folder + "/" + filename;
					apiUrl = "https://api.github.com/repos/" + REPO + "/contents/" + repoPath + "?ref=main";
				}
			} catch (_e) { /* 网络异常交由下方 PUT 抛错 */ }
			// 文件 → base64（分块避免超大字符串 apply 参数上限）
			var buf = await file.arrayBuffer();
			var bytes = new Uint8Array(buf);
			var b64 = "";
			var chunk = 0x8000;
			for (var p = 0; p < bytes.length; p += chunk) {
				b64 += String.fromCharCode.apply(null, bytes.subarray(p, p + chunk));
			}
			b64 = btoa(b64);
			var r = await fetch(apiUrl, {
				method: "PUT",
				headers: { Accept: "application/vnd.github+json", Authorization: "Bearer " + token, "Content-Type": "application/json" },
				body: JSON.stringify({
					message: "chore(assets): upload " + filename + " via post editor (Option A)",
					content: b64,
					branch: "main",
				}),
			});
			if (!r.ok) { var err = await r.json().catch(function () { return {}; }); throw new Error("仓库上传失败 " + r.status + "：" + (err.message || r.statusText)); }
			return "/assets/images/" + folder + "/" + filename;
		}
		async function handleImgUpload() {
			var fileInput = $("pe-img-file");
			if (!fileInput || !fileInput.files || !fileInput.files.length) return;
			var title = ($("pe-f-title").value || "").trim();
			if (!title) { setStatus($("pe-img-tip"), "⚠️ 请先填写标题，图片才能归到 /文章/<标题>/ 目录", "is-error"); return; }
			var folder = IMGBED_POST_DIR_PREFIX + "/" + title;
			// 方案 A：上传目标（图床 / 仓库本地）
			var chRadio = document.querySelector('input[name="pe-channel"]:checked');
			var channel = (chRadio && chRadio.value) || "imgbed";
			var verb = channel === "repo" ? "仓库" : "图床";
			var files = Array.from(fileInput.files);
			var tip = $("pe-img-tip");
			var done = 0, reused = 0;
			setStatus(tip, "上传中 0/" + files.length, "");
			try {
				for (var i = 0; i < files.length; i++) {
					var file = files[i];
					var h = await hashFile(file);
					if (h && uploadedHashes[h]) {
						insertImageMarkdown(uploadedHashes[h]);
						reused++; setStatus(tip, "复用 " + reused + " · 上传 " + done + "/" + files.length, "is-ok");
						continue;
					}
					var url = channel === "repo" ? await uploadToRepo(file, folder) : await uploadToImgbed(file, folder);
					if (h) uploadedHashes[h] = url;
					insertImageMarkdown(url);
					done++; setStatus(tip, "上传 " + done + "/" + files.length + (reused ? " · 复用 " + reused : ""), "is-ok");
				}
				setStatus(tip, "已上传 " + done + " 张到" + verb + (reused ? " · 复用 " + reused + " 张" : "") + (channel === "repo" ? "（本地加载）" : ""), "is-ok");
			} catch (e) {
				setStatus(tip, "❌ " + e.message, "is-error");
			} finally {
				fileInput.value = "";
			}
		}
		function insertImageMarkdown(url) {
			var ta = $("pe-f-body");
			if (!ta) return;
			var md = "\n![](" + url + ")\n";
			var start = ta.selectionStart || ta.value.length;
			ta.value = ta.value.slice(0, start) + md + ta.value.slice(start);
			ta.focus();
			ta.selectionStart = ta.selectionEnd = start + md.length;
		}

		// ===== 读取现有文章 =====
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

		// ===== 渲染列表 =====
		function renderList() {
			var listEl = $("pe-root").querySelector("[data-pe-list]");
			if (!listEl) return;
			listEl.innerHTML = state.posts.map(function (p) {
				var badges = '<span class="pe-badge">' + escHtml(p.folder) + "</span>" +
					(p.pinned ? '<span class="pe-badge pe-badge-pin">📌 置顶</span>' : "") +
					(p.draft ? '<span class="pe-badge pe-badge-draft">草稿</span>' : "") +
					'<span class="pe-item-date">' + escHtml(p.published || "") + "</span>";
				return '<article class="pe-item" data-pe-item="" data-path="' + escHtml(p.path) + '">' +
					'<div class="pe-item-main"><div class="pe-item-title">' + escHtml(p.title || p.slug) + "</div>" +
					'<div class="pe-item-meta">' + badges + "</div></div>" +
					'<div class="pe-item-actions">' +
					'<button type="button" class="pe-btn pe-btn-edit" data-pe-edit="' + escHtml(p.path) + '">编辑</button>' +
					'<button type="button" class="pe-btn pe-btn-del" data-pe-del="' + escHtml(p.path) + '">删除</button>' +
					'<a href="https://github.com/' + REPO + "/edit/main/" + encodeURIComponent(p.path) + '" target="_blank" rel="noopener noreferrer" class="pe-btn pe-btn-ghost">GitHub</a>' +
					"</div></article>";
			}).join("");
			var empty = $("pe-root").querySelector("[data-pe-empty]");
			if (empty) empty.style.display = state.posts.length === 0 ? "" : "none";
		}

		// 按 slug 在种子索引中定位文章路径（兼容 folder/slug 与纯 slug）
		function findBySlug(slug) {
			var hit = (state.posts || []).find(function (p) {
				var n = (p.path || "").replace(/^src\/content\/posts\//, "").replace(/\.md$/, "");
				var base = p.path.split("/").pop().replace(/\.md$/, "");
				return n === slug || base === slug || n.endsWith("/" + slug);
			});
			if (!hit) return null;
			var p = hit.path;
			if (!p.endsWith(".md")) p += ".md";
			return p;
		}

		// ===== 分类目录自动派生 =====
		// 规则：① state.seed 中该分类出现最多的 folder 胜出 ② 否则按 category 关键词兜底
		function deriveFolder(category) {
			var cat = (category || "").trim();
			if (!cat) return "others";
			var seed = state.seed || [];
			var folderCount = {};
			seed.forEach(function (p) {
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
		function deriveAndShowFolder(category, fallbackPathFolder) {
			var f = deriveFolder(category) || fallbackPathFolder || "others";
			$("pe-f-folder").value = f;
			var fn = $("pe-f-folder-name"); if (fn) fn.textContent = f;
			var fh = $("pe-f-folder-hint");
			if (fh) {
				if (!category) fh.textContent = "（选择分类后自动匹配）";
				else fh.textContent = "（从分类「" + category + "」自动匹配）";
			}
		}

		// ===== 分类 combo-box（现有 + 新建） =====
		function populateCategoryOptions() {
			var menu = document.querySelector("[data-combo-for='pe-f-cat'] .pe-combo-menu");
			if (!menu) return;
			var counts = {};
			(state.seed || []).forEach(function (p) {
				var c = p.category ? String(p.category).trim() : "";
				if (!c) return;
				counts[c] = (counts[c] || 0) + 1;
			});
			var names = Object.keys(counts).sort(function (a, b) {
				return counts[b] - counts[a] || a.localeCompare(b, "zh");
			});
			menu.innerHTML = "";
			if (names.length === 0) {
				var li0 = document.createElement("li");
				li0.className = "pe-combo-empty";
				li0.textContent = "（暂无现成分类，输入即新建）";
				menu.appendChild(li0);
			} else {
				names.forEach(function (n) {
					var li = document.createElement("li");
					li.setAttribute("role", "option");
					li.dataset.value = n;
					li.innerHTML = "<span>" + escHtml(n) + "</span><span class='pe-combo-count'>" + counts[n] + "</span>";
					menu.appendChild(li);
				});
			}
			var liNew = document.createElement("li");
			liNew.className = "pe-combo-create";
			liNew.setAttribute("role", "option");
			liNew.dataset.action = "create";
			liNew.textContent = "＋ 新建分类（直接输入回车）";
			menu.appendChild(liNew);
		}
		function setCategory(v) {
			var inp = $("pe-f-cat");
			if (inp) inp.value = v || "";
		}
		function bindCategoryCombo() {
			var wrap = document.querySelector("[data-combo-for='pe-f-cat']");
			if (!wrap) return;
			var inp = wrap.querySelector(".pe-combo-input");
			var menu = wrap.querySelector(".pe-combo-menu");
			var toggle = wrap.querySelector(".pe-combo-toggle");
			function open() { menu.hidden = false; }
			function close() { menu.hidden = true; }
			function isOpen() { return !menu.hidden; }
			function syncFromInput() {
				setCategory(inp.value);
				deriveAndShowFolder(inp.value);
			}
			inp?.addEventListener("focus", function () { populateCategoryOptions(); open(); });
			inp?.addEventListener("input", syncFromInput);
			inp?.addEventListener("blur", function () {
				// 延迟关闭，让点击菜单项能触发
				setTimeout(function () { close(); }, 150);
			});
			inp?.addEventListener("keydown", function (e) {
				if (e.key === "Enter") { e.preventDefault(); close(); }
				else if (e.key === "Escape") { close(); inp.blur(); }
				else if (e.key === "ArrowDown" && !isOpen()) { e.preventDefault(); open(); }
			});
			toggle?.addEventListener("click", function (e) {
				e.preventDefault();
				if (isOpen()) { close(); } else { populateCategoryOptions(); open(); inp.focus(); }
			});
			menu?.addEventListener("mousedown", function (e) { e.preventDefault(); }); // 阻止 blur
			menu?.addEventListener("click", function (e) {
				var li = e.target.closest("li[data-value], li[data-action]");
				if (!li) return;
				if (li.dataset.action === "create") {
					inp.focus();
					return;
				}
				var v = li.dataset.value || "";
				inp.value = v;
				setCategory(v);
				deriveAndShowFolder(v);
				close();
			});
		}

		// ===== 标签三连框：① 已有（点击加）② 新建（回车/+ 加）③ 已选（点 × 减） =====
		function populateTagOptions() {
			var counts = {};
			(state.seed || []).forEach(function (p) {
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
			var pool = $("pe-tags-pool");
			if (!pool) return;
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
			var box = $("pe-tags-selected");
			if (!box) return;
			box.innerHTML = (state._tagChips || []).map(function (t) {
				return "<span class=\"pe-tags3-selected-item\" data-tag=\"" + escHtml(t) + "\">" + escHtml(t) +
					"<button type=\"button\" class=\"pe-tags3-remove-btn\" aria-label=\"移除标签 " + escHtml(t) + "\">×</button></span>";
			}).join("");
			var hidden = $("pe-f-tags");
			if (hidden) hidden.value = (state._tagChips || []).join(", ");
			renderTagPool(); // 同步第一排已选/未选视觉态
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
			onEdit();
			t = String(t || "").trim();
			if (!t) return;
			if (!state._tagChips) state._tagChips = [];
			if (state._tagChips.indexOf(t) >= 0) return;
			state._tagChips.push(t);
			renderTags();
		}
		function removeTag(t) {
			onEdit();
			if (!state._tagChips) return;
			var i = state._tagChips.indexOf(t);
			if (i >= 0) { state._tagChips.splice(i, 1); renderTags(); }
		}
		function bindTags() {
			var wrap = document.querySelector("[data-tags-for='pe-f-tags']");
			if (!wrap) return;
			var inp = $("pe-tag-input");
			var pool = $("pe-tags-pool");
			var selected = $("pe-tags-selected");
			var addBtn = $("pe-tag-add-btn");
			function tryAdd() {
				var v = (inp.value || "").trim();
				if (v) { addTag(v); inp.value = ""; }
			}
			inp?.addEventListener("keydown", function (e) {
				if (e.key === "Enter" || e.key === ",") {
					e.preventDefault();
					tryAdd();
				} else if (e.key === "Backspace" && !inp.value && state._tagChips && state._tagChips.length) {
					// 光标在空输入框按退格 → 移除最后一个已选标签
					removeTag(state._tagChips[state._tagChips.length - 1]);
				}
			});
			addBtn?.addEventListener("click", function (e) { e.preventDefault(); tryAdd(); });
			// ① 已有标签池：点击未选项 → 加入已选
			pool?.addEventListener("click", function (e) {
				var btn = e.target.closest(".pe-tags3-pool-item");
				if (!btn || btn.disabled) return;
				addTag(btn.dataset.tag);
			});
			// ③ 已选标签：点 × → 移除
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
				// 用种子索引补全标题等元信息
				var seedMap = {};
				(state.seed || []).forEach(function (s) { seedMap[s.path] = s; });
				posts.forEach(function (p) { var s = seedMap[p.path]; if (s) { p.title = s.title; p.published = s.published; p.pinned = s.pinned; p.draft = s.draft; } });
				state.posts = posts;
				setStatus($("pe-editor-status"), "已加载 " + posts.length + " 篇 · SHA 树已就绪", "is-ok");
				// 页面本身就是编辑器，无列表渲染
			renderSessionState();
				// ?edit=<slug> 自动打开目标文章（从文章详情页「编辑当前文章」跳转来）
				if (state.pendingEditSlug) {
					var target = state.pendingEditSlug;
					var match = posts.find(function (p) {
						var n = (p.path || "").replace(/^src\/content\/posts\//, "").replace(/\.md$/, "");
						var base = p.path.split("/").pop().replace(/\.md$/, "");
						return n === target || base === target || n.endsWith("/" + target);
					});
					if (match) {
						state.pendingEditSlug = null;
						openEditor(match.path);
					} else {
						setStatus($("pe-editor-status"), "⚠️ 未找到 slug 为「" + target + "」的文章，请确认文件名后重试", "is-error");
						state.pendingEditSlug = null;
					}
				}
			} catch (e) {
				setStatus($("pe-editor-status"), "❌ " + e.message, "is-error");
			}
		}

		// ===== 打开编辑器 / 编辑某篇 =====
		// 载入已存在的本地草稿（覆盖刚拉取的远程内容，实现断点续编）
async function restorePostDraft(path) {
			if (typeof getDraft !== "function") return;
			var d = await getDraft("posts", path);
			if (!d || !d.files || !d.files.length || d.files[0].delete) return;
			var raw = base64ToUtf8(d.files[0].content || "");
			var sp = splitFrontmatter(raw);
			var fm = parseFm(sp.fm);
			fillForm(fm, sp.body, path);
			state._dirty = false;
			setStatus($("pe-editor-foot-status"), "⚠️ 已载入本地未上传草稿（覆盖远程内容）", "is-ok");
		}
async function restoreNewPostDraft() {
			var all = await getDrafts("posts");
			var savedPaths = (state.posts || []).map(function (p) { return p.path; });
			var draft = all.find(function (d) { return savedPaths.indexOf(d.id) < 0 && d.files && d.files[0] && !d.files[0].delete; });
			if (!draft) return;
			var raw = base64ToUtf8(draft.files[0].content || "");
			var sp = splitFrontmatter(raw);
			var fm = parseFm(sp.fm);
			fillForm(fm, sp.body, draft.id);
			state.isNew = true; state.editingPath = draft.id; state.originalTitle = fm.title || "";
			state._dirty = false;
			setStatus($("pe-editor-foot-status"), "⚠️ 已恢复未推送的新文章草稿", "is-ok");
		}
function openEditor(path) {
			var dlg = $("pe-editor");
			if (!dlg) return;
			showEditorView();
			if (typeof dlg.showModal === "function") dlg.showModal(); else dlg.setAttribute("open", "");
			renderSessionState();
			if (path) { editPost(path).then(function () { return restorePostDraft(path); }).catch(function(){}); } else { newPost(); restoreNewPostDraft(); }
		}
		function newPost() {
			showEditorView();
			state.isNew = true; state.editingPath = null; state.editingSha = null; state.originalTitle = "";
			state._originalRaw = null; state._originalPath = null;
			$("pe-editor-title").textContent = "写新文章";
			clearForm();
			toggleRestoreBtn(false);
			hideTitleWarn();
			setStatus($("pe-editor-foot-status"), "填写信息后保存即创建新文章", "");
		}
		async function editPost(path) {
			state.isNew = false; state.editingPath = path;
			$("pe-editor-title").textContent = "编辑文章";
			setStatus($("pe-editor-foot-status"), "正在拉取文章内容...", "");
			// 优先：静态全文副本（无需令牌，构建时生成于 public/posts-content/）
			try {
				var rel = path.replace(/^src\/content\/posts\//, "").replace(/\.md$/, "");
				var sr = await fetch("/posts-content/" + rel + ".md", { headers: { Accept: "text/markdown" } });
				if (sr.ok) {
					var sraw = await sr.text();
					if (sraw && sraw.trim()) {
					state.editingSha = null; // 静态副本无 sha，保存时再向 GitHub 取最新 sha
					var ssp = splitFrontmatter(sraw);
					var sfm = parseFm(ssp.fm);
					fillForm(sfm, ssp.body, path);
					// 冻结原始内容快照（供「一键恢复」还原到修改前）
					state._originalRaw = buildMarkdown(sfm, ssp.body);
					state._originalPath = path;
					state.originalTitle = sfm.title || "";
					var delBtn0 = $("pe-toolbar-delete"); if (delBtn0) delBtn0.hidden = false;
					hideTitleWarn();
					toggleRestoreBtn(true);
					setStatus($("pe-editor-foot-status"), "✅ 已载入（静态副本，无需令牌）", "is-ok");
					return;
					}
				}
			} catch (_es) { /* 落到 GitHub 兜底 */ }
			// 兜底：GitHub API（需要 PAT，用于取 sha / 私有仓库）
			var token = getPat();
			if (!token) { setStatus($("pe-editor-foot-status"), "未找到静态副本，请验证 GitHub PAT 以从仓库加载", "is-error"); return; }
			try {
				var r = await fetch(API_CONTENT(path), { headers: { Accept: "application/vnd.github+json", Authorization: "Bearer " + token } });
				if (!r.ok) { var e = await r.json().catch(function(){return{};}); throw new Error("拉取失败 " + r.status + "：" + (e.message || r.statusText)); }
				var file = await r.json();
				state.editingSha = file.sha;
			var raw = base64ToUtf8(file.content || "");
			var sp = splitFrontmatter(raw);
			var fm = parseFm(sp.fm);
			fillForm(fm, sp.body, path);
			// 冻结原始内容快照（供「一键恢复」还原到修改前）
			state._originalRaw = buildMarkdown(fm, sp.body);
			state._originalPath = path;
			state.originalTitle = fm.title || "";
			var delBtn = $("pe-toolbar-delete"); if (delBtn) delBtn.hidden = false;
			hideTitleWarn();
			toggleRestoreBtn(true);
			setStatus($("pe-editor-foot-status"), "✅ 已载入，可编辑后保存", "is-ok");
			} catch (e) {
				setStatus($("pe-editor-foot-status"), "❌ " + e.message, "is-error");
			}
		}
		function fillForm(fm, body, path) {
			$("pe-f-title").value = fm.title || "";
			var _rel = (path || "").replace(/^src\/content\/posts\//, "").replace(/\.md$/, "");
			var _segs = _rel.split("/");
			// 分类目录改为只读展示：根据当前分类自动派生，path 里的 folder 仅作首屏提示
			var _pathFolder = _segs.length > 1 ? _segs[0] : "";
			$("pe-f-slug").value = _segs[_segs.length - 1] || "";
			setCategory(fm.category || "");
			$("pe-f-desc").value = fm.description || "";
			setTags(Array.isArray(fm.tags) ? fm.tags : []);
			// 派生并展示 folder（优先用 fm.category 派生，路径里的 folder 作回退参考）
			deriveAndShowFolder(fm.category || "", _pathFolder);
			$("pe-f-pub").value = (fm.published || "").slice(0, 10);
			$("pe-f-cover").value = fm.image || "";
			$("pe-f-pinned").checked = fm.pinned === true;
			$("pe-f-draft").checked = fm.draft === true;
			$("pe-f-body").value = body || "";
			autoSizeTitle();
			updateCharCount();
			captureSnapshot(); toggleSaveBtn(false);
		}
		function clearForm() {
			state._dirty = false;
			var delBtn = $("pe-toolbar-delete"); if (delBtn) delBtn.hidden = true;
			["pe-f-title","pe-f-slug","pe-f-cat","pe-f-desc","pe-f-pub","pe-f-cover","pe-f-body"].forEach(function (id) { if ($(id)) $(id).value = ""; });
			setTags([]);
			setCategory("");
			$("pe-f-folder").value = "others";
			var fn = $("pe-f-folder-name"); if (fn) fn.textContent = "others";
			var fh = $("pe-f-folder-hint"); if (fh) fh.textContent = "（选择分类后自动匹配）";
			$("pe-f-pub").value = nowDate();
			$("pe-f-pinned").checked = false;
			$("pe-f-draft").checked = false;
			autoSizeTitle();
			updateCharCount();
			captureSnapshot(); toggleSaveBtn(false); toggleRestoreBtn(false);
		}

		// ===== 标题变更提示 + 自动增高 =====
		function onTitleInput() {
			autoSizeTitle();
			onEdit();
			if (state.isNew) { autoSlugFromTitle(); hideTitleWarn(); return; }
			var t = ($("pe-f-title").value || "").trim();
			if (state.originalTitle && t && t !== state.originalTitle) {
				showTitleWarn("⚠️ 标题已从「" + state.originalTitle + "」改为「" + t + "」，原图片目录 /文章/" + state.originalTitle + "/ 下的图片将失效。请重新上传，或手动把图床目录里的图片改名迁移。");
			} else {
				hideTitleWarn();
			}
		}
		function refreshLocalPost(c) {
			var idx = state.posts.findIndex(function (p) { return p.path === c.path; });
			var item = { path: c.path, folder: c.folder, slug: c.slug, title: c.fm.title, sha: state.editingSha || "local", published: c.fm.published, pinned: c.fm.pinned, draft: c.fm.draft };
			if (idx >= 0) state.posts[idx] = item; else state.posts.unshift(item);
			renderList();
		}

		// ===== 删除 =====
		async function deletePost(path) {
			var token = getPat();
			if (!token) { setStatus($("pe-editor-status"), "请先验证 GitHub PAT", "is-error"); return; }
			if (!confirm("确定删除「" + path + "」？删除会在「上传中心」统一推送时生效。")) return;
			try {
				var r0 = await fetch(API_CONTENT(path), { headers: { Accept: "application/vnd.github+json", Authorization: "Bearer " + token } });
				if (r0.ok) {
					await putDraft({ feature: "posts", id: path, label: "删除 " + path, files: [{ path: path, delete: true }] });
				} else {
					await deleteDraft("posts", path);
				}
				state.posts = state.posts.filter(function (p) { return p.path !== path; });
				renderList();
				if (state.editingPath === path) { closeEditor(); }
				setStatus($("pe-editor-status"), "✅ 已加入删除队列，待「上传中心」统一推送", "is-ok");
			} catch (e) {
				setStatus($("pe-editor-status"), "❌ " + e.message, "is-error");
			}
		}
				// ===== 表单收集（保存到本地草稿用）=====
		function collectForm() {
			var title = ($("pe-f-title").value || "").trim();
			var slugRaw = ($("pe-f-slug").value || "").trim();
			var slug = slugRaw || slugify(title);
			var folder = ($("pe-f-folder").value || "others").trim();
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
			var body = $("pe-f-body").value || "";
			var path = "src/content/posts/" + (folder && folder !== "others" ? folder + "/" : "") + slug + ".md";
			return { fm: fm, body: body, path: path, folder: folder, slug: slug };
		}
		// ===== 脏检测：仅在内容与原文不一致时显示【修改保存】=====
		function serializeCurrent() {
			var c = collectForm();
			return buildMarkdown(c.fm, c.body);
		}
		function captureSnapshot() {
			state._originalSnapshot = serializeCurrent();
		}
		function toggleSaveBtn(show) {
			var b = $("pe-editor-save");
			if (!b) return;
			b.hidden = !show;
			b.style.display = show ? "" : "none";
		}
		function toggleRestoreBtn(show) {
			var b = $("pe-editor-restore");
			if (!b) return;
			// 仅在编辑已有文章时提供「恢复原始」（新文章无原始可恢复）
			var allow = show && !state.isNew && !!state._originalRaw;
			b.hidden = !allow;
			b.style.display = allow ? "" : "none";
		}
		function markDirty() {
			if (!state._originalSnapshot) { captureSnapshot(); return; }
			state._dirty = serializeCurrent() !== state._originalSnapshot;
			toggleSaveBtn(state._dirty);
			toggleRestoreBtn(state._dirty);
		}
		var _dirtyTimer = null;
		function onEdit() {
			if (_dirtyTimer) clearTimeout(_dirtyTimer);
			_dirtyTimer = setTimeout(markDirty, 250);
		}
async function saveDraftLocal(forceDraft) {
			if (state.saving) return;
			state.saving = true;
			var saveBtn = $("pe-editor-save");
			if (saveBtn) saveBtn.disabled = true;
			try {
				var c = collectForm();
				if (forceDraft === true) { c.fm.draft = true; if ($("pe-f-draft")) $("pe-f-draft").checked = true; }
				else if (forceDraft === false) { c.fm.draft = false; if ($("pe-f-draft")) $("pe-f-draft").checked = false; }
				if (!c.fm.title) throw new Error("标题不能为空");
				var content = utf8ToBase64(buildMarkdown(c.fm, c.body));
				var files = [{ path: c.path, content: content, sha: state.editingSha || null }];
				var pathChanged = !state.isNew && c.path !== state.editingPath;
				if (pathChanged && state.editingPath) { files.push({ path: state.editingPath, delete: true }); }
				await putDraft({ feature: "posts", id: c.path, label: c.fm.title + (c.fm.draft ? "（草稿）" : ""), files: files });
				state.editingPath = c.path; state.isNew = false; state.originalTitle = c.fm.title;
			captureSnapshot(); toggleSaveBtn(false); state._dirty = false;
				toggleRestoreBtn(true); // 已保存的草稿仍可一键恢复
				hideTitleWarn();
				var _t = new Date();
				var _hh = String(_t.getHours()).padStart(2, "0");
				var _mm = String(_t.getMinutes()).padStart(2, "0");
				var _ss = String(_t.getSeconds()).padStart(2, "0");
				setStatus($("pe-editor-foot-status"), "✅ 已存为本地草稿（" + _hh + ":" + _mm + ":" + _ss + "）· 待右下角「上传中心」统一推送", "is-ok");
				refreshLocalPost(c);
			} catch (e) {
				setStatus($("pe-editor-foot-status"), "❌ " + e.message, "is-error");
			} finally {
				state.saving = false;
				if (saveBtn) saveBtn.disabled = false;
			}
		}

		// ===== 一键恢复：丢弃本地草稿，把表单还原到「修改前」的原始内容 =====
		async function restoreOriginal() {
			if (state.isNew || !state._originalRaw) return;
			if (!confirm("确定恢复到修改前的原始内容吗？\n当前未上传的本地草稿将被丢弃（不影响已发布的线上内容）。")) return;
			try {
				// 丢弃当前编辑路径与原始路径上的本地草稿（slug 改名时两者可能不同）
				await deleteDraft("posts", state._originalPath);
				if (state.editingPath && state.editingPath !== state._originalPath) {
					await deleteDraft("posts", state.editingPath);
				}
			} catch (_e) { /* 草稿可能不存在，忽略 */ }
			var sp = splitFrontmatter(state._originalRaw);
			var fm = parseFm(sp.fm);
			fillForm(fm, sp.body, state._originalPath);
			state.editingPath = state._originalPath;
			state.isNew = false;
			state._dirty = false;
			toggleSaveBtn(false);
			toggleRestoreBtn(false);
			setStatus($("pe-editor-foot-status"), "↩ 已恢复到编辑前的原始内容（本地草稿已清空，可重新编辑）", "is-ok");
		}


		// ===== 事件绑定 =====
var _peBound = new WeakSet();
		function bind() {
			var root = $("pe-editor"); if (root && _peBound.has(root)) return;
			$("pe-editor-close")?.addEventListener("click", showListView);
			// 顶栏「返回列表」
			$("pe-editor-back")?.addEventListener("click", showListView);
			$("pe-pat-open")?.addEventListener("click", function () {
				var p = $("pe-pat-panel"); if (!p) return;
				if (p.hidden) { p.hidden = false; var inp = $("pe-editor-pat"); if (inp) inp.focus(); } else { p.hidden = true; }
			});
			$("pe-toolbar-import-md")?.addEventListener("click", function () { $("pe-md-import")?.click(); });
			$("pe-toolbar-preview")?.addEventListener("click", togglePreview);
			$("pe-toolbar-delete")?.addEventListener("click", function () {
				if (!state.editingPath) return;
				if (!confirm("确定删除「" + (state.originalTitle || state.editingPath) + "」？\n该操作不可恢复！")) return;
				deletePost(state.editingPath);
			});

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
					// ?edit=<slug>：校验通过后自动加载文章树并打开目标文章，无需再点「加载」
					if (state.pendingEditSlug) {
						setStatus($("pe-editor-status"), "✓ 令牌有效，正在定位「" + state.pendingEditSlug + "」…", "is-ok");
						await loadRemote();
					} else {
						setStatus($("pe-editor-status"), "✓ 令牌有效，本次浏览期间免重复输入", "is-ok");
					}
				}
				catch (e) { setStatus($("pe-editor-status"), "✗ " + e.message, "is-error"); }
				finally { this.disabled = false; }
			});
			$("pe-editor-pat-clear")?.addEventListener("click", function () {
				if (!confirm("确定退出本次浏览会话（清除已验证的令牌）？")) return;
				setPat(""); var inp = $("pe-editor-pat"); if (inp) inp.value = "";
				setStatus($("pe-editor-status"), "已退出会话，下次需重新验证", "is-ok"); renderSessionState();
			});
			$("pe-editor-load")?.addEventListener("click", loadRemote);
			$("pe-editor-save")?.addEventListener("click", function () { saveDraftLocal(); });
			$("pe-editor-restore")?.addEventListener("click", function () { restoreOriginal(); });
			$("pe-new-post")?.addEventListener("click", function () { newPost(); });
			$("pe-f-title")?.addEventListener("input", onTitleInput);
			$("pe-f-body")?.addEventListener("input", function () { updateCharCount(); schedulePreview(); onEdit(); });
			$("pe-editor")?.addEventListener("input", function (e) { var id = e.target && e.target.id; if (id && (id.indexOf("pe-f-") === 0 || id === "pe-tag-input")) { onEdit(); } });
			$("pe-img-pick")?.addEventListener("click", function () { $("pe-img-file")?.click(); });
			$("pe-img-file")?.addEventListener("change", handleImgUpload);
			// Markdown 工具栏（事件委托）
			var mdTb = document.querySelector(".pe-md-toolbar");
			mdTb?.addEventListener("click", function (e) {
				var btn = e.target.closest ? e.target.closest(".pe-md-tb") : null;
				if (!btn) return;
				var act = btn.getAttribute("data-md");
				if (act) mdAction(act);
			});
			$("pe-f-body")?.addEventListener("input", updateCharCount);
			$("pe-f-body")?.addEventListener("keydown", function (e) {
				if (!(e.ctrlKey || e.metaKey)) return;
				var k = e.key.toLowerCase();
				if (k === "b") { e.preventDefault(); mdAction("bold"); }
				else if (k === "i") { e.preventDefault(); mdAction("italic"); }
				else if (k === "k") { e.preventDefault(); mdAction("link"); }
				else if (k === "s") { e.preventDefault(); saveDraftLocal(); }
			});
			$("pe-md-import")?.addEventListener("change", function (e) {
				var f = e.target.files && e.target.files[0];
				if (f) importMdFile(f);
				e.target.value = "";
			});

			// 列表委托
			var listEl = $("pe-root").querySelector("[data-pe-list]");
			listEl?.addEventListener("click", function (e) {
				var t = e.target;
				var editPath = t.getAttribute && t.getAttribute("data-pe-edit");
				var delPath = t.getAttribute && t.getAttribute("data-pe-del");
				if (editPath) { openEditor(editPath); }
				else if (delPath) { deletePost(delPath); }
			});

			// 注入种子
			try { state.seed = window.__peSeed || []; } catch (_e) {}
			// 分类/标签 UI 初始化（在 seed 准备好后填充候选项，绑定事件）
			populateCategoryOptions();
			populateTagOptions();
			bindCategoryCombo();
			bindTags();
			if (root) _peBound.add(root);
		}
		function showListView() {
	var list = $("pe-list-view"); if (list) list.hidden = false;
	var ed = $("pe-editor"); if (ed) ed.hidden = true;
	renderList();
}
function showEditorView() {
	var list = $("pe-list-view"); if (list) list.hidden = true;
	var ed = $("pe-editor"); if (ed) ed.hidden = false;
}
function closeEditor() {
			var dlg = $("pe-editor");
			if (!dlg) return;
			showListView();
		}

		// 初始化：用服务端种子填充列表
		function init() {
			try {
				state.seed = window.__peSeed || [];
				state.posts = (window.__peSeed || []).map(function (s) {
					return { path: s.path, folder: s.folder, slug: s.slug, title: s.title, published: s.published, pinned: s.pinned, draft: s.draft, sha: "" };
				});
			} catch (_e) { state.posts = []; }
			// URL ?edit=<slug>：从文章详情页「编辑当前文章」跳转来，自动加载并打开该篇
			try {
				var qp = new URLSearchParams(location.search);
				var editSlug = qp.get("edit");
				if (editSlug) state.pendingEditSlug = editSlug;
			} catch (_e) {}
			renderList();
			// 进入即渲染表单：有 ?edit=<slug> 走编辑态，无则走新建态
				state.isNew = !state.pendingEditSlug;
				state.editingPath = null;
				state.editingSha = null;
				state.originalTitle = "";
				$("pe-editor-title").textContent = state.pendingEditSlug ? "编辑文章" : "写新文章";
				$("pe-editor-mode-chip").textContent = state.pendingEditSlug ? "EDIT" : "WRITE";
			clearForm();
			hideTitleWarn();
			// ?edit=<slug>：优先用静态副本直接加载（无需 PAT），仅在种子中找不到时才退回 PAT/GitHub
			if (state.pendingEditSlug) {
				var seedPath = findBySlug(state.pendingEditSlug);
				if (seedPath) {
					var pendingSlug = state.pendingEditSlug;
					state.pendingEditSlug = null;
					setStatus($("pe-editor-status"), "正在加载「" + pendingSlug + "」…", "");
					openEditor(seedPath); // editPost 内部优先读静态副本
				} else if (!getPat()) {
					var pp = $("pe-pat-panel"); if (pp) pp.hidden = false;
					setStatus($("pe-editor-status"), "请先验证 GitHub PAT，然后会自动加载「" + state.pendingEditSlug + "」", "is-error");
				} else {
					setStatus($("pe-editor-status"), "正在定位「" + state.pendingEditSlug + "」…", "");
					loadRemote();
				}
			} else {
				showListView();
				var pp2 = $("pe-pat-panel"); if (pp2) pp2.hidden = false;
				setStatus($("pe-editor-status"), "从下方文章列表选择，或点「写新文章」", "");
			}
			updateCharCount();
	}

// ===== 引导入口（由 Layout 持久化脚本在首屏与每次 Swup 切换后调用）=====
export async function bootPostEditor() {
  const root = document.getElementById("pe-editor");
  if (!root) return; // 不在编辑器页，直接跳过
  // 每次重新读取配置（Swup 切换后 DOM 已是新节点）
  IMGBED_URL = root.getAttribute("data-imgbed-url") || "";
  IMGBED_AUTH = root.getAttribute("data-imgbed-auth") || "";
  IMGBED_API_TOKEN = root.getAttribute("data-imgbed-token") || "";
  // 种子索引：优先用页面注入的，否则动态导入（避免每次都打包进持久化 bundle）
  if (!(window.__peSeed)) {
    try {
      const mod = await import("@/data/posts-index");
      window.__peSeed = mod.postsIndex;
    } catch (_e) {
      window.__peSeed = window.__peSeed || [];
    }
  }
  init();
  bind();
}
