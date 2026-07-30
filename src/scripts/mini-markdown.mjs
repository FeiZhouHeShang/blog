// 轻量级客户端 Markdown 渲染器 —— prod 静态托管下「编辑器实时预览」兜底
// （dev 与 prod 统一走此模块；Astro 6.4 dev server 会吞掉 POST body，SSR 预览端点暂不启用）。
// 设计目标：输出**语义化标准 HTML**（h1-h6 / p / ul / ol / blockquote / pre / table / a / img …），
// 由 #pe-preview 上的 `prose dark:prose-invert custom-md` 直接套用，预览外观 ≈ 发布页。
// 仅 callout / katex / mermaid / plantuml 为非标准块，用 .md-* 类单独样式（见 posts-editor.astro 全局样式）。
// 覆盖：标题 H1-H6、加粗/斜体/删除、行内/围栏代码、链接、图片、引用（含 callout）、
//       有序/无序/嵌套列表、任务列表、表格、分割线、围栏 callout、$$ 公式、:::mermaid/plantuml。
// XSS 防护：所有文本先 esc()，仅行内代码 / 链接 / 图片用占位抽离后再还原。

/** HTML 转义 */
function esc(s) {
	return String(s)
		.replace(/&/g, "&amp;")
		.replace(/</g, "&lt;")
		.replace(/>/g, "&gt;")
		.replace(/"/g, "&quot;")
		.replace(/'/g, "&#39;");
}

/** 行内格式：加粗/斜体/删除/行内代码/链接/图片。输入为未转义的纯文本段。 */
function inline(t) {
	// 1) 行内代码抽离（内部不再被其他规则处理）
	const codeStash = [];
	t = t.replace(/`([^`\n]+?)`/g, function (_, c) {
		codeStash.push("<code>" + esc(c) + "</code>");
		return "\u0000C" + (codeStash.length - 1) + "\u0000";
	});
	// 2) 图片 / 链接抽离（url 与文本分别转义）
	const linkStash = [];
	t = t.replace(/!\[([^\]]*)\]\(([^)\s]+)(?:\s+"([^"]*)")?\)/g, function (_, alt, src) {
		linkStash.push('<img src="' + esc(src) + '" alt="' + esc(alt) + '" loading="lazy" decoding="async" />');
		return "\u0000L" + (linkStash.length - 1) + "\u0000";
	});
	t = t.replace(/\[([^\]]+)\]\(([^)\s]+)(?:\s+"([^"]*)")?\)/g, function (_, txt, url) {
		linkStash.push('<a href="' + esc(url) + '" target="_blank" rel="noopener noreferrer">' + esc(txt) + "</a>");
		return "\u0000L" + (linkStash.length - 1) + "\u0000";
	});
	// 3) 转义其余文本（* _ ~ [ ] ( ) 等标记符不会被 esc 影响）
	t = esc(t);
	// 4) 行内强调
	t = t.replace(/\*\*([^*\n]+?)\*\*/g, "<strong>$1</strong>");
	t = t.replace(/__([^_\n]+?)__/g, "<strong>$1</strong>");
	t = t.replace(/(^|[^*])\*([^*\n]+?)\*(?!\*)/g, "$1<em>$2</em>");
	t = t.replace(/(^|[^_])_([^_\n]+?)_(?!_)/g, "$1<em>$2</em>");
	t = t.replace(/~~([^~\n]+?)~~/g, "<del>$1</del>");
	// 5) 还原占位
	t = t.replace(/\u0000C(\d+)\u0000/g, function (_, i) { return codeStash[+i] || ""; });
	t = t.replace(/\u0000L(\d+)\u0000/g, function (_, i) { return linkStash[+i] || ""; });
	return t;
}

/** 嵌套列表渲染（按缩进 2 空格分级） */
function renderList(lines) {
	const items = lines.map(function (l) {
		const m = l.match(/^(\s*)([-*+]|\d+\.)\s+(.*)$/);
		if (!m) return null;
		const indent = (m[1] || "").replace(/\t/g, "  ").length;
		const ordered = /\d+\./.test(m[2]);
		let content = m[3];
		let checked = null;
		const tm = content.match(/^\[( |x|X)\]\s+(.*)$/);
		if (tm) { checked = tm[1].toLowerCase() === "x"; content = tm[2]; }
		return { indent: indent, ordered: ordered, content: content, checked: checked };
	}).filter(Boolean);
	if (!items.length) return "";
	let i = 0;
	// 递归构建嵌套列表（按缩进分级）
	function build(minIndent) {
		let out = "";
		let firstOrdered = null;
		while (i < items.length) {
			const it = items[i];
			if (it.indent < minIndent) break;          // 本级结束
			if (it.indent > minIndent) { i++; continue; } // 跳过不规则缩进（理论不出现）
			if (firstOrdered === null) firstOrdered = it.ordered;
			i++;
			const liInner = it.checked !== null
				? '<span class="md-task"><input type="checkbox" disabled ' + (it.checked ? "checked" : "") + " /> " + inline(it.content) + "</span>"
				: inline(it.content);
			const children = (i < items.length && items[i].indent > minIndent) ? build(items[i].indent) : "";
			out += "<li>" + liInner + children + "</li>";
		}
		const tag = firstOrdered ? "ol" : "ul";
		return "<" + tag + ">" + out + "</" + tag + ">";
	}
	return build(items[0].indent);
}

/** 块级起点判定（用于段落收集时停止） */
function isBlockStart(l) {
	return /^(#{1,6})\s/.test(l) || /^```/.test(l) || /^>\s?/.test(l) ||
		/^(\s*)([-*+]|\d+\.)\s+/.test(l) || /^(-{3,}|\*{3,}|_{3,})\s*$/.test(l) ||
		/^\|/.test(l) || /^:::(mermaid|plantuml)\s*$/i.test(l) || /^\$\$/.test(l);
}

/** 主入口：markdown 字符串 → HTML */
export function renderMiniMarkdown(md) {
	if (!md || !md.trim()) return "";
	const lines = String(md).replace(/\r\n/g, "\n").split("\n");
	let html = "";
	let i = 0;
	while (i < lines.length) {
		const line = lines[i];

		// 空行
		if (/^\s*$/.test(line)) { i++; continue; }

		// 围栏代码块 ```lang
		const fence = line.match(/^```(\w[\w-]*)?\s*$/);
		if (fence) {
			const lang = fence[1] || "";
			const buf = [];
			i++;
			while (i < lines.length && !/^```\s*$/.test(lines[i])) { buf.push(lines[i]); i++; }
			i++; // 跳过结尾 ```
			html += '<pre class="md-pre not-prose"' + (lang ? ' data-lang="' + esc(lang) + '"' : "") + "><code>" + esc(buf.join("\n")) + "</code></pre>";
			continue;
		}

		// ::: mermaid / plantuml
		const div = line.match(/^:::(mermaid|plantuml)\s*$/i);
		if (div) {
			const kind = div[1].toLowerCase();
			i++;
			while (i < lines.length && !/^:::\s*$/.test(lines[i])) i++;
			i++; // 跳过结尾 :::
			const icon = kind === "mermaid" ? "📊" : "📐";
			const label = kind === "mermaid" ? "Mermaid 图表" : "PlantUML 图表";
			html += '<div class="md-placeholder"><span class="md-placeholder-icon">' + icon + '</span><span>' + label + "（发布页将自动渲染）</span></div>";
			continue;
		}

		// 标题 H1-H6
		const h = line.match(/^(#{1,6})\s+(.*)$/);
		if (h) { const lvl = h[1].length; html += "<h" + lvl + ">" + inline(h[2]) + "</h" + lvl + ">"; i++; continue; }

		// 分割线
		if (/^(-{3,}|\*{3,}|_{3,})\s*$/.test(line)) { html += "<hr />"; i++; continue; }

		// 引用 / callout
		if (/^>\s?/.test(line)) {
			const buf = [];
			while (i < lines.length && /^>\s?/.test(lines[i])) { buf.push(lines[i].replace(/^>\s?/, "")); i++; }
			const first = buf[0] || "";
			const cal = first.match(/^\[!(NOTE|TIP|INFO|WARNING|IMPORTANT|CAUTION|QUOTE)\]\s*(.*)$/i);
			if (cal) {
				const type = cal[1].toLowerCase();
				const rest = [cal[2]].concat(buf.slice(1)).join("\n");
				const body = rest.split("\n").map(inline).join("<br />");
				html += '<div class="md-callout" data-callout="' + esc(type) + '"><div class="md-callout-title">' + esc(type.toUpperCase()) + '</div><div class="md-callout-body">' + body + "</div></div>";
			} else {
				html += "<blockquote>" + buf.map(inline).join("<br />") + "</blockquote>";
			}
			continue;
		}

		// 表格
		if (/^\|/.test(line) && i + 1 < lines.length && /^\s*\|?[\s:|-]+\|?\s*$/.test(lines[i + 1]) && /-/.test(lines[i + 1])) {
			const splitRow = function (r) {
				let t = r.trim();
				if (t.startsWith("|")) t = t.slice(1);
				if (t.endsWith("|")) t = t.slice(0, -1);
				return t.split("|").map(function (c) { return c.trim(); });
			};
			const head = splitRow(line);
			const rows = [];
			i += 2;
			while (i < lines.length && /^\|/.test(lines[i])) { rows.push(splitRow(lines[i])); i++; }
			let t = "<table><thead><tr>" + head.map(function (c) { return "<th>" + inline(c) + "</th>"; }).join("") + "</tr></thead><tbody>";
			rows.forEach(function (r) { t += "<tr>" + r.map(function (c) { return "<td>" + inline(c) + "</td>"; }).join("") + "</tr>"; });
			t += "</tbody></table>";
			html += t;
			continue;
		}

		// 列表（有序/无序，含嵌套）
		if (/^(\s*)([-*+]|\d+\.)\s+/.test(line)) {
			const buf = [];
			while (i < lines.length && (/^(\s*)([-*+]|\d+\.)\s+/.test(lines[i]) || (/^\s+\S/.test(lines[i]) && buf.length))) {
				buf.push(lines[i]); i++;
			}
			html += renderList(buf);
			continue;
		}

		// KaTeX 块 $$
		if (/^\$\$/.test(line)) {
			i++;
			while (i < lines.length && !/^\$\$/.test(lines[i])) i++;
			if (i < lines.length) i++; // 跳过结尾 $$
			html += '<div class="md-placeholder"><span class="md-placeholder-icon">🔢</span><span>KaTeX 公式（发布页将自动渲染）</span></div>';
			continue;
		}

		// 段落：收集到空行或块起点
		const buf = [line];
		i++;
		while (i < lines.length && !/^\s*$/.test(lines[i]) && !isBlockStart(lines[i])) { buf.push(lines[i]); i++; }
		html += "<p>" + buf.map(inline).join("<br />") + "</p>";
	}
	return html;
}
