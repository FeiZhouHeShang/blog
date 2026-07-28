import I18nKey from "../i18n/i18nKey";
import { i18n } from "../i18n/translation";
import { LinkPreset, type NavBarLink } from "../types/config";

export const LinkPresets: { [key in LinkPreset]: NavBarLink } = {
	[LinkPreset.Home]: {
		name: i18n(I18nKey.home),
		url: "/",
		icon: "material-symbols:home",
	},
	[LinkPreset.About]: {
		name: i18n(I18nKey.about),
		url: "/about/",
		icon: "material-symbols:person",
	},
	[LinkPreset.Archive]: {
		name: i18n(I18nKey.archive),
		url: "/archive/",
		icon: "material-symbols:schedule-outline-rounded",
	},
	[LinkPreset.PostList]: {
		name: i18n(I18nKey.postList),
		url: "/list/",
		icon: "material-symbols:list-alt-outline-rounded",
	},
	[LinkPreset.Friends]: {
		name: i18n(I18nKey.friends),
		url: "/friends/",
		icon: "material-symbols:group",
	},
	[LinkPreset.Sponsor]: {
		name: i18n(I18nKey.sponsor),
		url: "/sponsor/",
		icon: "material-symbols:favorite",
	},
	[LinkPreset.Guestbook]: {
		name: i18n(I18nKey.guestbook),
		url: "/guestbook/",
		icon: "material-symbols:chat",
	},
	[LinkPreset.Bangumi]: {
		name: i18n(I18nKey.bangumi),
		url: "/bangumi/",
		icon: "material-symbols:movie",
	},
	[LinkPreset.Gallery]: {
		name: i18n(I18nKey.gallery),
		url: "/gallery/",
		icon: "material-symbols:photo-library",
	},
	[LinkPreset.Collections]: {
		name: i18n(I18nKey.collections),
		url: "/collections/",
		icon: "material-symbols:bookmark",
	},
	[LinkPreset.Stats]: {
		name: i18n(I18nKey.stats),
		url: "/stats/",
		icon: "material-symbols:bar-chart",
	},
	[LinkPreset.Calendar]: {
		name: i18n(I18nKey.calendar),
		url: "/calendar/",
		icon: "material-symbols:calendar-today",
	},
	[LinkPreset.Categories]: {
		name: "分类标签",
		url: "/categories/",
		icon: "material-symbols:category",
	},
	[LinkPreset.Tags]: {
		name: i18n(I18nKey.tags),
		url: "/tags/",
		icon: "material-symbols:label",
	},
	[LinkPreset.Feibichi]: {
		name: i18n(I18nKey.feibichi),
		url: "https://www.mmzhiku.xyz/",
		icon: "material-symbols:link",
		external: true,
	},
	[LinkPreset.ContactMe]: {
		name: i18n(I18nKey.contactMe),
		url: "/contact/",
		icon: "material-symbols:edit-note-rounded",
	},
	// [关键词: nav-qq-link] QQ联系方式 - 修改URL为你的QQ链接
	// tencent://message/?uin=你的QQ号  为QQ私聊链接
	// https://qm.qq.com/q/xxxxxx  为QQ群链接
	[LinkPreset.QQGroup]: {
		name: i18n(I18nKey.qqGroup),
		url: "tencent://message/?uin=5563000",
		icon: "fa7-brands:qq",
		external: true,
	},
	[LinkPreset.NavPosts]: {
		name: i18n(I18nKey.navPosts),
		url: "/list/",
		icon: "material-symbols:article",
	},
	[LinkPreset.NavMy]: {
		name: i18n(I18nKey.navMy),
		url: "/my/",
		icon: "material-symbols:info-rounded",
	},
	[LinkPreset.Moments]: {
		name: i18n(I18nKey.navMoments),
		url: "/moments/",
		icon: "material-symbols:bolt-rounded",
	},
	[LinkPreset.MoviesGames]: {
		name: i18n(I18nKey.navMoviesGames),
		url: "/movies-games/",
		icon: "material-symbols:movie",
	},
	[LinkPreset.PostEditor]: {
		name: "文章编辑器",
		url: "/posts-editor/",
		icon: "material-symbols:edit-document",
	},
	[LinkPreset.Music]: {
		name: i18n(I18nKey.music),
		url: "/music/",
		icon: "material-symbols:graphic-eq-rounded",
	},
};
