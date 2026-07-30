// 自动生成，勿手改。重新生成：node scripts/gen-posts-index.mjs
export interface PostIndexItem {
	path: string;
	folder: string;
	slug: string;
	title: string;
	category: string;
	description: string;
	tags: string[];
	published: string;
	updated: string;
	pinned: boolean;
	draft: boolean;
}
export const postsIndex: PostIndexItem[] = [
	{
		"path": "src/content/posts/others/blog-features-summary.md",
		"folder": "others",
		"slug": "blog-features-summary",
		"title": "博客功能全解析 | 配置指南与二次开发手册",
		"category": "学习文档",
		"description": "全面解析博客的所有功能模块、配置选项、修改方法和二次开发指南。包含主题、组件、API集成、部署等完整说明。",
		"tags": [
			"博客",
			"配置指南",
			"二开",
			"Firefly",
			"Astro",
			"萌新"
		],
		"published": "2026-07-28",
		"updated": "2026-07-29",
		"pinned": true,
		"draft": false
	},
	{
		"path": "src/content/posts/others/others-imgbed-auto-upload.md",
		"folder": "others",
		"slug": "others-imgbed-auto-upload",
		"title": "后台图片自动上传到图床教程",
		"category": "博客指南",
		"description": "转载自 团子和蛋糕的博客。介绍如何在博客后台集成 CloudFlare ImgBed 图床，实现图片自动上传、URL 自动回填与上传前查重，免去手动粘贴图床链接的繁琐。",
		"tags": [
			"图床",
			"CloudFlare ImgBed",
			"博客教程",
			"转载"
		],
		"published": "2026-07-28",
		"updated": "",
		"pinned": false,
		"draft": false
	},
	{
		"path": "src/content/posts/others/others-blog-firefly-mod.md",
		"folder": "others",
		"slug": "others-blog-firefly-mod",
		"title": "firefly | 魔改总结",
		"category": "学习文档",
		"description": "基于 Astro、Svelte 和 Cloudflare Workers 的 Firefly 二次开发记录。",
		"tags": [
			"博客",
			"二开",
			"firefly"
		],
		"published": "2026-07-23",
		"updated": "",
		"pinned": false,
		"draft": false
	},
	{
		"path": "src/content/posts/ai/ai-prompt-collection.md",
		"folder": "ai",
		"slug": "ai-prompt-collection",
		"title": "Prompt 收录",
		"category": "学习文档",
		"description": "日常使用 AI 的提示词整合，涵盖前端开发规范、代码约束、组件约束等实用 Prompt 模板。",
		"tags": [
			"AI",
			"Prompt"
		],
		"published": "2026-06-19",
		"updated": "",
		"pinned": false,
		"draft": false
	},
	{
		"path": "src/content/posts/ai/ai-blog-ai-zero-editing.md",
		"folder": "ai",
		"slug": "ai-blog-ai-zero-editing",
		"title": "这个博客《纯AI，零人工》",
		"category": "学习文档",
		"description": "这个博客如何用 AI 从零搭建：定风格、写原型图、生成代码规范、持续优化的完整流程。",
		"tags": [
			"AI",
			"前端",
			"博客"
		],
		"published": "2026-06-14",
		"updated": "",
		"pinned": false,
		"draft": false
	},
	{
		"path": "src/content/posts/ai/ai-openspec-superpowers-workflow.md",
		"folder": "ai",
		"slug": "ai-openspec-superpowers-workflow",
		"title": "OpenSpec + Superpowers",
		"category": "学习文档",
		"description": "OpenSpec 规范驱动开发与 Superpowers 工程化工作流的协同实践，建立\"规范驱动规划 + 流程驱动执行\"的 AI 编程闭环。",
		"tags": [
			"AI",
			"Skill",
			"工作流"
		],
		"published": "2026-06-03",
		"updated": "",
		"pinned": false,
		"draft": false
	},
	{
		"path": "src/content/posts/ai/ai-blog-ai-search-vectorize.md",
		"folder": "ai",
		"slug": "ai-blog-ai-search-vectorize",
		"title": "AI 搜索 | Cloudflare Vectorize 实现问答搜索",
		"category": "设计文档",
		"description": "基于 Cloudflare Vectorize 实现博客 AI 语义搜索，涵盖 Markdown 分块、向量化、RAG 检索及 Worker 流式问答。",
		"tags": [
			"AI",
			"RAG",
			"Cloudflare"
		],
		"published": "2026-05-14",
		"updated": "",
		"pinned": false,
		"draft": false
	},
	{
		"path": "src/content/posts/projects/projects-redis-interaction-cache-design.md",
		"folder": "projects",
		"slug": "projects-redis-interaction-cache-design",
		"title": "Redis | 三种交互数据缓存",
		"category": "实践笔记",
		"description": "基于 Redis 的交互数据缓存设计，对比 Set+MQ、Set+定时扫描、Bitmap+MQ 三种方案的适用边界与兜底降级策略。",
		"tags": [
			"Redis",
			"缓存设计",
			"Bitmap",
			"高性能"
		],
		"published": "2026-05-13",
		"updated": "",
		"pinned": false,
		"draft": false
	},
	{
		"path": "src/content/posts/ai/ai-napcat-astrbot-deployment.md",
		"folder": "ai",
		"slug": "ai-napcat-astrbot-deployment",
		"title": "QQ 机器人 | NapCat + AstrBot",
		"category": "部署文档",
		"description": "使用 Docker Compose 一站式部署 NapCat + AstrBot，从零搭建 AI QQ 机器人，含 OneBot 11 协议对接与风控替代方案。",
		"tags": [
			"AI",
			"Bot",
			"部署"
		],
		"published": "2026-05-12",
		"updated": "",
		"pinned": false,
		"draft": false
	},
	{
		"path": "src/content/posts/projects/projects-java-virtual-thread-async-orchestration.md",
		"folder": "projects",
		"slug": "projects-java-virtual-thread-async-orchestration",
		"title": "虚拟线程 | 异步编排",
		"category": "学习文档",
		"description": "Java 虚拟线程从原理到工程实践，涵盖创建、异步编排、监控调优及企业级并发场景应用。",
		"tags": [
			"Java",
			"虚拟线程",
			"并发编程"
		],
		"published": "2026-05-07",
		"updated": "",
		"pinned": false,
		"draft": false
	},
	{
		"path": "src/content/posts/projects/projects-java-thread-pool-configuration.md",
		"folder": "projects",
		"slug": "projects-java-thread-pool-configuration",
		"title": "线程池 | 配置指南",
		"category": "学习文档",
		"description": "Java ThreadPoolExecutor 核心参数、线程数估算、队列选型与拒绝策略，附带企业级监控与动态调优方案。",
		"tags": [
			"Java",
			"线程池",
			"并发编程"
		],
		"published": "2026-05-07",
		"updated": "",
		"pinned": false,
		"draft": false
	},
	{
		"path": "src/content/posts/others/others-umami-vercel-neon-deployment.md",
		"folder": "others",
		"slug": "others-umami-vercel-neon-deployment",
		"title": "Umami | Vercel + Neon 部署",
		"category": "部署文档",
		"description": "使用 Vercel + Neon 免费部署 Umami 网站统计，记录 Prisma 7 适配、自定义域名绑定及通过 Share API 拉取站点 UV/PV 的接入方式。",
		"tags": [
			"Umami",
			"部署",
			"Vercel"
		],
		"published": "2026-05-07",
		"updated": "",
		"pinned": false,
		"draft": false
	},
	{
		"path": "src/content/posts/projects/projects-redis-bitmap-snowflake-id.md",
		"folder": "projects",
		"slug": "projects-redis-bitmap-snowflake-id",
		"title": "Redis | Bitmap、雪花ID、分布式",
		"category": "实践笔记",
		"description": "Redis Bitmap 结合雪花 ID 在分布式场景下的三大陷阱：首次写入 O(offset) 卡顿、哈希碰撞风险、单线程阻塞，最终给出 String+Set 替代方案。",
		"tags": [
			"Redis",
			"Bitmap",
			"分布式",
			"性能优化"
		],
		"published": "2026-05-06",
		"updated": "",
		"pinned": false,
		"draft": false
	},
	{
		"path": "src/content/posts/projects/projects-token-storage-jwt-design.md",
		"folder": "projects",
		"slug": "projects-token-storage-jwt-design",
		"title": "登录 | 前后端 token 存储方案",
		"category": "设计文档",
		"description": "ZSK-Cloud 从单 Token 演进为 Access+Refresh 双令牌的认证体系设计，采用 HttpOnly Cookie 存储 + Redis 白名单吊销机制。",
		"tags": [
			"JWT",
			"认证",
			"安全"
		],
		"published": "2026-05-04",
		"updated": "",
		"pinned": false,
		"draft": false
	},
	{
		"path": "src/content/posts/projects/projects-oauth2-third-party-login.md",
		"folder": "projects",
		"slug": "projects-oauth2-third-party-login",
		"title": "登录 | 第三方登录",
		"category": "设计文档",
		"description": "GitHub、微信、QQ 三种第三方登录的 OAuth2 授权码流程设计，涵盖回调处理、策略模式代码结构及多环境配置。",
		"tags": [
			"OAuth2",
			"认证",
			"登录"
		],
		"published": "2026-05-03",
		"updated": "",
		"pinned": false,
		"draft": false
	},
	{
		"path": "src/content/posts/projects/projects-auth-flow-zsk-auth.md",
		"folder": "projects",
		"slug": "projects-auth-flow-zsk-auth",
		"title": "登录 | 滑块验证码、登录与注册完整流程",
		"category": "设计文档",
		"description": "zsk-auth 认证模块的登录与注册完整流程，涵盖滑块验证码防刷、RSA 加密传输、BCrypt 哈希存储、邮箱验证码身份核验等安全机制。",
		"tags": [
			"认证",
			"登录",
			"安全"
		],
		"published": "2026-05-02",
		"updated": "",
		"pinned": false,
		"draft": false
	},
	{
		"path": "src/content/posts/projects/projects-qrcode-login-java-comparison.md",
		"folder": "projects",
		"slug": "projects-qrcode-login-java-comparison",
		"title": "登录 | 扫码登录",
		"category": "实践笔记",
		"description": "对比短轮询、长轮询、WebSocket、SSE 四种扫码登录方案，给出基于 WebSocket + Redis 的企业级实现及安全防御。",
		"tags": [
			"扫码登录",
			"认证",
			"WebSocket"
		],
		"published": "2026-05-01",
		"updated": "",
		"pinned": false,
		"draft": false
	},
	{
		"path": "src/content/posts/projects/projects-object-storage-presigned-url.md",
		"folder": "projects",
		"slug": "projects-object-storage-presigned-url",
		"title": "MinIO | 文件存储签名 URL 有效期机制",
		"category": "学习文档",
		"description": "MinIO 签名 URL 的工作原理、7 天有效期限制及安全考量，对比预签名上传与下载的两种访问模式。",
		"tags": [
			"MinIO",
			"对象存储",
			"安全"
		],
		"published": "2026-05-01",
		"updated": "",
		"pinned": false,
		"draft": false
	},
	{
		"path": "src/content/posts/projects/projects-magic-link-login-design.md",
		"folder": "projects",
		"slug": "projects-magic-link-login-design",
		"title": "登录 | 魔法链接",
		"category": "设计文档",
		"description": "魔法链接登录的完整技术方案，基于 Cloudflare Turnstile 人机校验 + Redis Token 缓存 + 邮件回调验证，实现无密码自动登录。",
		"tags": [
			"认证",
			"登录",
			"安全"
		],
		"published": "2026-05-01",
		"updated": "",
		"pinned": false,
		"draft": false
	},
	{
		"path": "src/content/posts/ai/ai-agent-skill-collect.md",
		"folder": "ai",
		"slug": "ai-agent-skill-collect",
		"title": "Skill学习 | 收集",
		"category": "学习文档",
		"description": "收集实用的 AI Agent Skill，涵盖工程化工作流、技能创建器、技术图表生成等开发辅助工具。",
		"tags": [
			"AI",
			"Skill",
			"Agent"
		],
		"published": "2026-04-12",
		"updated": "",
		"pinned": false,
		"draft": false
	},
	{
		"path": "src/content/posts/projects/projects-oracle-erp-performance-optimization.md",
		"folder": "projects",
		"slug": "projects-oracle-erp-performance-optimization",
		"title": "Oracle | ERP性能优化",
		"category": "实践笔记",
		"description": "Oracle ERP 因 SHRINK 操作导致聚簇因子恶化的性能排查与优化，涵盖 AWR 分析、索引重建及查询调优。",
		"tags": [
			"Oracle",
			"数据库",
			"性能优化"
		],
		"published": "2025-12-02",
		"updated": "",
		"pinned": false,
		"draft": false
	}
];
