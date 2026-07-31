/**
 * 编辑器「烘焙凭据」配置（仅站点 owner 自用）
 * --------------------------------------------------------------------------
 * 目的：把 token 预置进客户端，避免每次打开编辑器都要手填。
 *
 * ⚠️ 重要安全说明（务必读完）：
 * 本文件会被 Astro 打包进客户端 JS，最终出现在公开仓库（FeiZhouHeShang/blog）
 * 与部署产物里，任何人查看页面源码都能拿到这里的明文。因此：
 *
 *  - tmdbApiToken：TMDB **只读**令牌（scope = api_read）。泄露风险低，
 *    顶多被人拿去刷 TMDB 接口；可在 https://www.themoviedb.org/settings/api
 *    随时吊销重发。可放心烘焙。
 *
 *  - githubPat：**不要**轻易填这里。GitHub PAT 带写入权限，烤进公开仓库等于
 *    把仓库写权限公开。如必须填，务必用 fine-grained PAT，且只授权本仓库的
 *    Contents: Read and write，并随时可吊销。更安全的做法是用 Cloudflare Worker
 *    代理（PAT 存为 Cloudflare Secret，永不进客户端），见 .workbuddy/memory。
 *
 *  - imageBed*：CloudFlare ImgBed 图床。图床「地址 / 上传目录」是非机密配置，
 *    保留在此（可提交）；而**图床秘钥（上传认证码 / API Token）已移出源码，
 *    改走环境变量**，绝不写进仓库：
 *      · PUBLIC_IMG_UPLOAD_TOKEN  → 图床 API Token（Bearer），用于跨浏览器「拉目录查重」
 *      · PUBLIC_IMGBED_UPLOAD_CODE → 图床上传认证码（authCode），用于 /upload 直传
 *    两者在 .env（本地）与部署平台的环境变量里配置。前端直传本就暴露凭证，故图床
 *    秘钥应为「可吊销低危凭证」（仅能传图 / 读目录），后台可随时改值失效。
 *
 * 编辑器取值优先级（GitHub PAT）：浏览器 localStorage（你手填的）> 本文件默认值。
 * 即：你在本文件填了，首次打开会自动带出；之后手改过的以 localStorage 为准。
 */

export interface EditorSecrets {
	/** TMDB 只读令牌（v4 JWT 或 v3 key 皆可，编辑器自动识别） */
	tmdbApiToken: string;
	/** GitHub fine-grained PAT（可选；写入权限，慎填，见上方说明） */
	githubPat: string;
	/** 图床部署地址（不带末尾斜杠），如 https://tc.d15.cc.cd —— 非机密，可提交 */
	imageBedUrl: string;
	/** 图床上传目录（相对路径，留空传根目录）—— 非机密，可提交 */
	imageBedFolder: string;
}

export const editorSecrets: EditorSecrets = {
	// 用户提供的 TMDB v4 只读令牌（scope: api_read）
	// ⚠️ 重要：TMDB 官方 API 不返回 CORS 头，浏览器直连会被同源策略拦截，
	// 因此前端（movies-games.astro）必须「经 CORS 代理」请求 TMDB，代理链见该文件 TMDB_PROXIES。
	// 令牌经手第三方代理风险低、可在 TMDB 后台随时吊销。若要生产级稳定且不暴露令牌，
	// 应自建 Vercel serverless / Cloudflare Worker 代理（把令牌移出客户端）。
	tmdbApiToken:
		"eyJhbGciOiJIUzI1NiJ9.eyJhdWQiOiI5OTU3M2M3ODA5Y2Q4YTVkYzkyZmFjZWFjMmU1ZTQ2NSIsIm5iZiI6MTc4NTIyOTM5MS43MTgwMDAyLCJzdWIiOiI2YTY4NzA0ZjUzZmQ4MGUwNzUwZmZmNmEiLCJzY29wZXMiOlsiYXBpX3JlYWQiXSwidmVyc2lvbiI6MX0.XRo6biktco53_yEs54GvrMmxRt4WY4R4YJDIJxM45D0",
	// 留空 = 保存时仍需在编辑器里填 GitHub PAT（推荐）。
	// 如要免填，填一个 fine-grained PAT（仅本仓库 Contents: RW），自负风险。
	githubPat: "",
	// 用户部署的 CloudFlare ImgBed 图床（日常吐槽编辑器图片直传用）—— 非机密
	imageBedUrl: "https://tc.d15.cc.cd",
	// 上传目录：吐槽图片统一归到「日常吐槽」文件夹（图床里按此目录分类存放）—— 非机密
	imageBedFolder: "日常吐槽",
	// ⚠️ 图床秘钥已移出源码 → 改由环境变量注入（详见 .env / 部署平台）：
	//    PUBLIC_IMGBED_UPLOAD_CODE  → /upload 直传用 authCode
	//    PUBLIC_IMG_UPLOAD_TOKEN     → /api/manage/list 查重用 Bearer Token
};
