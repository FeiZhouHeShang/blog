// 日常吐槽前端编辑器引导（持久化模块，由 Layout 在每次导航后调用）
// 原始逻辑来自 moments.astro 的内联脚本；此处改为模块，保证 Swup 软导航后仍能重新初始化。

import { putDraft, getDraft, getDrafts, deleteDraft } from "@/scripts/draftStore";

let IMGBED_URL = "";
let IMGBED_AUTH = "";
let IMGBED_FOLDER = "";
let IMGBED_API_TOKEN = "";

		// ===== 配置 =====
		var API_FILE_URL =
			"https://api.github.com/repos/FeiZhouHeShang/blog/contents/src/data/daily-grumble.ts?ref=main";
		var DATA_VAR = "dailyGrumbles";
		var SRC_PATH = "src/data/daily-grumble.ts";
		var PAT_STORAGE_KEY = "__dg_pat__";

		// ===== 方案 A：直传 GitHub 仓库（本地加载）=====
		// 对应站点资源目录：日常吐槽 → "moments"
		// 上传目标：public/assets/images/moments/<filename> → 运行期 URL /assets/images/moments/<filename>
		var REPO_FOLDER = "moments";
		var REPO_API_BASE =
			"https://api.github.com/repos/FeiZhouHeShang/blog/contents/public/assets/images/" + REPO_FOLDER;

		// ===== 状态 =====
		var state = {
			items: [],
			sourceContent: "",
			sha: "",
			loading: false,
			saving: false,
			editingId: null,
		};
		// 每行编辑态的图片 URL（独立于表单字段，上传后回填）
		var rowImages = {}; // rowId -> string[]
		// 本次会话已上传文件的 SHA-256 -> URL，用于去重（同一文件不重复上传，图床不产生副本）
		var uploadedHashes = {};
		// 跨会话去重：localStorage 持久化的「原始文件名 → 图床 URL」表。
		// key 用「folder/filename」组合，不同目录下的同名文件互不干扰。
		// 写入时机：上传成功拿到新 URL 后；查询时机：每次上传前。
		// 30 天无访问的条目自动剔除，避免 localStorage 无限膨胀。
		var FILENAME_INDEX_KEY = "__dg_imgbed_filename_index_v1__";
		var FILENAME_INDEX_TTL_MS = 30 * 24 * 60 * 60 * 1000; // 30 天
		// 可选：图床目录远程去重（带 API Token 才启用，否则只走 localStorage 表）
		var REMOTE_INDEX_TTL_MS = 5 * 60 * 1000; // 5 分钟
		var imgbedRemoteIndex = null; // { ts, map } | null

		function loadFilenameIndex() {
			try {
				var raw = localStorage.getItem(FILENAME_INDEX_KEY);
				if (!raw) return {};
				var obj = JSON.parse(raw);
				if (!obj || typeof obj !== "object" || !obj.map) return {};
				var now = Date.now();
				var out = {};
				var changed = false;
				Object.keys(obj.map).forEach(function (k) {
					var v = obj.map[k];
					if (!v || typeof v !== "object" || !v.url || !v.t) return;
					if (now - v.t > FILENAME_INDEX_TTL_MS) { changed = true; return; }
					out[k] = v;
				});
				if (changed) saveFilenameIndex(out);
				return out;
			} catch (_e) { return {}; }
		}
		function saveFilenameIndex(map) {
			try { localStorage.setItem(FILENAME_INDEX_KEY, JSON.stringify({ map: map, ts: Date.now() })); } catch (_e) {}
		}
		function indexKey(folder, filename) { return (folder || "") + "/" + filename; }
		function lookupFilenameIndex(folder, filename) {
			var idx = loadFilenameIndex();
			return idx[indexKey(folder, filename)] || null;
		}
		function writeFilenameIndex(folder, filename, url) {
			var idx = loadFilenameIndex();
			idx[indexKey(folder, filename)] = { url: url, t: Date.now() };
			saveFilenameIndex(idx);
		}
		// 可选：拉图床目录做强去重（要 API Token）
		async function loadImgbedRemoteIndex(folder) {
			if (!IMGBED_API_TOKEN || !folder) return null;
			if (imgbedRemoteIndex && Date.now() - imgbedRemoteIndex.ts < REMOTE_INDEX_TTL_MS) return imgbedRemoteIndex.map;
			var base = (IMGBED_URL || "").replace(/\/+$/, "");
			var url = base + "/api/manage/list?dir=" + encodeURIComponent(folder) + "&count=500";
			try {
				var r = await fetch(url, {
					headers: { Accept: "application/json", Authorization: "Bearer " + IMGBED_API_TOKEN },
				});
				if (!r.ok) return null;
				var data = await r.json();
				var files = (data && (data.files || data.data)) || [];
				var map = {};
				files.forEach(function (f) {
					if (!f || typeof f !== "object") return;
					var name = f.name || f.filename || f.key || f.id;
					var u = f.src || f.url || f.publicUrl || f.link || f.full_url;
					if (name && u) map[name] = u;
				});
				imgbedRemoteIndex = { ts: Date.now(), map: map };
				return map;
			} catch (_e) { return null; }
		}
		// 计算文件 SHA-256（hex），用于前端去重
		async function hashFile(file) {
			try {
				var buf = await file.arrayBuffer();
				var digest = await crypto.subtle.digest("SHA-256", buf);
				return Array.prototype.map
					.call(new Uint8Array(digest), function (b) { return ("0" + b.toString(16)).slice(-2); })
					.join("");
			} catch (_e) { return null; }
		}

		// ===== 工具 =====
		function $(id) { return document.getElementById(id); }
		function escHtml(s) {
			return String(s == null ? "" : s)
				.replace(/&/g, "&amp;")
				.replace(/</g, "&lt;")
				.replace(/>/g, "&gt;")
				.replace(/"/g, "&quot;")
				.replace(/'/g, "&#39;");
		}
		function nowLocal() {
			var d = new Date();
			function p(n) { return (n < 10 ? "0" : "") + n; }
			return d.getFullYear() + "-" + p(d.getMonth() + 1) + "-" + p(d.getDate()) +
				" " + p(d.getHours()) + ":" + p(d.getMinutes());
		}
		function genId(title) {
			var base = (title || "grumble")
				.toLowerCase()
				.replace(/[^a-z0-9\u4e00-\u9fa5]+/g, "-")
				.replace(/^-+|-+$/g, "")
				.slice(0, 32);
			if (!base) base = "grumble";
			return base + "-" + Math.random().toString(36).slice(2, 6);
		}
		function setStatus(el, msg, kind) {
			if (!el) return;
			el.textContent = msg || "";
			el.classList.remove("is-error", "is-ok");
			if (kind) el.classList.add("is-" + kind);
		}
		// 会话令牌：存 sessionStorage —— 本次浏览（同一 tab）有效，关闭/重开浏览器即清空需重输
		function getPat() {
			return sessionStorage.getItem(PAT_STORAGE_KEY) || "";
		}
		function setPat(v) {
			if (v) sessionStorage.setItem(PAT_STORAGE_KEY, v);
			else sessionStorage.removeItem(PAT_STORAGE_KEY);
		}
		// 校验令牌：调 GitHub /user，200 即有效（fine-grained PAT 需 contents:read/write）
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
		// 渲染会话状态小标：已验证 / 未验证
		function renderSessionState() {
			var chip = $("dg-session-chip");
			if (!chip) return;
			if (getPat()) {
				chip.textContent = "🔓 本次浏览已验证";
				chip.className = "dg-session-chip is-ok";
			} else {
				chip.textContent = "🔒 未验证";
				chip.className = "dg-session-chip is-lock";
			}
		}

		// ===== 图床上传 =====
		// CloudFlare ImgBed 真实响应：[{ src: "...", publicUrl?: "..." }] —— 顶层是数组
		// 兼容各种历史/衍生方案：扁平对象 / {data:...} / 数组 / 字符串直返
		function extractImgUrl(data) {
			if (!data) return "";
			if (typeof data === "string") return data;
			// ① 顶层就是数组（CF ImgBed 标准）
			if (Array.isArray(data)) {
				var first = data[0];
				if (!first || typeof first !== "object") return "";
				return first.src || first.url || first.link || first.absolute_url || first.full_url || first.pathname || first.publicUrl || "";
			}
			// ② {data: [...] | {...}} —— 兼容旧版/API Token 模式返回
			var inner = data.data;
			if (inner && typeof inner === "object") {
				if (Array.isArray(inner)) {
					var f = inner[0];
					if (!f || typeof f !== "object") return "";
					return f.src || f.url || f.link || f.publicUrl || "";
				}
				return inner.src || inner.url || inner.link || inner.absolute_url || inner.full_url || inner.pathname || inner.publicUrl || "";
			}
			// ③ 扁平对象
			return data.src || data.url || data.link || data.absolute_url || data.full_url || data.pathname || data.publicUrl || "";
		}
		async function uploadToImgbed(file) {
			var fd = new FormData();
			fd.append("file", file, file.name);
			var base = (IMGBED_URL || "").replace(/\/+$/, "");
			var url =
				base + "/upload?returnFormat=full&uploadNameType=origin&uploadFolder=" +
				encodeURIComponent(IMGBED_FOLDER || "");
			var headers = { Accept: "application/json" };
			// 上传鉴权优先 Bearer Token（fqzlr 单令牌方案：list+upload 同令牌）；
			// 若令牌仅 list 权限则降级到 authCode（query），二者皆无则明文失败
			if (IMGBED_API_TOKEN) {
				headers["Authorization"] = "Bearer " + IMGBED_API_TOKEN;
			} else if (IMGBED_AUTH) {
				url += "&authCode=" + encodeURIComponent(IMGBED_AUTH);
			}
			var r = await fetch(url, { method: "POST", body: fd, headers: headers });
			if (!r.ok) throw new Error("上传失败 HTTP " + r.status);
			var data;
			try { data = await r.json(); } catch (e) { throw new Error("图床返回非 JSON（可能 CORS 拦截）"); }
			console.log("[日常吐槽] 图床返回:", data);
			// 失败态
			if (data && (data.result === "failed" || data.status === "error")) {
				throw new Error(data.message || "图床拒绝上传");
			}
			var u = extractImgUrl(data);
			if (!u) throw new Error("无法从图床响应解析图片 URL（见控制台）");
			return u;
		}

		// ===== 方案 A：直传 GitHub 仓库（本地加载）=====
		// 把图片字节 base64 后 PUT 到 public/assets/images/moments/<filename>
		// 返回本地 URL（/assets/images/moments/<filename>），部署后浏览器从仓库静态加载，不依赖图床。
		// 需要已验证的 GitHub PAT（contents:write）。重名时追加短随机后缀避免覆盖。
		async function uploadToRepo(file) {
			var token = getPat();
			if (!token) throw new Error("请先在顶部「验证令牌」后再上传到仓库");
			// 文件名清洗：保留原名可读性，去掉空格/危险字符
			var dotIdx = file.name.lastIndexOf(".");
			var rawExt = dotIdx > 0 ? file.name.slice(dotIdx + 1) : "";
			var ext = rawExt.toLowerCase().replace(/[^a-z0-9]/g, "");
			var rawBase = dotIdx > 0 ? file.name.slice(0, dotIdx) : file.name;
			var base = rawBase.replace(/[^a-z0-9\u4e00-\u9fa5_-]/gi, "-").replace(/^-+|-+$/g, "") || "img";
			base = base.slice(0, 48);
			var filename = base + (ext ? "." + ext : "");
			// 若同名已存在，追加短随机后缀（GitHub PUT 无「不存在才创建」语义，无 sha 会报冲突）
			var finalName = filename;
			try {
				var headR = await fetch(REPO_API_BASE + "/" + encodeURIComponent(finalName) + "?ref=main", {
					headers: { Accept: "application/vnd.github+json", Authorization: "Bearer " + token },
				});
				if (headR.ok) {
					finalName = base + "-" + Math.random().toString(36).slice(2, 8) + (ext ? "." + ext : "");
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
			var r = await fetch(REPO_API_BASE + "/" + encodeURIComponent(finalName), {
				method: "PUT",
				headers: {
					Accept: "application/vnd.github+json",
					Authorization: "Bearer " + token,
					"Content-Type": "application/json",
				},
				body: JSON.stringify({
					message: "chore(assets): upload " + finalName + " via web editor (Option A)",
					content: b64,
					branch: "main",
				}),
			});
			if (!r.ok) {
				var err = await r.json().catch(function () { return {}; });
				throw new Error("仓库上传失败 " + r.status + "：" + (err.message || r.statusText));
			}
			return "/assets/images/moments/" + finalName;
		}

		// ===== 数据序列化 =====
		function findArrayRange(source, varName) {
			var kwIdx = source.indexOf(varName);
			if (kwIdx < 0) return null;
			var eqIdx = source.indexOf("=", kwIdx);
			if (eqIdx < 0) return null;
			var bracketIdx = source.indexOf("[", eqIdx);
			if (bracketIdx < 0) return null;
			var depth = 0, inStr = false, strCh = "";
			for (var i = bracketIdx; i < source.length; i++) {
				var c = source[i];
				if (inStr) {
					if (c === "\\") { i++; continue; }
					if (c === strCh) inStr = false;
					continue;
				}
				if (c === '"' || c === "'" || c === "`") { inStr = true; strCh = c; continue; }
				if (c === "[") depth++;
				else if (c === "]") {
					depth--;
					if (depth === 0) return { start: bracketIdx, end: i + 1 };
				}
			}
			return null;
		}
		function serializeToSource(originalSource, newItems, varName) {
			var range = findArrayRange(originalSource, varName);
			if (!range) throw new Error("源文件中未找到 `" + varName + " = [...]` 数组");
			var headStart = originalSource.lastIndexOf("=", range.start) + 1;
			var arrJson = JSON.stringify(newItems, null, 2);
			var head = originalSource.substring(headStart, range.start);
			var tail = originalSource.substring(range.end);
			return originalSource.substring(0, headStart) + head + arrJson + tail;
		}
		function utf8ToBase64(s) { return btoa(unescape(encodeURIComponent(s))); }
		function base64ToUtf8(b64) { return decodeURIComponent(escape(atob(b64.replace(/\n/g, "")))); }

		// ===== GitHub API =====
		async function loadRemote() {
			var token = getPat();
			if (!token) { setStatus($("dg-editor-status"), "请先填写 GitHub PAT", "error"); return; }
			setStatus($("dg-editor-status"), "正在从 GitHub 加载...", "");
			state.loading = true;
			try {
				var r = await fetch(API_FILE_URL, {
					headers: { Accept: "application/vnd.github+json", Authorization: "Bearer " + token },
				});
				if (!r.ok) {
					var err = await r.json().catch(function () { return {}; });
					throw new Error("加载失败 " + r.status + "： " + (err.message || r.statusText));
				}
				var file = await r.json();
				state.sha = file.sha;
				state.sourceContent = base64ToUtf8(file.content || "");
				var range = findArrayRange(state.sourceContent, DATA_VAR);
				if (!range) throw new Error("源文件格式异常，找不到 " + DATA_VAR + " 数组");
				var arrLiteral = state.sourceContent.substring(range.start, range.end);
				var parsed;
				try { parsed = new Function("return (" + arrLiteral + ");")(); }
				catch (parseErr) { throw new Error("解析数组失败：" + parseErr.message); }
				if (!Array.isArray(parsed)) throw new Error("解析结果不是数组");
				state.items = parsed;
				setStatus($("dg-editor-status"), "已加载 " + state.items.length + " 条 · SHA " + state.sha.slice(0, 7), "ok");
				renderList();
			} catch (e) {
				setStatus($("dg-editor-status"), "❌ " + e.message, "error");
			} finally {
				state.loading = false;
			}
		}

	// ===== 本地草稿（不再直推 GitHub，统一由「上传中心」一次性提交）=====
	var _dgDraftTimer = null;
	function scheduleDraftSave() {
		if (_dgDraftTimer) clearTimeout(_dgDraftTimer);
		_dgDraftTimer = setTimeout(function () { saveDraftLocal(); }, 800);
	}
	// 合并当前编辑行（rowImages 尚未写回 items）的图片，保证草稿含最新图片
	function collectAllItems() {
		if (state.editingId != null && rowImages[state.editingId]) {
			var idx = state.items.findIndex(function (x) { return x.id === state.editingId; });
			if (idx >= 0) {
				state.items[idx] = Object.assign({}, state.items[idx], { images: rowImages[state.editingId].slice() });
			}
		}
		return state.items;
	}
	async function saveDraftLocal() {
		if (typeof putDraft !== "function") {
			setStatus($("dg-editor-foot-status"), "本地草稿模块未就绪，请刷新页面", "error");
			return;
		}
		if (state.saving) return;
		state.saving = true;
		var saveBtn = $("dg-editor-save");
		if (saveBtn) saveBtn.disabled = true;
		try {
			// 首次进入若未加载远端，则用构建期注入的完整源作为序列化模板
			if (!state.sourceContent) {
				var seedEl = document.getElementById("dg-source-seed");
				if (seedEl && seedEl.textContent) {
					try { state.sourceContent = JSON.parse(seedEl.textContent); } catch (_e) {}
				}
			}
			if (!state.sourceContent) {
				setStatus($("dg-editor-foot-status"), "缺少文件模板：请先点「加载远端」或刷新页面", "error");
				return;
			}
			var items = collectAllItems();
			var newSource = serializeToSource(state.sourceContent, items, DATA_VAR);
			var newContent = utf8ToBase64(newSource);
			await putDraft({
				feature: "daily-grumble",
				id: SRC_PATH,
				label: "日常吐槽（" + items.length + " 条）",
				files: [{ path: SRC_PATH, content: newContent, sha: null }],
			});
			state.sourceContent = newSource;
			setStatus($("dg-editor-foot-status"), "✅ 已存为本地草稿 · 待右下角「上传中心」统一推送", "ok");
		} catch (e) {
			setStatus($("dg-editor-foot-status"), "❌ " + e.message, "error");
		} finally {
			state.saving = false;
			if (saveBtn) saveBtn.disabled = false;
		}
	}
	// 重新打开编辑器时，若本地有未上传草稿则覆盖远程内容（断点续编）
	async function restoreDraft() {
		if (typeof getDraft !== "function") return;
		var d = await getDraft("daily-grumble", SRC_PATH);
		if (!d || !d.files || !d.files.length || d.files[0].delete) return;
		var src = base64ToUtf8(d.files[0].content || "");
		var range = findArrayRange(src, DATA_VAR);
		if (!range) return;
		try {
			var arr = new Function("return (" + src.substring(range.start, range.end) + ");")();
			if (!Array.isArray(arr)) return;
			state.items = arr;
			state.sourceContent = src;
			setStatus($("dg-editor-foot-status"), "⚠️ 已载入本地未上传草稿（" + arr.length + " 条）", "ok");
			renderList();
		} catch (_e) {}
	}

		// ===== 图片预览渲染 =====
		function renderImagePreview(rowEl) {
			var rowId = rowEl.getAttribute("data-row-id");
			var preview = rowEl.querySelector("[data-img-preview]");
			if (!preview) return;
			var imgs = rowImages[rowId] || [];
			preview.innerHTML = imgs.length
				? imgs.map(function (src, i) {
					return '<div class="dg-thumb"><img src="' + escHtml(src) + '" alt="" onerror="this.style.display=\'none\'"/>' +
						'<button type="button" class="dg-thumb-x" data-img-remove="' + i + '" title="移除">×</button></div>';
				}).join("")
				: '<span class="dg-img-empty">还没有图片</span>';
		}
		async function uploadFiles(rowEl, files) {
			var rowId = rowEl.getAttribute("data-row-id");
			if (!rowImages[rowId]) rowImages[rowId] = [];
			// 读取本行选中的上传目标（图床 / 仓库本地）—— 方案 A 可选
			var channelRadio = rowEl.querySelector('input[name^="dg-channel"]:checked');
			var channel = (channelRadio && channelRadio.value) || "imgbed";
			var activeFolder = channel === "repo" ? REPO_FOLDER : IMGBED_FOLDER;
			var verb = channel === "repo" ? "仓库" : "图床";

			var tip = rowEl.querySelector("[data-img-tip]");
			var btn = rowEl.querySelector('[data-act="upload-img"]');
			if (btn) btn.disabled = true;
			var done = 0, reused = 0, shaDup = 0, urlDup = 0;
			if (tip) { tip.classList.remove("is-error"); tip.textContent = "上传中 0/" + files.length; }
			try {
			// 可选：拉图床目录做强去重（要 API Token，5min 缓存）；仓库本地不做远程查重
			var remoteMap = channel === "imgbed" ? await loadImgbedRemoteIndex(IMGBED_FOLDER) : null;
				for (var i = 0; i < files.length; i++) {
					var file = files[i];
					// 去重 0：跨会话——文件名匹配（localStorage 历史表 + 可选图床目录）
					var existing = lookupFilenameIndex(activeFolder, file.name);
					if (!existing && remoteMap) existing = remoteMap[file.name];
					if (existing && existing.url) {
						if (rowImages[rowId].indexOf(existing.url) === -1) rowImages[rowId].push(existing.url);
						// 同时把哈希记到 uploadedHashes，让本会话按内容也跳过
						var h0 = await hashFile(file);
						if (h0) uploadedHashes[h0] = existing.url;
						reused++;
						if (tip) tip.textContent = "已复用" + verb + "已有同名 " + reused + " · 上传 " + done + "/" + files.length;
						renderImagePreview(rowEl);
						continue;
					}
					// 去重 1：本次会话内同一文件（同哈希）已上传过 → 直接复用 URL，不再上传
					var h = await hashFile(file);
					if (h && uploadedHashes[h]) {
						if (rowImages[rowId].indexOf(uploadedHashes[h]) === -1) {
							rowImages[rowId].push(uploadedHashes[h]);
						}
						shaDup++;
						if (tip) tip.textContent = "已跳过重复 " + shaDup + " · 上传 " + done + "/" + files.length;
						renderImagePreview(rowEl);
						continue;
					}
					var url = channel === "repo" ? await uploadToRepo(file) : await uploadToImgbed(file);
					if (h) uploadedHashes[h] = url;
					// 去重 2：同 URL 不重复进数组（防御图床返回重复链接）
					if (rowImages[rowId].indexOf(url) === -1) {
						rowImages[rowId].push(url);
					} else {
						urlDup++;
					}
					// 去重 3：把「原始文件名 → URL」写进 localStorage，下次同文件直接复用
					writeFilenameIndex(activeFolder, file.name, url);
					// 同步图床目录缓存（避免后续命中还走网络）
					if (remoteMap) remoteMap[file.name] = url;
					done++;
					if (tip) tip.textContent = "上传 " + done + "/" + files.length + (reused ? " · 复用 " + reused : "") + (shaDup ? " · 跳过 " + shaDup : "");
					renderImagePreview(rowEl);
				}
				// 最终提示：优先用「复用」字眼（比「已上传 0 张」更有用）
				if (tip) {
					if (done > 0) {
						var parts = ["已上传 " + done + " 张"];
						if (reused) parts.push("复用 " + reused);
						if (shaDup) parts.push("跳过 " + shaDup);
						if (urlDup) parts.push("URL 已存在 " + urlDup);
						tip.textContent = parts.join(" · ");
					} else {
						// 零上传场景：明确告诉用户没浪费图床空间
						var parts2 = [];
						if (reused) parts2.push("复用图床已有 " + reused + " 张（零上传）");
						if (shaDup) parts2.push("跳过同会话 " + shaDup + " 张（零上传）");
						if (urlDup) parts2.push("URL 已存在 " + urlDup + " 张");
						tip.textContent = parts2.join(" · ") || "无可上传";
					}
				}
			} catch (e) {
				if (tip) { tip.classList.add("is-error"); tip.textContent = "❌ " + e.message; }
			} finally {
				if (btn) btn.disabled = false;
			}
		}

		// ===== 列表渲染 =====
		function renderList() {
			var list = $("dg-editor-list");
			if (!list) return;
			$("dg-editor-count").textContent = state.items.length;
			if (state.items.length === 0) {
				list.innerHTML = '<div class="dg-editor-empty">暂无吐槽，点击上方「+ 新增吐槽」开始</div>';
				return;
			}
			var html = state.items.map(function (it) {
				var isEditing = state.editingId === it.id;
				if (isEditing) {
					return '<div class="dg-row is-editing" data-row-id="' + escHtml(it.id) + '">' + renderForm(it) + "</div>";
				}
				var imgCount = (it.images || []).length;
				var tagsHtml = (it.tags || []).map(function (t) {
					return '<span class="dg-row-badge" style="background:var(--primary,#6366f1);">#' + escHtml(t) + "</span>";
				}).join("");
				return (
					'<div class="dg-row" data-row-id="' + escHtml(it.id) + '">' +
						'<div class="dg-row-info">' +
							(it.pinned ? '<span class="dg-row-badge" style="background:#f59e0b;">📌 置顶</span>' : '') +
							'<div class="dg-row-title">' + escHtml((it.content || "(空)").slice(0, 60)) + "</div>" +
							'<div class="dg-row-meta">' +
								(it.date ? "<span>🕒 " + escHtml(it.date) + "</span>" : "") +
								(it.location ? "<span>📍 " + escHtml(it.location) + "</span>" : "") +
								(imgCount ? "<span>🖼 " + imgCount + " 图</span>" : "") +
								tagsHtml +
							"</div>" +
						"</div>" +
						'<div class="dg-row-actions">' +
							'<button type="button" class="dg-row-act" data-act="edit" data-id="' + escHtml(it.id) + '">编辑</button>' +
							'<button type="button" class="dg-row-act dg-row-act-danger" data-act="del" data-id="' + escHtml(it.id) + '">删除</button>' +
						"</div>" +
					"</div>"
				);
			}).join("");
			list.innerHTML = html;
			// 编辑态：初始化图片 state + 预览
			state.items.forEach(function (it) {
				if (state.editingId === it.id) {
					var rowEl = list.querySelector('.dg-row[data-row-id="' + cssEscape(it.id) + '"]');
					if (rowEl) {
						// 进入编辑态时合并已存的重复 URL（Array.from(new Set) 去重）
						rowImages[it.id] = Array.from(new Set(it.images || []));
						renderImagePreview(rowEl);
					}
				}
			});
		}
		function cssEscape(s) {
			return String(s).replace(/["\\]/g, "\\$&");
		}

		function renderForm(item) {
			var tagsVal = (item.tags || []).join(", ");
			var dateVal = item.date || nowLocal();
			return (
				'<div class="dg-form-grid">' +
					'<div class="dg-form-field dg-form-full">' +
						'<label>正文（支持 Markdown）*</label>' +
						'<textarea class="dg-editor-textarea" data-f="content" rows="5" placeholder="说点什么…">' + escHtml(item.content || "") + "</textarea>" +
					"</div>" +
					'<div class="dg-form-field">' +
						'<label>时间</label>' +
						'<input type="text" class="dg-editor-input-sm" data-f="date" value="' + escHtml(dateVal) + '" placeholder="YYYY-MM-DD HH:mm" />' +
					"</div>" +
					'<div class="dg-form-field">' +
						'<label>地点</label>' +
						'<input type="text" class="dg-editor-input-sm" data-f="location" value="' + escHtml(item.location || "") + '" placeholder="如 杭州" />' +
					"</div>" +
					'<div class="dg-form-field dg-form-full">' +
						'<label>标签（逗号分隔）</label>' +
						'<input type="text" class="dg-editor-input-sm" data-f="tags" value="' + escHtml(tagsVal) + '" placeholder="测试, 吐槽" />' +
					"</div>" +
					'<div class="dg-form-field dg-form-full">' +
						'<label>图片</label>' +
						'<div class="dg-img-preview" data-img-preview></div>' +
						'<div class="dg-img-actions">' +
							'<div class="dg-channel-seg" role="radiogroup" aria-label="上传目标">' +
								'<label class="dg-channel-opt"><input type="radio" name="dg-channel-' + escHtml(item.id || "new") + '" value="imgbed" checked /> 图床</label>' +
								'<label class="dg-channel-opt"><input type="radio" name="dg-channel-' + escHtml(item.id || "new") + '" value="repo" /> 仓库本地</label>' +
							'</div>' +
							'<button type="button" class="dg-editor-btn dg-form-upload-btn" data-act="upload-img">📤 上传图片</button>' +
							'<input type="file" accept="image/*" multiple hidden data-img-input />' +
							'<span class="dg-editor-label-tip" data-img-tip>支持多张</span>' +
						"</div>" +
						'<p class="dg-editor-label-tip dg-channel-desc">图床：直传 CloudFlare 图床（外链，省仓库空间）。仓库本地（方案 A）：直接存到 GitHub 仓库 <code>public/assets/images/moments/</code>，部署后本地加载更快、不依赖图床。</p>' +
					"</div>" +
					'<div class="dg-form-field">' +
						'<label>唯一 ID</label>' +
						'<input type="text" class="dg-editor-input-sm" data-f="id" value="' + escHtml(item.id || "") + '" />' +
					"</div>" +
					'<div class="dg-form-field dg-form-check">' +
						'<label><input type="checkbox" data-f="pinned" ' + (item.pinned ? "checked" : "") + " /> 置顶</label>" +
					"</div>" +
					'<div class="dg-form-actions">' +
						'<button type="button" class="dg-editor-btn" data-act="cancel">取消</button>' +
						'<button type="button" class="dg-editor-btn dg-editor-btn-primary" data-act="save-row">保存这条</button>' +
					"</div>" +
				"</div>"
			);
		}

		function collectForm(rowEl) {
			var item = { id: "", content: "", images: [] };
			rowEl.querySelectorAll("[data-f]").forEach(function (inp) {
				var k = inp.getAttribute("data-f");
				var v;
				if (inp.type === "checkbox") v = inp.checked;
				else v = inp.value;
				if (k === "tags") v = v.split(",").map(function (x) { return x.trim(); }).filter(Boolean);
				if (k === "images") return; // 单独处理
				item[k] = v;
			});
			var rowId = rowEl.getAttribute("data-row-id");
			item.images = (rowImages[rowId] || []).slice();
			// 清理可选空字段
			if (!item.images || item.images.length === 0) delete item.images;
			if (!item.tags || item.tags.length === 0) delete item.tags;
			if (item.location === "" || item.location == null) delete item.location;
			if (item.date === "" || item.date == null) delete item.date;
			if (item.pinned === false || item.pinned == null) delete item.pinned;
			return item;
		}

		// ===== 事件 =====
		function openEditor() {
			var dlg = $("dg-editor");
			if (!dlg) return;
			if (typeof dlg.showModal === "function") dlg.showModal();
			else dlg.setAttribute("open", "");
			var patInput = $("dg-editor-pat");
			if (patInput) { patInput.value = getPat(); setTimeout(function () { patInput.focus(); }, 50); }
			refreshImgbedStatus();
			renderSessionState();
			if (getPat() && state.items.length === 0 && !state.sourceContent) loadRemote();
		}
		function closeEditor() {
			var dlg = $("dg-editor");
			if (!dlg) return;
			if (typeof dlg.close === "function") dlg.close();
			else dlg.removeAttribute("open");
			state.editingId = null;
		}

var _dgBound = new WeakSet();
	function bind() {
		var root = $("dg-editor"); if (root && _dgBound.has(root)) return;
		var openBtn = $("dg-open-editor");
			if (openBtn) openBtn.addEventListener("click", openEditor);
			$("dg-editor-close")?.addEventListener("click", closeEditor);
			$("dg-editor-cancel")?.addEventListener("click", closeEditor);
			$("dg-editor")?.addEventListener("click", function (e) { if (e.target === $("dg-editor")) closeEditor(); });
			$("dg-editor")?.addEventListener("cancel", function (e) { e.preventDefault(); closeEditor(); });

			$("dg-editor-pat")?.addEventListener("input", function (e) {
				// 修改输入即视为未验证，清除会话令牌，需重新点「验证令牌」
				if (sessionStorage.getItem(PAT_STORAGE_KEY)) {
					sessionStorage.removeItem(PAT_STORAGE_KEY);
					renderSessionState();
				}
			});
			$("dg-editor-pat-toggle")?.addEventListener("click", function () {
				var inp = $("dg-editor-pat"); if (!inp) return;
				inp.type = inp.type === "password" ? "text" : "password";
			});
			$("dg-editor-pat-validate")?.addEventListener("click", async function () {
				var inp = $("dg-editor-pat");
				if (!inp || !inp.value.trim()) { setStatus($("dg-editor-status"), "请先填写 GitHub PAT", "error"); return; }
				this.disabled = true;
				setStatus($("dg-editor-status"), "正在校验令牌...", "");
				try {
					await validatePat(inp.value.trim());
					setPat(inp.value.trim());
					setStatus($("dg-editor-status"), "✓ 令牌有效，本次浏览期间免重复输入", "ok");
					renderSessionState();
				} catch (e) {
					setStatus($("dg-editor-status"), "✗ " + e.message, "error");
				} finally {
					this.disabled = false;
				}
			});
			$("dg-editor-pat-clear")?.addEventListener("click", function () {
				if (!confirm("确定退出本次浏览会话（清除已验证的令牌）？")) return;
				setPat(""); var inp = $("dg-editor-pat"); if (inp) inp.value = "";
				setStatus($("dg-editor-status"), "已退出会话，下次需重新验证", "ok");
				renderSessionState();
			});

			$("dg-editor-load")?.addEventListener("click", function () { state.editingId = null; loadRemote(); });
			$("dg-editor-add")?.addEventListener("click", function () {
				var newItem = { id: genId("grumble"), content: "", date: nowLocal(), images: [] };
				state.items.unshift(newItem);
				state.editingId = newItem.id;
				renderList();
				scheduleDraftSave();
			});
			$("dg-editor-save")?.addEventListener("click", saveDraftLocal);

			// 列表点击（编辑/删除/上传按钮/移除图片）
			$("dg-editor-list")?.addEventListener("click", function (e) {
				// 移除图片
				var rm = e.target.closest("[data-img-remove]");
				if (rm) {
					var rEl = rm.closest(".dg-row");
					var rid = rEl.getAttribute("data-row-id");
					var idx = parseInt(rm.getAttribute("data-img-remove"), 10);
					if (rowImages[rid]) rowImages[rid].splice(idx, 1);
					renderImagePreview(rEl);
					return;
				}
				var btn = e.target.closest("[data-act]");
				if (!btn) return;
				var act = btn.getAttribute("data-act");
				var id = btn.getAttribute("data-id");
				var rowEl = btn.closest(".dg-row");
				if (act === "edit") {
					state.editingId = id; renderList();
				} else if (act === "del") {
					if (!confirm("确定删除这条吐槽？")) return;
					state.items = state.items.filter(function (x) { return x.id !== id; });
					if (state.editingId === id) state.editingId = null;
					renderList();
					scheduleDraftSave();
				} else if (act === "cancel") {
					var item = state.items.find(function (x) { return x.id === state.editingId; });
					if (item && !item.content) {
						state.items = state.items.filter(function (x) { return x.id !== state.editingId; });
					}
					state.editingId = null; renderList();
				} else if (act === "save-row") {
					if (!rowEl) return;
					var data = collectForm(rowEl);
					if (!data.content || !data.content.trim()) { alert("请填写正文"); return; }
					var idx = state.items.findIndex(function (x) { return x.id === state.editingId; });
					if (idx >= 0) {
						if (data.id !== state.editingId && state.items.some(function (x) { return x.id === data.id; })) {
							alert("ID 已被占用：" + data.id); return;
						}
					state.items[idx] = data;
				}
				state.editingId = null; renderList();
				scheduleDraftSave();
			} else if (act === "upload-img") {
					var fileInput = rowEl && rowEl.querySelector("[data-img-input]");
					if (fileInput) fileInput.click();
				}
			});

			// 文件选择 → 上传
			$("dg-editor-list")?.addEventListener("change", function (e) {
				var inp = e.target.closest("[data-img-input]");
				if (!inp) return;
				var rowEl = inp.closest(".dg-row");
				if (!rowEl) return;
				var files = Array.from(inp.files || []);
				if (!files.length) return;
				uploadFiles(rowEl, files);
				inp.value = "";
				scheduleDraftSave();
			});
				if (root) _dgBound.add(root);
	}

		// ===== 初始化 =====
		function refreshImgbedStatus() {
			var el = $("dg-imgbed-status");
			if (!el) return;
			var idx = loadFilenameIndex();
			var n = Object.keys(idx).length;
			var parts = [];
			parts.push("📁 上传目录：<b>" + escHtml(IMGBED_FOLDER || "(根)") + "</b>");
			parts.push("📚 本地文件名索引：<b>" + n + "</b> 个");
			parts.push(IMGBED_API_TOKEN
				? "🌐 跨浏览器同步：<b style=\"color:#10b981;\">已启用</b>（API Token · 5min 缓存）"
				: "🌐 跨浏览器同步：<b style=\"color:#f59e0b;\">未启用</b>（在 .env 配置 PUBLIC_IMG_UPLOAD_TOKEN 启用）");
			parts.push("🗂 方案 A：选「仓库本地」即直传 GitHub 仓库（本地加载，不依赖图床）");
			el.innerHTML = "上传目标 · " + parts.join(" · ");
		}
		function init() {
			// 从 seed 直接填充编辑器列表（无需先「加载远端」）
			var seedEl = document.getElementById("dg-seed");
			if (seedEl) {
				try {
					var seed = JSON.parse(seedEl.textContent || "[]");
					if (Array.isArray(seed)) state.items = seed;
				} catch (_e) {}
			}
			// 用构建期注入的完整源作为序列化模板（无需先「加载远端」即可生成草稿文件）
			var srcSeed = document.getElementById("dg-source-seed");
			if (srcSeed && srcSeed.textContent && !state.sourceContent) {
				try { state.sourceContent = JSON.parse(srcSeed.textContent); } catch (_e) {}
			}
			bind();
			renderList();
			refreshImgbedStatus();
			// 公开列表的空状态
			var emptyEl = document.querySelector("[data-dg-empty]");
			if (emptyEl) emptyEl.style.display = state.items.length === 0 ? "" : "none";
			// 恢复本地未上传草稿（覆盖远程内容，断点续编）
			restoreDraft();
		}
		
	
// ===== 引导入口（由 Layout 持久化脚本在首屏与每次 Swup 切换后调用）=====
export function bootDailyGrumble() {
  const root = document.getElementById("dg-editor");
  if (!root) return; // 不在日常吐槽页，直接跳过
  // 每次重新读取配置（Swup 切换后 DOM 已是新节点）
  IMGBED_URL = root.getAttribute("data-imgbed-url") || "";
  IMGBED_AUTH = root.getAttribute("data-imgbed-auth") || "";
  IMGBED_FOLDER = root.getAttribute("data-imgbed-folder") || "";
  IMGBED_API_TOKEN = root.getAttribute("data-imgbed-token") || "";
  init();
  bind();
}
