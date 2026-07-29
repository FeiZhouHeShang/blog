// 特效配置（樱花飘落等）
// 当前博客为黑白简约风格，未启用任何特效。配置文件保留以便 PagesCMS 后台管理；
// 启用时再在对应组件（如客户端樱花脚本）中读取 effectsConfig 并接线。
export interface EffectsConfig {
	// 总开关：false 时所有特效不渲染
	enabled: boolean;
	// 樱花飘落特效
	sakura: {
		enabled: boolean; // 是否启用樱花
		count: number; // 同屏花瓣数量
		speed: number; // 飘落速度（越大越快）
		size: [number, number]; // 花瓣尺寸随机区间 [最小, 最大]（px）
		opacity: number; // 整体不透明度 0-1
	};
}

export const effectsConfig: EffectsConfig = {
	enabled: false,
	sakura: {
		enabled: false,
		count: 30,
		speed: 1,
		size: [12, 24],
		opacity: 0.8,
	},
};
