import type { GalleryConfig } from "@/types/config";

// 相册配置
// -------------------------------------------------------------------------
// 每张/每个视频文件直接放进仓库 public/gallery/<相册id>/ 目录下即可。
// 支持的图片格式：jpg / jpeg / png / webp / avif / gif
// 支持的视频格式：mp4 / webm / mov（瀑布流里静音循环自动播放；点击后在
// 灯箱（fancybox）里可暂停 / 全屏 / 调音量 / 进度控制）
//
// 视频当作普通文件丢进 public/gallery/<id>/ 下即可：
//   例如  public/gallery/vlog-2026/daily-001.mp4
//
// -------------------------------------------------------------------------
// 相册列表
//   id          相册唯一标识（用于目录命名和 URL 路径），如 "firefly-2026" → public/gallery/firefly-2026/
//   cover       手动指定封面图（可选；不填会找 cover.* 文件，再没就用第一张图）
//   name        相册名称
//   description 相册描述
//   location    拍摄地点
//   date        日期，格式 YYYY-MM-DD
//   tags        相册标签，用于分类筛选
// -------------------------------------------------------------------------
export const galleryConfig: GalleryConfig = {
	// 相册列表
	albums: [
		// 支持jpg/png/webp/avif/gif格式
		// id: 相册唯一标识符（用于目录命名和URL路径），比如设置：id: "firefly-2026", 对应 public/gallery/firefly-2026/目录
		// cover: 手动指定封面图（可选，不填会把cover.*文件作为封面图，如果没有cover.*文件，则使用第一张图片作为封面图）
		// name: 相册名称
		// description: 相册描述
		// location: 相册拍摄地点
		// date: 相册日期，格式为 YYYY-MM-DD，用于排序和显示
		// tags: 相册标签，用于分类和过滤
		// 每添加一个数组项就相当于添加了一个相册，记得在 public/gallery/ 目录下创建对应的子目录并放入图片
		{
			id: "mxdl-2026",
			name: "测试",
			description: "测试1",
			location: "萌新大佬",
			date: "2026-07-29",
			tags: ["AI", "测试2"],
		},
		{
			id: "gpt-img2-2026",
			name: "GPT生图",
			description: "GPT生成的图片",
			location: "gpt",
			date: "2026-05-24",
			tags: ["AI", "GPT生图"],
		},
		{
			id: "mc-2026",
			name: "鸣潮",
			description: "鸣潮相册",
			location: "鸣潮",
			date: "2026-05-11",
			tags: ["鸣潮"],
		},
		{
			id: "bl-ll-2026",
			name: "萝莉",
			description: "进来先电",
			location: "碧蓝航线",
			date: "2026-05-06",
			tags: ["碧蓝航线", "萝莉"],
		},
		// ---- Vlog 相册示例 ----
		// 把 mp4 / webm 文件丢进 public/gallery/vlog-2026/ 下即可，
		// 视频会作为瀑布流卡片自动出现，点击在灯箱里播放。
		// {
		// 	id: "vlog-2026",
		// 	name: "我的 Vlog",
		// 	description: "日常 Vlog 集",
		// 	location: "随手拍",
		// 	date: "2026-08-01",
		// 	tags: ["Vlog"],
		// },
	],

	// 瀑布流最小列宽(px)，浏览器根据容器宽度自动计算列数，默认 240
	// 值越小列数越多，值越大列数越少
	columnWidth: 240,

	// 网络相册配置
	networkAlbum: {
		// 单次获取图片数量限制，默认 10
		maxQuantity: 10,
		// 默认获取数量，默认 6
		defaultQuantity: 6,
	},
};
