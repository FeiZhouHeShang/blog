import type { FooterConfig } from "../types/config";

export const footerConfig: FooterConfig = {
	// 社交链接（mailto:/tel: 开头的链接不会在新标签打开）
	// [已修改] 移除了QQ群链接，保留邮箱联系方式
	socialLinks: [
		{
			label: "邮箱",
			href: "mailto:5563000@qq.com",
			icon: "material-symbols:mail",
		},
	],

	// 备案信息 - [已移除] 因为主机在海外，不需要ICP备案
	beian: {
		icp: "",
		police: "",
		policeIcon: "",
		icpUrl: "",
		policeUrl: "",
	},

	// Powered by 信息
	poweredBy: [
		{ label: "框架", name: "Astro", href: "https://astro.build" },
		{
			label: "主题",
			name: "Firefly",
			href: "https://github.com/CuteLeaf/Firefly",
		},
	],
};
