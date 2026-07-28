/// <reference types="astro/client" />
/// <reference path="../.astro/types.d.ts" />

declare global {
	interface ImportMetaEnv {
		readonly MEILI_MASTER_KEY: string;
		/** 图床 API Token（Bearer）：用于跨浏览器「拉目录查重」，前端直传图床必需，部署时由环境变量注入 */
		readonly PUBLIC_IMG_UPLOAD_TOKEN: string;
		/** 图床上传认证码（authCode）：用于 /upload 直传，前端直传图床必需，部署时由环境变量注入 */
		readonly PUBLIC_IMGBED_UPLOAD_CODE: string;
	}

	interface ITOCManager {
		init: () => void;
		cleanup: () => void;
	}

	interface Window {
		SidebarTOC: {
			manager: ITOCManager | null;
		};
		tocInternalNavigation: boolean;
		// swup is defined in global.d.ts
		// biome-ignore lint/suspicious/noExplicitAny: External library without types
		spine: any;
		closeAnnouncement: () => void;
		// __fireflyMusic type is defined in global.d.ts
	}
}

export {};
