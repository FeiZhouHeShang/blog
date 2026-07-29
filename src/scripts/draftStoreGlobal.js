// 把 draftStore 暴露到 window，供 movies-games.astro 的内联脚本（无法走 ES import）使用。
// 由 Layout 在每次导航后 boot，确保生产构建也能拿到（模块会被打包，而非裸文件）。
import * as draftStore from "@/scripts/draftStore";

if (typeof window !== "undefined") {
	window.__draftStore = draftStore;
}
