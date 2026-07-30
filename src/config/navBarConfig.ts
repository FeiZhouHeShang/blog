import { LinkPresets } from "../constants/link-presets";
import {
	LinkPreset,
	type NavBarConfig,
	type NavBarLink,
} from "../types/config";
import { siteConfig } from "./siteConfig";

/**
 * 构建导航栏链接配置
 * [关键词: nav-config] 导航配置 - 如需修改导航栏顺序/内容，编辑此文件
 *
 * 使用说明：
 * - LinkPreset 枚举消除魔法值，新增导航项需在 types/config.ts 的 LinkPreset 中添加
 * - LinkPresets 集中管理链接元数据（i18n、图标、URL），修改链接信息在 link-presets.ts
 * - 页面开关控制可选链接的显隐，开关在 siteConfig.ts 的 pages 字段
 *
 * 修改指南：
 * - 改导航名称：修改对应语言文件的 i18n（搜索 contactMe/qqGroup 等 key）
 * - 改导航图标/URL：修改 src/constants/link-presets.ts
 * - 改导航顺序：修改下方 links 数组的顺序
 */
const buildNavBarConfig = (): NavBarConfig => {
	// [关键词: nav-posts] 文章下拉菜单
	const postsNav: NavBarLink = {
		...LinkPresets[LinkPreset.NavPosts],
		children: [LinkPreset.Archive, LinkPreset.Categories, LinkPreset.PostList],
	};

	// [关键词: nav-friends] 交友互动下拉菜单
	const contactChildren: (NavBarLink | LinkPreset)[] = [];
	if (siteConfig.pages.friends) {
		contactChildren.push(LinkPreset.Friends);
	}
	// [关键词: nav-qq-link] QQ联系方式（原QQ群已改为个人QQ）
	contactChildren.push(LinkPreset.QQGroup);
	// [关键词: nav-movies-games] 影视游戏收藏墙（从顶部独立项移入「记录」子菜单）
	contactChildren.push(LinkPreset.MoviesGames);
	// [关键词: nav-gallery] 相册：用户要求从「动态」移至「记录」下
	if (siteConfig.pages.gallery) {
		contactChildren.push(LinkPreset.Gallery);
	}

	const contactNav: NavBarLink | null =
		contactChildren.length > 0
			? {
					...LinkPresets[LinkPreset.ContactMe],
					children: contactChildren,
				}
			: null;

	// [关键词: nav-my] 我的下拉菜单（已更名为「关于」，相册已迁移至「动态」）
	const myChildren: (NavBarLink | LinkPreset)[] = [];
	if (siteConfig.pages.calendar) {
		myChildren.push(LinkPreset.Calendar);
	}
	if (siteConfig.pages.sponsor) {
		myChildren.push(LinkPreset.Sponsor);
	}
	myChildren.push(LinkPreset.About);

	const myNav: NavBarLink = {
		...LinkPresets[LinkPreset.NavMy],
		children: myChildren,
	};

	// [关键词: nav-moments] 动态下拉菜单（仅含「日常吐槽」子项）
	// 日常吐槽 = 复刻自「团子和蛋糕」说说模块的 /moments/ 吐槽页，作为「动态」的子项存在。
	// 相册（Gallery）已按要求移至「记录」下（见下方 contactChildren）。
	const momentsChildren: (NavBarLink | LinkPreset)[] = [];
	// 日常吐槽：内联子项，指向 /moments/ 吐槽页（说说内容都在该列表下）
	momentsChildren.push({
		name: "日常吐槽",
		url: "/moments/",
		icon: "material-symbols:chat-bubble",
	});

	const momentsNav: NavBarLink = {
		...LinkPresets[LinkPreset.Moments],
		children: momentsChildren,
	};

	// [关键词: nav-order] 导航顺序：主页 → 文章 → 工具导航 → 动态(相册/日常吐槽) → 记录(含影视游戏) → 关于
	const links: (NavBarLink | LinkPreset)[] = [
		LinkPreset.Home,
		postsNav,
		...(siteConfig.pages.collections ? [LinkPreset.Collections] : []),
		momentsNav,
		...(contactNav ? [contactNav] : []),
		myNav,
	];

	return { links };
};

export const navBarConfig: NavBarConfig = buildNavBarConfig();
