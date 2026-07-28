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
 *  - imageBed*：CloudFlare ImgBed 图床。前端编辑器要「直接上传图片到图床」，
 *    认证码（authCode）必须出现在浏览器 JS 里——没有后端可代理，所以只能烘焙。
 *    风险：拿到 authCode 的人可往你的图床传图（占用空间），但拿不到仓库/其他凭据。
 *    图床后台可随时改认证码让旧值失效。和 TMDB 只读令牌同理，属可接受暴露。
 *
 *    imageBedApiToken：图床 API Token（**可选**）。从图床后台「安全设置 → API
 *    Token」生成，至少勾选 `list` 权限。烘焙后，前端能主动拉取图床目录列表，
 *    做到"按图床现有文件名匹配去重"——比 localStorage 表更强（多浏览器同步）。
 *    拿到 token 的人可读你的图床文件清单（不暴露内容，但能猜出命名规则），属
 *    低风险。要严格保密可留空：留空时退化为 localStorage 跨会话去重。
 *
 * 编辑器取值优先级：浏览器 localStorage（你手填的）> 本文件默认值。
 * 即：你在本文件填了，首次打开会自动带出；之后手改过的以 localStorage 为准。
 */

export interface EditorSecrets {
	/** TMDB 只读令牌（v4 JWT 或 v3 key 皆可，编辑器自动识别） */
	tmdbApiToken: string;
	/** GitHub fine-grained PAT（可选；写入权限，慎填，见上方说明） */
	githubPat: string;
	/** 图床部署地址（不带末尾斜杠），如 https://tc.d15.cc.cd */
	imageBedUrl: string;
	/** 图床上传认证码（authCode），用于 POST /upload，前端直传必需 */
	imageBedAuthCode: string;
	/** 图床上传目录（相对路径，留空传根目录） */
	imageBedFolder: string;
	/** 图床 API Token（可选；带 list 权限可启用「拉图床目录」强去重；留空走 localStorage） */
	imageBedApiToken: string;
}

export const editorSecrets: EditorSecrets = {
	// 用户提供的 TMDB v4 只读令牌（scope: api_read）
	tmdbApiToken:
		"eyJhbGciOiJIUzI1NiJ9.eyJhdWQiOiI5OTU3M2M3ODA5Y2Q4YTVkYzkyZmFjZWFjMmU1ZTQ2NSIsIm5iZiI6MTc4NTIyOTM5MS43MTgwMDAyLCJzdWIiOiI2YTY4NzA0ZjUzZmQ4MGUwNzUwZmZmNmEiLCJzY29wZXMiOlsiYXBpX3JlYWQiXSwidmVyc2lvbiI6MX0.XRo6biktco53_yEs54GvrMmxRt4WY4R4YJDIJxM45D0",
	// 留空 = 保存时仍需在编辑器里填 GitHub PAT（推荐）。
	// 如要免填，填一个 fine-grained PAT（仅本仓库 Contents: RW），自负风险。
	githubPat: "",
	// 用户部署的 CloudFlare ImgBed 图床（日常吐槽编辑器图片直传用）
	imageBedUrl: "https://tc.d15.cc.cd",
	imageBedAuthCode:
		"imgbed_a52f54222feea59a225e2a64cde089bca845ddb4f9f3f4e1aa5c413d3463c88e",
	// 上传目录：吐槽图片统一归到「日常吐槽」文件夹（图床里按此目录分类存放）
	imageBedFolder: "日常吐槽",
	// 可选：图床 API Token（带 list 权限可启用「拉图床目录」强去重）
	// 在图床后台「安全设置 → API Token」生成，至少勾选 list 权限。
	// 留空 = 退化为 localStorage 跨会话去重（够用，但不同浏览器不同步）。
	imageBedApiToken: "",
};
