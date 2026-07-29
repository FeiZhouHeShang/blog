// 数据统计配置（由 PagesCMS 后台管理）。
// 注意：该文件必须是「具名导出 analyticsConfig」，否则 src/config/index.ts 第 57 行的
//   `export { analyticsConfig } from "./analyticsConfig"` 会抛出
//   "does not provide an export named 'analyticsConfig'"，进而让整个 @/config 模块图
//   加载失败 —— 所有依赖 @/config 的客户端脚本（含 Layout.astro 的 Swup/侧栏同步）都会失效。
// 这里是空桩兜底，PagesCMS 编辑后会写入真实配置并覆盖本文件。
export const analyticsConfig = {};
