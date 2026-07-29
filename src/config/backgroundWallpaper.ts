// 背景壁纸配置
// 当前博客为黑白简约风格、已移除背景图片。配置文件保留以便 PagesCMS 后台管理；
// 启用时再在客户端/布局组件中读取 backgroundWallpaperConfig 并接线。
export interface BackgroundWallpaperConfig {
	// 总开关：false 时完全不渲染背景层
	enabled: boolean;
	// 全屏壁纸（图片或视频）
	fullScreen: {
		enabled: boolean;
		image: string; // 图片地址（public 或远程 URL）
		video: string; // 视频地址（留空则只用图片）
	};
	// 横幅壁纸
	banner: {
		enabled: boolean;
		image: string;
	};
	// 水波纹动效
	ripple: {
		enabled: boolean;
	};
	// 渐变背景
	gradient: {
		enabled: boolean;
		from: string; // 起始色
		to: string; // 结束色
	};
}

export const backgroundWallpaperConfig: BackgroundWallpaperConfig = {
	enabled: false,
	fullScreen: { enabled: false, image: "", video: "" },
	banner: { enabled: false, image: "" },
	ripple: { enabled: false },
	gradient: { enabled: false, from: "#0f172a", to: "#1e293b" },
};
