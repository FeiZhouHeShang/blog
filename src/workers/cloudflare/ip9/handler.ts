/**
 * [关键词: ip9-proxy] 由 Cloudflare Worker 端代理 ip9.com.cn 的 IP 归属地查询
 *
 * 为什么需要代理：ip9.com.cn 既不支持 CORS、也不支持 JSONP，浏览器端无法直接 fetch。
 * 而 Worker / Serverless 端发起的请求不受浏览器同源策略限制，所以在这里转发，
 * 返回精简后的中文结构化数据给前端（/api/ip9）。
 *
 * 返回字段：ip / country / prov / city / area / isp / lng / lat
 * 失败时返回 502，前端会据此自动回退到 vore.top → pconline → ipwho.is 链路。
 */

export async function handleIp9(_request: Request): Promise<Response> {
	try {
		const upstream = await fetch("https://ip9.com.cn/get", {
			headers: { "User-Agent": "Mozilla/5.0" },
		});
		if (!upstream.ok) throw new Error("upstream http " + upstream.status);

		const json = (await upstream.json()) as any;
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
				// 访客 IP 短期内不会变，缓存 5 分钟，减轻 ip9 压力
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
