// /api/render-preview — 共享 markdown 渲染管线的 SSR 入口。
// 编辑器实时预览、文章预览快照、新文章草稿预览等都走这里。
// dev: 由 Astro dev server 直接运行；prod: 若配了 SSR adapter 也能用，否则 prod 走静态 HTML 副本。
//
// 调用方式：POST { markdown, frontmatter? } → { html }
//
// 注意：Astro 6.4 dev server 在某些场景下 POST body 会被 Vite 中间件吞掉（content-type/length header
// 在 handler 内为 null）。前端 /posts-editor/ 目前统一走客户端 mini-markdown 兜底渲染，
// 本端点保留供构建期 scripts/gen-posts-content.mjs 使用 + 未来 SSR 部署时启用。
import { renderMarkdown } from "@/utils/markdown-render.mjs";

export async function GET() {
	return new Response(
		JSON.stringify({ ok: true, hint: "POST { markdown } → { html }" }),
		{ status: 200, headers: { "Content-Type": "application/json" } },
	);
}

export async function POST({ request }) {
	interface PreviewBody {
		markdown?: string;
		frontmatter?: Record<string, unknown>;
	}
	let body: PreviewBody = {};
	try {
		const txt = await request.text();
		body = txt ? JSON.parse(txt) : {};
	} catch {
		return new Response(JSON.stringify({ error: "invalid JSON body" }), {
			status: 400,
			headers: { "Content-Type": "application/json" },
		});
	}
	const md = typeof body.markdown === "string" ? body.markdown : "";
	try {
		const html = await renderMarkdown(md, { frontmatter: body.frontmatter || {} });
		return new Response(JSON.stringify({ html }), {
			status: 200,
			headers: {
				"Content-Type": "application/json",
				"Cache-Control": "no-store",
			},
		});
	} catch (e) {
		const msg = e instanceof Error ? e.message : String(e);
		return new Response(JSON.stringify({ error: msg }), {
			status: 500,
			headers: { "Content-Type": "application/json" },
		});
	}
}