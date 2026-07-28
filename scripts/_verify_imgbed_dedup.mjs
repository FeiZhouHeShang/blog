// _verify_imgbed_dedup.mjs
// 验证「图床按文件名查重（跨会话）」:
//   1. localStorage 命中 → 不发 POST /upload，缩略图直接填上
//   2. localStorage 未命中 + SHA-256 命中（会话内）→ 不发 POST
//   3. 全新文件 → 走真实 uploadToImgbed（用 request interception 截到，验证 payload 完整）
//   4. 编辑器图床查重状态栏正确显示
//   5. 删除索引项后能正常上传（不卡死）
//
// 用法：先确保 `astro dev` 跑在 4321，然后 `node _verify_imgbed_dedup.mjs`

import { chromium } from "file:///C:/Users/ADMINI~1/AppData/Local/Temp/node_modules/playwright-core/index.mjs";

const errors = [];
const consoleErrors = [];
const browser = await chromium.launch({
	executablePath: "C:/Program Files/Google/Chrome/Application/chrome.exe",
	args: ["--no-sandbox"],
});
const page = await browser.newPage();
page.on("pageerror", (e) => errors.push("[pageerror] " + e.message));
page.on("console", (msg) => {
	if (msg.type() === "error") consoleErrors.push("[console.error] " + msg.text());
});

// 构造一个最小 PNG (1x1 红) 两次用——内容一致，SHA-256 一致
const TINY_PNG = Buffer.from(
	"iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8/5+hHgAHggJ/PchI7wAAAABJRU5ErkJggg==",
	"base64"
);
const TINY_PNG_ALT = Buffer.from(
	"iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9Qz0AEYBxVSF+FAAJEAQH8W9gVAAAAAElFTkSuQmCC",
	"base64"
);

const result = { steps: [], pass: true };
const check = (name, cond, detail) => {
	result.steps.push((cond ? "  ✅ " : "  ❌ ") + name + (detail ? " · " + detail : ""));
	if (!cond) result.pass = false;
};

try {
	// ===== 用 route 拦截 POST 上传，记录调用次数 =====
	let uploadCalls = 0;
	let uploadPayloads = [];
	await page.route("**/upload**", async (route) => {
		uploadCalls++;
		try {
			const req = route.request();
			const buf = await req.postDataBuffer();
			uploadPayloads.push({ size: buf ? buf.length : 0, contentType: req.headers()["content-type"] || "" });
		} catch (_e) {}
		// 模拟图床成功响应（顶层数组 + src）
		await route.fulfill({
			status: 200,
			contentType: "application/json",
			body: JSON.stringify([{ src: "https://tc.d15.cc.cd/file/日常吐槽/MOCKED.png", publicUrl: "https://tc.d15.cc/cd/file/日常吐槽/MOCKED.png" }]),
		});
	});

	// 加载页面
	await page.goto("http://localhost:4321/moments/", { waitUntil: "networkidle", timeout: 30000 });
	result.steps.push("① 页面加载 OK");

	// 预填 localStorage：模拟"之前已传过 test.png"
	await page.evaluate(() => {
		localStorage.setItem(
			"__dg_imgbed_filename_index_v1__",
			JSON.stringify({
				map: { "日常吐槽/test.png": { url: "https://tc.d15.cc.cd/file/日常吐槽/test.png", t: Date.now() } },
				ts: Date.now(),
			})
		);
	});
	await page.reload({ waitUntil: "networkidle" });
	result.steps.push("② 预填 localStorage 1 个文件名 + reload OK");

	// 打开编辑器
	await page.locator("#dg-open-editor").click();
	await page.waitForTimeout(400);
	const dialogOpen = await page.locator("#dg-editor[open]").count();
	check("③ 编辑器 dialog 打开", dialogOpen > 0);

	// 查 imgbed status 显示
	const statusText = await page.locator("#dg-imgbed-status").textContent();
	check("④ 图床查重状态显示本地 1 个文件名", /本地文件名索引[：:]\s*1\s*个/.test(statusText), statusText.trim().slice(0, 120));
	check("⑤ 跨浏览器同步已启用（已配置 PUBLIC_IMG_UPLOAD_TOKEN）", /跨浏览器同步[：:]\s*已启用/.test(statusText), statusText.trim().slice(0, 140));

	// 进入种子行编辑态
	await page.locator('#dg-editor-list .dg-row [data-act="edit"]').first().click();
	await page.waitForTimeout(300);
	const uploadBtn = await page.locator('#dg-editor-list .dg-row.is-editing [data-act="upload-img"]').count();
	check("⑥ 上传按钮可见", uploadBtn > 0);

	// ===== 测 A：上传「test.png」—— localStorage 命中，零 POST =====
	{
		const beforeCalls = uploadCalls;
		// 直接调用 hidden file input 注入同名文件
		await page.locator('#dg-editor-list .dg-row.is-editing [data-img-input]').setInputFiles({
			name: "test.png",
			mimeType: "image/png",
			buffer: TINY_PNG,
		});
		await page.waitForTimeout(800);
		const tip = await page.locator('#dg-editor-list .dg-row.is-editing [data-img-tip]').textContent();
		const thumbCount = await page.locator('#dg-editor-list .dg-row.is-editing .dg-thumb').count();
		check("A1 localStorage 命中：提示含「复用」", /复用/.test(tip), tip.trim());
		check("A2 localStorage 命中：未发 POST /upload", uploadCalls === beforeCalls, "POST 次数 = " + (uploadCalls - beforeCalls));
		check("A3 localStorage 命中：缩略图已添加", thumbCount === 1);
	}

	// ===== 测 B：上传「new.png」—— 新文件，走真实 uploadToImgbed（被 route 截） =====
	{
		const beforeCalls = uploadCalls;
		await page.locator('#dg-editor-list .dg-row.is-editing [data-img-input]').setInputFiles({
			name: "new.png",
			mimeType: "image/png",
			buffer: TINY_PNG_ALT,
		});
		await page.waitForTimeout(1500);
		const tip = await page.locator('#dg-editor-list .dg-row.is-editing [data-img-tip]').textContent();
		const afterCalls = uploadCalls;
		check("B1 新文件：发了一次 POST /upload", afterCalls === beforeCalls + 1, "POST 次数 = " + (afterCalls - beforeCalls));
		check("B2 新文件：payload 是 multipart（带文件）", uploadPayloads[0] && /multipart/.test(uploadPayloads[0].contentType) && uploadPayloads[0].size > 100);
		check("B3 新文件：提示已上传", /已上传\s*1\s*张/.test(tip), tip.trim());
	}

	// ===== 测 C：再传一次「new.png」—— 同会话 SHA-256 命中，零 POST =====
	{
		const beforeCalls = uploadCalls;
		// 先清掉缩略图再传（测的是同一文件被选两次的场景）
		await page.locator('#dg-editor-list .dg-row.is-editing [data-img-input]').setInputFiles({
			name: "new.png",
			mimeType: "image/png",
			buffer: TINY_PNG_ALT,
		});
		await page.waitForTimeout(1000);
		const tip = await page.locator('#dg-editor-list .dg-row.is-editing [data-img-tip]').textContent();
		check("C1 同会话 SHA-256 命中：未再发 POST", uploadCalls === beforeCalls, "POST 次数 = " + (uploadCalls - beforeCalls));
		check("C2 同会话命中：提示含「跳过重复」或「复用」", /跳过重复|复用/.test(tip), tip.trim());
	}

	// ===== 测 D：再传一次「test.png」—— localStorage 应已多了一条 new.png, test.png 仍在 =====
	{
		const idxSize = await page.evaluate(() => {
			const raw = localStorage.getItem("__dg_imgbed_filename_index_v1__");
			if (!raw) return 0;
			try { return Object.keys(JSON.parse(raw).map || {}).length; } catch (_e) { return -1; }
		});
		check("D1 localStorage 现在 2 个文件名（test.png + new.png）", idxSize === 2, "实际 = " + idxSize);
	}

	// ===== 测 E：移除 localStorage，重新传 new.png—— 应发 POST（验证不被卡死） =====
	{
		await page.evaluate(() => localStorage.removeItem("__dg_imgbed_filename_index_v1__"));
		await page.reload({ waitUntil: "networkidle" });
		await page.locator("#dg-open-editor").click();
		await page.waitForTimeout(300);
		await page.locator('#dg-editor-list .dg-row [data-act="edit"]').first().click();
		await page.waitForTimeout(300);
		const beforeCalls = uploadCalls;
		await page.locator('#dg-editor-list .dg-row.is-editing [data-img-input]').setInputFiles({
			name: "test.png",
			mimeType: "image/png",
			buffer: TINY_PNG,
		});
		await page.waitForTimeout(1500);
		const tip = await page.locator('#dg-editor-list .dg-row.is-editing [data-img-tip]').textContent();
		check("E1 清空 localStorage 后，新文件正常上传", uploadCalls === beforeCalls + 1, "POST 次数 = " + (uploadCalls - beforeCalls));
		check("E2 提示已上传，不卡死", /已上传/.test(tip), tip.trim());
	}
} catch (e) {
	result.steps.push("异常: " + e.message);
	result.pass = false;
}

await browser.close();

console.log("\n========== 验证步骤 ==========");
result.steps.forEach((s) => console.log(s));
console.log("\n========== 真实 page 错误 ==========");
console.log("  pageerror: " + errors.length);
errors.forEach((e) => console.log("    " + e));
console.log("  console.error: " + consoleErrors.length);
consoleErrors.forEach((e) => console.log("    " + e));

console.log(result.pass && errors.length === 0 ? "\n✅ 全部通过" : "\n❌ 验证未通过");
process.exit(result.pass && errors.length === 0 ? 0 : 1);
