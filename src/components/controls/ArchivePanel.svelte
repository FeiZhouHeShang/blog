<script lang="ts">
import { onMount, tick } from "svelte";
import I18nKey from "@/i18n/i18nKey";
import { i18n } from "@/i18n/translation";
import { getPostUrlBySlug } from "@/utils/url-utils";

// ===== 类型定义 =====
interface Post {
	id: string;
	data: {
		title: string;
		tags: string[];
		category?: string | null;
		published: Date;
	};
}
interface MonthGroup {
	month: number;
	posts: Post[];
}
interface YearGroup {
	year: number;
	months: MonthGroup[];
	totalCount: number;
}
interface ActiveFilter {
	labelKey: I18nKey;
	values: string[];
}
interface PostMetaTag {
	name: string;
}

// ===== Props =====
export let tags: string[] = [];
export let categories: string[] = [];
export let sortedPosts: Post[] = [];

// ===== 状态 =====
let yearGroups: YearGroup[] = [];
let activeFilters: ActiveFilter[] = [];
let primaryFilter: ActiveFilter | null = null;
let secondaryFilters: ActiveFilter[] = [];
let filteredPostCount = 0;
let categoryColors: Map<string, string> = new Map();
let hoveredPostId: string | null = null;
let highlightedYear: number | null = null;
let highlightedMonth: string | null = null;

// ===== 高亮 SVG path 状态 =====
// 用一条 SVG path 绘制从年节点 → 月节点 → 文章节点的整条高亮线
let highlightPathD = "";
let highlightRequestId = 0;

// DOM 引用
let panelEl: HTMLElement;
// yearBlock refs: yearGroup.year -> HTMLElement
let yearBlockRefs: Map<number, HTMLElement> = new Map();
// monthBlock refs: `${year}-${month}` -> HTMLElement
let monthBlockRefs: Map<string, HTMLElement> = new Map();
// postRow refs: postId -> HTMLElement
let postRowRefs: Map<string, HTMLElement> = new Map();

// ===== 分类颜色调色板 =====
const categoryColorPalette = [
	"#fbbf24",
	"#fb7185",
	"#34d399",
	"#60a5fa",
	"#a78bfa",
	"#f472b6",
	"#2dd4bf",
	"#fb923c",
	"#22d3ee",
	"#818cf8",
	"#e879f9",
	"#a3e635",
	"#f87171",
	"#a78bfa",
	"#06b6d4",
	"#f59e0b",
	"#f43f5e",
	"#10b981",
];

// ===== 工具函数 =====
function formatDate(date: Date): string {
	const m = (date.getMonth() + 1).toString().padStart(2, "0");
	const d = date.getDate().toString().padStart(2, "0");
	return `${m}-${d}`;
}
function formatMonth(month: number): string {
	return `${month}${i18n(I18nKey.month)}`;
}
function getCategoryColor(name: string): string {
	const color = categoryColors.get(name);
	return color ? `color: ${color}` : "";
}
function normalizeCategoryName(name: string | null | undefined): string {
	return (name || "").trim();
}
function normalizeTags(tags: string[] | undefined | null): string[] {
	return Array.from(
		new Set(
			(tags || []).map((tag) => tag.trim()).filter((tag) => tag.length > 0),
		),
	);
}
function initializeCategoryColors(posts: Post[]): void {
	categoryColors = new Map();
	const set = new Set<string>();
	for (const p of posts) {
		const cat = normalizeCategoryName(p.data.category);
		if (cat) set.add(cat);
	}
	const sorted = Array.from(set).sort((a, b) => a.localeCompare(b, "zh-CN"));
	for (let i = 0; i < sorted.length; i++) {
		categoryColors.set(
			sorted[i],
			categoryColorPalette[i % categoryColorPalette.length],
		);
	}
}

function groupByYearMonth(posts: Post[]): YearGroup[] {
	const yearMap = new Map<number, Map<number, Post[]>>();
	for (const post of posts) {
		const y = post.data.published.getFullYear();
		const mo = post.data.published.getMonth() + 1;
		if (!yearMap.has(y)) yearMap.set(y, new Map<number, Post[]>());
		const mm = yearMap.get(y);
		if (!mm) continue;
		if (!mm.has(mo)) mm.set(mo, []);
		const postsList = mm.get(mo);
		if (postsList) postsList.push(post);
	}
	return Array.from(yearMap.keys())
		.sort((a, b) => b - a)
		.map((year) => {
			const mm = yearMap.get(year);
			if (!mm) return { year, months: [], totalCount: 0 };
			const months = Array.from(mm.keys())
				.sort((a, b) => b - a)
				.map((month) => {
					const postsForMonth = mm.get(month) ?? [];
					return { month, posts: postsForMonth };
				});
			return {
				year,
				months,
				totalCount: months.reduce((s, m) => s + m.posts.length, 0),
			};
		});
}

function formatFilterValues(f: ActiveFilter): string {
	const prefix = f.labelKey === I18nKey.tags ? "#" : "";
	return f.values.map((v) => `${prefix}${v}`).join(" / ");
}
function getPostCategoryName(post: Post): string {
	return (
		normalizeCategoryName(post.data.category) || i18n(I18nKey.uncategorized)
	);
}
function getPostMetaTags(post: Post): PostMetaTag[] {
	return normalizeTags(post.data.tags)
		.slice(0, 3)
		.map((tag) => ({ name: tag }));
}
function getPostMetaMoreCount(post: Post): number {
	return Math.max(0, normalizeTags(post.data.tags).length - 3);
}
function resolvePrimaryFilter(filters: ActiveFilter[]): ActiveFilter | null {
	return filters.find((f) => f.labelKey === I18nKey.tags) ?? filters[0] ?? null;
}
function formatFilterSummary(filters: ActiveFilter[]): string {
	return filters
		.map((f) => `${i18n(f.labelKey)}: ${formatFilterValues(f)}`)
		.join("  ·  ");
}

// ===== 高亮 SVG path 计算 =====
/**
 * 计算从年节点中心到悬停文章节点中心的 SVG path。
 * 路径：年节点中心 → 向下到月节点 Y → 向右到月节点 X → 向下到文章节点 Y → 向右到文章节点 X
 * 每个转角使用二次曲线，避免鼠标移动时出现突兀的直角。
 */
async function computeHighlight(postId: string, requestId: number) {
	await tick();
	if (!panelEl || requestId !== highlightRequestId || hoveredPostId !== postId)
		return;

	// 找到悬停文章所在的年/月
	let targetYear: number | null = null;
	let targetMonth: number | null = null;
	for (const yg of yearGroups) {
		for (const mg of yg.months) {
			if (mg.posts.some((p) => p.id === postId)) {
				targetYear = yg.year;
				targetMonth = mg.month;
				break;
			}
		}
		if (targetYear !== null) break;
	}
	if (targetYear === null || targetMonth === null) {
		highlightPathD = "";
		highlightedYear = null;
		highlightedMonth = null;
		return;
	}

	const panelRect = panelEl.getBoundingClientRect();
	const yearBlock = yearBlockRefs.get(targetYear);
	const monthBlock = monthBlockRefs.get(`${targetYear}-${targetMonth}`);
	const postRow = postRowRefs.get(postId);

	if (!yearBlock || !monthBlock || !postRow) return;

	const yearNode = yearBlock.querySelector<HTMLElement>(".ap-year-node");
	const monthNode = monthBlock.querySelector<HTMLElement>(".ap-month-node");
	const postNode = postRow.querySelector<HTMLElement>(".ap-post-node");
	if (!yearNode || !monthNode || !postNode) return;

	highlightedYear = targetYear;
	highlightedMonth = `${targetYear}-${targetMonth}`;
	const getCenter = (node: HTMLElement) => {
		const rect = node.getBoundingClientRect();
		return {
			x: rect.left - panelRect.left + rect.width / 2,
			y: rect.top - panelRect.top + rect.height / 2,
		};
	};

	const yearCenter = getCenter(yearNode);
	const monthCenter = getCenter(monthNode);
	const postCenter = getCenter(postNode);

	// 计算三个圆角转折点的方向和半径。
	const firstHorizontal = Math.abs(monthCenter.x - yearCenter.x);
	const firstVertical = Math.abs(monthCenter.y - yearCenter.y);
	const secondHorizontal = Math.abs(postCenter.x - monthCenter.x);
	const secondVertical = Math.abs(postCenter.y - monthCenter.y);
	const radius = Math.min(
		6,
		firstHorizontal / 2,
		firstVertical / 2,
		secondHorizontal / 2,
		secondVertical / 2,
	);
	const firstYDirection = Math.sign(monthCenter.y - yearCenter.y) || 1;
	const firstXDirection = Math.sign(monthCenter.x - yearCenter.x) || 1;
	const secondYDirection = Math.sign(postCenter.y - monthCenter.y) || 1;
	const secondXDirection = Math.sign(postCenter.x - monthCenter.x) || 1;

	// 以二次曲线替代三个直角，保留节点之间清晰的层级关系。
	const d = [
		`M ${yearCenter.x} ${yearCenter.y}`,
		`L ${yearCenter.x} ${monthCenter.y - firstYDirection * radius}`,
		`Q ${yearCenter.x} ${monthCenter.y} ${yearCenter.x + firstXDirection * radius} ${monthCenter.y}`,
		`L ${monthCenter.x - firstXDirection * radius} ${monthCenter.y}`,
		`Q ${monthCenter.x} ${monthCenter.y} ${monthCenter.x} ${monthCenter.y + secondYDirection * radius}`,
		`L ${monthCenter.x} ${postCenter.y - secondYDirection * radius}`,
		`Q ${monthCenter.x} ${postCenter.y} ${monthCenter.x + secondXDirection * radius} ${postCenter.y}`,
		`L ${postCenter.x} ${postCenter.y}`,
	].join(" ");

	highlightPathD = d;
}

function onPostEnter(postId: string) {
	hoveredPostId = postId;
	const requestId = ++highlightRequestId;
	void computeHighlight(postId, requestId);
}

function onPostLeave(event: MouseEvent | FocusEvent) {
	const relatedTarget = event.relatedTarget;
	if (relatedTarget instanceof Node && panelEl?.contains(relatedTarget)) return;

	highlightRequestId += 1;
	hoveredPostId = null;
	highlightedYear = null;
	highlightedMonth = null;
	highlightPathD = "";
}

// ===== Svelte use: 指令（注册 DOM 引用） =====
function registerYearBlock(node: HTMLElement, year: number) {
	yearBlockRefs.set(year, node);
	return {
		destroy() {
			yearBlockRefs.delete(year);
		},
	};
}
function registerMonthBlock(
	node: HTMLElement,
	{ year, month }: { year: number; month: number },
) {
	monthBlockRefs.set(`${year}-${month}`, node);
	return {
		destroy() {
			monthBlockRefs.delete(`${year}-${month}`);
		},
	};
}
function registerPostRow(node: HTMLElement, postId: string) {
	postRowRefs.set(postId, node);
	return {
		destroy() {
			postRowRefs.delete(postId);
		},
	};
}

// ===== 生命周期 =====
onMount(() => {
	const params = new URLSearchParams(window.location.search);
	tags = params.has("tag") ? params.getAll("tag") : [];
	categories = params.has("category") ? params.getAll("category") : [];
	const uncategorized = params.get("uncategorized");

	let filtered: Post[] = sortedPosts;
	const currentFilters: ActiveFilter[] = [];
	if (categories.length > 0)
		currentFilters.push({ labelKey: I18nKey.categories, values: categories });
	if (uncategorized)
		currentFilters.push({
			labelKey: I18nKey.categories,
			values: [i18n(I18nKey.uncategorized)],
		});
	if (tags.length > 0)
		currentFilters.push({ labelKey: I18nKey.tags, values: tags });

	activeFilters = currentFilters;
	primaryFilter = resolvePrimaryFilter(activeFilters);
	secondaryFilters = primaryFilter
		? activeFilters.filter((f) => f !== primaryFilter)
		: [];

	if (tags.length > 0)
		filtered = filtered.filter(
			(p) =>
				Array.isArray(p.data.tags) && p.data.tags.some((t) => tags.includes(t)),
		);
	if (categories.length > 0)
		filtered = filtered.filter(
			(p) => p.data.category && categories.includes(p.data.category),
		);
	if (uncategorized) filtered = filtered.filter((p) => !p.data.category);

	filtered = filtered
		.slice()
		.sort((a, b) => b.data.published.getTime() - a.data.published.getTime());
	filteredPostCount = filtered.length;
	initializeCategoryColors(filtered);
	yearGroups = groupByYearMonth(filtered);
});
</script>

<div class="archive-panel card-base" bind:this={panelEl}>

	<!-- 筛选器摘要 -->
	{#if primaryFilter}
		<div class="mb-6">
			<div class="flex flex-wrap items-center justify-between gap-x-4 gap-y-1">
				<div class="min-w-0 text-sm text-75">
					<span class="text-50">{i18n(primaryFilter.labelKey)}</span>
					<span class="mx-2 text-30">/</span>
					<span class="font-semibold text-(--primary)">{formatFilterValues(primaryFilter)}</span>
					{#if secondaryFilters.length > 0}
						<span class="ml-2 text-50">· {formatFilterSummary(secondaryFilters)}</span>
					{/if}
				</div>
				<div class="shrink-0 text-xs text-50">
					{filteredPostCount} {i18n(filteredPostCount === 1 ? I18nKey.postCount : I18nKey.postsCount)}
					<span class="mx-1.5 text-30">·</span>
					{yearGroups.length} {i18n(I18nKey.year)}
				</div>
			</div>
		</div>
	{/if}

	<!-- 年份列表 -->
	{#each yearGroups as yearGroup (yearGroup.year)}
		<div
			class="ap-year-block"
			use:registerYearBlock={yearGroup.year}
		>
			<!-- 年份标题行 -->
			<div class="ap-year-header">
				<div class="ap-col">
					<div
						class="ap-node ap-year-node"
						class:highlighted={highlightedYear === yearGroup.year}
					></div>
				</div>
				<div class="ap-year-label">
					<h2 class="ap-h1">{yearGroup.year}{i18n(I18nKey.year)}</h2>
					<span class="ap-count">
						共 {yearGroup.totalCount} {i18n(yearGroup.totalCount === 1 ? I18nKey.postCount : I18nKey.postsCount)}
					</span>
				</div>
			</div>

			<!-- 月份区域 -->
			<div class="ap-months-area">
				{#each yearGroup.months as monthGroup (monthGroup.month)}
					<div
						class="ap-month-block"
						use:registerMonthBlock={{ year: yearGroup.year, month: monthGroup.month }}
					>
						<!-- 月份标题行 -->
						<div class="ap-month-header">
							<div class="ap-col">
								<div
									class="ap-node ap-month-node"
									class:highlighted={highlightedMonth === `${yearGroup.year}-${monthGroup.month}`}
								></div>
							</div>
							<div class="ap-month-label">
								<h3 class="ap-h2">{formatMonth(monthGroup.month)}</h3>
								<span class="ap-count">
									{monthGroup.posts.length} {i18n(monthGroup.posts.length === 1 ? I18nKey.postCount : I18nKey.postsCount)}
								</span>
							</div>
						</div>

						<!-- 文章区域 -->
						<div class="ap-posts-area">
							<ul class="ap-post-list">
								{#each monthGroup.posts as post, postIdx (post.id)}
									{@const postTags = getPostMetaTags(post)}
									{@const postMoreCount = getPostMetaMoreCount(post)}
									{@const catColor = getCategoryColor(getPostCategoryName(post))}
									<li
										class="ap-post-row"
										class:last={postIdx === monthGroup.posts.length - 1}
										use:registerPostRow={post.id}
									>
										<div class="ap-col">
											<div
												class="ap-node ap-post-node"
												class:hovered={hoveredPostId === post.id}
											></div>
										</div>
										<a
											href={getPostUrlBySlug(post.id)}
											aria-label={post.data.title}
											class="ap-post-link group btn-plain"
											on:mouseenter={() => onPostEnter(post.id)}
											on:mouseleave={onPostLeave}
											on:focus={() => onPostEnter(post.id)}
											on:blur={onPostLeave}
										>
											<span class="ap-date">{formatDate(post.data.published)}</span>
											<span class="ap-post-content">
												<span class="ap-title group-hover:text-(--primary)">
													{post.data.title}
												</span>
												<span class="ap-meta">
													<span class="ap-category" style={catColor}>
														#{getPostCategoryName(post)}
													</span>
													{#if postTags.length > 0}
														<span class="ap-meta-gap" aria-hidden="true"></span>
														{#each postTags as tag, i (tag.name)}
															<span class="ap-tag">
																{tag.name}
															</span>
															{#if i < postTags.length - 1}
																<span class="ap-meta-divider" aria-hidden="true">/</span>
															{/if}
														{/each}
													{/if}
													{#if postMoreCount > 0}
														<span class="ap-tag-more">
															+{postMoreCount}
														</span>
													{/if}
												</span>
											</span>
										</a>
									</li>
								{/each}
							</ul>
						</div>
					</div>
				{/each}
			</div>
		</div>
	{/each}

	<!-- 常驻单条路径，切换文章时只更新 d，避免 SVG 卸载/重建造成闪烁 -->
	<svg class="ap-highlight-svg" aria-hidden="true">
		<path d={highlightPathD} fill="none" stroke="var(--lh)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" />
	</svg>

</div>

<style>
.archive-panel {
	--tw: 1.25rem;
	--lh: oklch(0.15 0 0);
	--nc: var(--line-color, oklch(0.82 0 0));
	--nh: oklch(0.15 0 0);
	position: relative;
}

/* ── 年份块 ── */
.ap-year-block {
	position: relative;
	margin-bottom: 1.5rem;
}

.ap-months-area { padding-left: var(--tw); }

/* ── 月份块 ── */
.ap-month-block {
	position: relative;
	margin-bottom: 0.25rem;
}

.ap-posts-area { padding-left: var(--tw); }
.ap-post-list  { list-style: none; margin: 0; padding: 0; }

/* ── 文章行 ── */
.ap-post-row {
	position: relative;
	display: flex;
	align-items: center;
	min-height: 2rem;
}

/* ── 节点列 ── */
.ap-col {
	position: relative;
	width: var(--tw);
	flex-shrink: 0;
	align-self: stretch;
}

/* ── 节点通用 ── */
.ap-node {
	position: absolute;
	left: 50%;
	transform: translateX(-50%);
	border-radius: 50%;
	z-index: 2;
	transition: background-color 0.15s ease, border-color 0.15s ease, transform 0.15s ease;
}
.ap-node.highlighted,
.ap-node.hovered {
	z-index: 3;
}

.ap-year-node {
	top: calc(50% - 0.375rem);
	width: 0.75rem; height: 0.75rem;
	border: 2px solid var(--nc);
	background: var(--page-bg, white);
}
.ap-year-node.highlighted {
	background: var(--nh);
	border-color: var(--nh);
}

.ap-month-node {
	top: calc(50% - 0.25rem);
	width: 0.5rem; height: 0.5rem;
	background: var(--nc);
}
.ap-month-node.highlighted {
	background: var(--nh);
	transform: translateX(-50%) scale(1.5);
}

.ap-post-node {
	top: calc(50% - 0.2rem);
	width: 0.4rem; height: 0.4rem;
	background: var(--nc);
}
.ap-post-node.hovered {
	background: var(--nh);
	transform: translateX(-50%) scale(1.6);
}

/* ── 悬停高亮路径 ── */
.ap-highlight-svg {
	position: absolute;
	inset: 0;
	width: 100%;
	height: 100%;
	pointer-events: none;
	z-index: 1;
	overflow: visible;
}
.ap-highlight-svg path {
	filter: none;
}

/* ── 标题行 ── */
.ap-year-header, .ap-month-header {
	display: flex; align-items: center; min-height: var(--tw);
}
.ap-year-header {
	margin-bottom: 0.45rem;
}
.ap-month-header {
	margin-bottom: 0.3rem;
}
.ap-year-label, .ap-month-label {
	display: flex; align-items: baseline; gap: 0.6rem; padding-left: 0.25rem; flex: 1;
}
.ap-h1 { font-size: 1.65rem; font-weight: 700; color: var(--deep-text); margin: 0; }
.ap-h2 { font-size: 1.25rem;  font-weight: 600; color: var(--deep-text); margin: 0; }
.ap-count { font-size: 0.75rem; color: var(--content-meta); }

/* ── 文章链接 ── */
.ap-post-link {
	display: flex; align-items: center; gap: 0.65rem;
	flex: 1; min-height: 2.15rem; padding: 0.2rem 0.4rem;
	margin-left: 0;
	border-radius: 0.5rem; text-decoration: none; overflow: hidden;
}
.ap-date {
	font-size: 0.875rem; color: var(--content-meta);
	font-variant-numeric: tabular-nums; white-space: nowrap;
	flex-shrink: 0; width: 2.8rem; text-align: right;
}
.ap-post-content {
	display: flex;
	align-items: center;
	gap: 0.85rem;
	flex: 1;
	min-width: 0;
}
.ap-category {
	font-size: 0.8rem; font-weight: 700;
	white-space: nowrap; flex-shrink: 0;
	color: var(--content-meta);
}
.ap-meta {
	display: flex;
	align-items: center;
	gap: 0.35rem;
	flex-shrink: 0;
	min-width: 0;
	white-space: nowrap;
}
.ap-meta-gap {
	display: inline-block;
	width: 0.5rem;
	flex-shrink: 0;
}
.ap-meta-divider {
	color: var(--meta-divider);
	font-size: 0.8rem;
	font-weight: 700;
	flex-shrink: 0;
	margin: 0 0.05rem;
}
.ap-tag {
	font-size: 0.8rem;
	font-weight: 700;
	white-space: nowrap;
	flex-shrink: 0;
}
.ap-tag-more {
	color: var(--content-meta);
	font-size: 0.8rem;
	font-weight: 700;
	white-space: nowrap;
	flex-shrink: 0;
}
.ap-title {
	font-size: 0.9rem; font-weight: 500; color: var(--deep-text);
	overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
	flex: 1; min-width: 0; transition: color 0.15s ease; display: block;
}

:global(.dark) .archive-panel {
	--lh: oklch(0.9 0 0);
	--nh: oklch(0.9 0 0);
}

@media (max-width: 768px) {
	.archive-panel { --tw: 1rem; }
	.ap-node,
	.ap-highlight-svg {
		display: none;
	}
	.ap-col {
		display: none;
	}
	.ap-post-link {
		align-items: flex-start;
		gap: 0.5rem;
		min-height: auto;
		padding: 0.45rem 0.5rem 0.5rem;
	}
	.ap-date {
		width: 2.6rem;
		font-size: 0.78rem;
		margin-top: 0.1rem;
	}
	.ap-post-content {
		flex: 1;
		min-width: 0;
		flex-direction: column;
		align-items: flex-start;
		gap: 0.2rem;
	}
	.ap-title {
		width: 100%;
		font-size: 0.92rem;
		white-space: normal;
		display: -webkit-box;
		-webkit-box-orient: vertical;
		-webkit-line-clamp: 2;
		line-clamp: 2;
		overflow: hidden;
		text-overflow: ellipsis;
		overflow-wrap: anywhere;
	}
	.ap-meta {
		width: 100%;
		flex-wrap: wrap;
		gap: 0.2rem;
		white-space: normal;
	}
	.ap-meta-gap {
		display: none;
	}
	.ap-category { font-size: 0.75rem; }
	.ap-tag,
	.ap-tag-more,
	.ap-meta-divider { font-size: 0.72rem; }

	.ap-months-area,
	.ap-posts-area {
		padding-left: 0.75rem;
	}
}
</style>
