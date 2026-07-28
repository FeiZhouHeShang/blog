// [关键词: dev-api-ip9] dev 模式下 ip9.com.cn 的代理 endpoint
//
// 为什么需要这个文件：
//   ip9.com.cn 不支持 CORS / JSONP，浏览器 fetch 会被同源策略拦。
//   生产环境（Cloudflare Pages）由 src/workers/cloudflare/ip9/handler.ts 处理 /api/ip9.json。
//   但 dev 模式下 wrangler dev (8787) 不一定在跑，vite 内部 Astro handler 优先处理 /api/*
//   （user vite plugin middleware 拦不到）。所以在 dev 下用这个 Astro SSR endpoint
//   作为本地回退：服务端 fetch ip9.com.cn（不受浏览器 CORS 限制），返回 JSON。
//
// 生产 build 时这个 endpoint 会被预渲染成静态 JSON（无意义），但 CF Worker 会
// 覆盖 /api/ip9.json 路由，所以生产走 Worker；本文件主要在 dev mode 起效。

export async function GET(): Promise<Response> {
	console.log("[ip9 endpoint] called");
	try {
		const upstream = await fetch("https://ip9.com.cn/get", {
			headers: { "User-Agent": "Mozilla/5.0" },
			signal: AbortSignal.timeout(5000),
		});
		if (!upstream.ok) throw new Error("upstream http " + upstream.status);

		const json: any = await upstream.json();
		if (!json || json.ret !== 200 || !json.data) {
			throw new Error("bad payload");
		}
		const d = json.data;
		const payload = {
			ip: d.ip || "",
			country: d.country || "中国",
			prov: d.prov || "",
			city: d.city || "",
			area: d.area || "",
			isp: d.isp || "未知",
			lng: d.lng || "",
			lat: d.lat || "",
		};
		return new Response(JSON.stringify(payload), {
			status: 200,
			headers: {
				"Content-Type": "application/json; charset=utf-8",
				"Cache-Control": "public, max-age=300",
			},
		});
	} catch (e) {
		return new Response(JSON.stringify({ error: String(e) }), {
			status: 502,
			headers: { "Content-Type": "application/json; charset=utf-8" },
		});
	}
}
