// 验证：编辑器对话框里已彻底删除「高级设置 · TMDB」块
// - 打开 /movies-games/
// - 点击「编辑列表」按钮
// - 截图全 dialog
// - 检查 mg-editor-advanced / mg-editor-tmdb-* / data-tmdb-default 输入框 等元素都不存在
// - 检查 dialog 内不再含「高级设置」「TMDB Key」「预置令牌」「本地自定义令牌」字样
// - 检查 JS 报错 0 条
// - 模拟：智能匹配按钮点击时 console 报「请填写标题」（因为没填）→ 说明按钮仍可用
import { chromium } from "file:///C:/Users/ADMINI~1/AppData/Local/Temp/node_modules/playwright-core/index.mjs";
(async () => {
	const browser = await chromium.launch({
		executablePath: "C:/Program Files/Google/Chrome/Application/chrome.exe",
		headless: true,
	});
	const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
	const errors = [];
	page.on("pageerror", (e) => errors.push("[pageerror] " + e.message));
	page.on("console", (msg) => {
		// 只算真正的 JS 异常，过滤掉网络资源加载错误（dev 沙箱偶发 504/404）
		const text = msg.text();
		if (msg.type() === "error" && !/Failed to load resource|status of \d+/.test(text)) {
			errors.push("[console.error] " + text);
		}
	});
	try {
		await page.goto("http://localhost:4321/movies-games/", { waitUntil: "networkidle", timeout: 20000 });
	} catch (e) {
		console.log("GOTO ERR (likely sandbox net, will retry):", e.message);
	}
	await page.waitForTimeout(1500);
	console.log("=== URL:", page.url());

	// 截图 1: 默认页（公开视图，应无任何"令牌"字样）
	await page.screenshot({ path: "H:/个人博客/博客信息/scripts/_verify_mg_no_token_public.png", fullPage: false });

	// 找编辑列表按钮
	const openBtn = await page.locator("#mg-open-editor").first();
	const hasOpenBtn = await openBtn.count();
	console.log("=== mg-open-editor 存在:", hasOpenBtn);
	if (!hasOpenBtn) {
		console.log("❌ 找不到编辑列表按钮");
		await browser.close();
		process.exit(1);
	}

	await openBtn.click();
	await page.waitForTimeout(500);

	// 检查 dialog 打开
	const dlgOpen = await page.evaluate(() => {
		const d = document.getElementById("mg-editor");
		return d && d.open;
	});
	console.log("=== dialog 已打开:", dlgOpen);

	// 关键检查：mg-editor-advanced 不存在
	const advCount = await page.locator("#mg-editor [class*='mg-editor-advanced']").count();
	const tmdbInputCount = await page.locator("#mg-editor #mg-editor-tmdb-key").count();
	const tmdbHintCount = await page.locator("#mg-editor #mg-editor-tmdb-hint").count();
	const tmdbDetailsCount = await page.locator("#mg-editor #mg-editor-tmdb-details").count();
	console.log("=== mg-editor-advanced 元素数:", advCount, "(应为 0)");
	console.log("=== #mg-editor-tmdb-key 输入框数:", tmdbInputCount, "(应为 0)");
	console.log("=== #mg-editor-tmdb-hint 元素数:", tmdbHintCount, "(应为 0)");
	console.log("=== #mg-editor-tmdb-details 数:", tmdbDetailsCount, "(应为 0)");

	// 检查 dialog 内部文本不含「高级设置 / TMDB Key / 预置令牌 / 本地自定义令牌」
	const innerText = await page.evaluate(() => {
		const d = document.getElementById("mg-editor");
		return d ? d.innerText : "";
	});
	const bannedPhrases = ["高级设置", "TMDB Key", "预置令牌", "本地自定义令牌", "TMDB API Key"];
	const foundBanned = bannedPhrases.filter((p) => innerText.includes(p));
	console.log("=== 禁用短语残留:", foundBanned.length ? foundBanned : "✅ 无");

	// 截图 2: 编辑器打开
	await page.screenshot({ path: "H:/个人博客/博客信息/scripts/_verify_mg_no_token_dialog.png", fullPage: false });

	// 点击「+ 新增条目」展开表单，验证智能匹配按钮还在
	const addBtn = await page.locator("#mg-editor-add").first();
	await addBtn.click();
	await page.waitForTimeout(300);
	const searchBtnCount = await page.locator("#mg-editor [data-act='tmdb-search']").count();
	console.log("=== 智能匹配按钮 [data-act=tmdb-search] 数:", searchBtnCount, "(应 ≥ 1)");

	// 模拟点击智能匹配按钮（无标题，期望 alert「请先填写标题」或被静默处理）
	const alerts = [];
	page.on("dialog", async (d) => {
		alerts.push(d.message());
		await d.dismiss();
	});
	await page.locator("#mg-editor [data-act='tmdb-search']").first().click();
	await page.waitForTimeout(500);
	console.log("=== 智能匹配触发 alert:", alerts.length ? alerts : "(无 — 可能静默或前端拦截)");

	// 截图 3: 表单展开 + 智能匹配按钮可见
	await page.screenshot({ path: "H:/个人博客/博客信息/scripts/_verify_mg_smart_match_btn.png", fullPage: false });

	// JS 错误汇总
	console.log("=== JS 报错数:", errors.length);
	if (errors.length) errors.forEach((e) => console.log("  - " + e));

	const fail =
		advCount > 0 ||
		tmdbInputCount > 0 ||
		tmdbHintCount > 0 ||
		tmdbDetailsCount > 0 ||
		foundBanned.length > 0 ||
		searchBtnCount === 0 ||
		errors.length > 0;

	await browser.close();
	console.log(fail ? "\n❌ 验证未通过" : "\n✅ 全部通过");
	process.exit(fail ? 1 : 0);
})();
