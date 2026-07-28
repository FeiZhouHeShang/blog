import { chromium } from "file:///C:/Users/ADMINI~1/AppData/Local/Temp/node_modules/playwright-core/index.mjs";

const BASE = "http://localhost:4321";
const errors = [];

const browser = await chromium.launch({
	executablePath: "C:/Program Files/Google/Chrome/Application/chrome.exe",
	args: ["--no-sandbox"],
});
const page = await browser.newPage();
// 只捕获真正的 JS 异常（过滤 Vite 504/404 网络伪影）
page.on("pageerror", (e) => errors.push("[pageerror] " + e.message));
page.on("console", (msg) => {
	if (msg.type() === "error") {
		const t = msg.text();
		// 过滤 dev 沙箱偶发网络资源伪影
		if (/Failed to load resource|status of \d+|504|404/i.test(t)) return;
		errors.push("[console.error] " + t);
	}
});

const result = { steps: [] };

// 1) 打开页
await page.goto(BASE + "/moments/", { waitUntil: "networkidle" }).catch(() => {});
await page.waitForTimeout(800);
result.steps.push("页面加载: " + (await page.title()));

// 2) 公开列表含种子条目
const hasSeed = await page.locator("text=吐槽 测试上传图片").count();
result.steps.push("公开列表种子条目数: " + hasSeed);

// 3) 编辑按钮存在
const editBtn = page.locator("#dg-open-editor");
result.steps.push("编辑按钮存在: " + (await editBtn.count() > 0));

// 4) 点击打开编辑器
await editBtn.click();
await page.waitForTimeout(500);
const dialogOpen = await page.locator("#dg-editor[open]").count();
result.steps.push("对话框已打开: " + (dialogOpen > 0));

// 5) 编辑器列表应已填充 seed（来自 dg-seed）
const editorRows = await page.locator("#dg-editor-list .dg-row").count();
result.steps.push("编辑器列表行数(含seed): " + editorRows);

// 6) 进入编辑态后，图片上传按钮才出现（在表单内）
await page.locator('#dg-editor-list .dg-row [data-act="edit"]').first().click();
await page.waitForTimeout(400);
const uploadBtn = await page.locator('[data-act="upload-img"]').count();
result.steps.push("编辑态内图片上传按钮数: " + uploadBtn);
const imgPreview = await page.locator("[data-img-preview]").count();
result.steps.push("图片预览容器数: " + imgPreview);

// 7) 新增吐槽按钮
const addBtn = await page.locator("#dg-editor-add").count();
result.steps.push("新增按钮数: " + addBtn);

// 8) 图床认证码已烘焙
const imgbedAuth = await page.locator("#dg-editor[data-imgbed-auth]").getAttribute("data-imgbed-auth");
result.steps.push("图床认证码已烘焙: " + (imgbedAuth && imgbedAuth.startsWith("imgbed_")));

// 9) PAT 输入存在
const patInput = await page.locator("#dg-editor-pat").count();
result.steps.push("PAT 输入框数: " + patInput);

await page.screenshot({ path: "scripts/_verify_moments_dialog.png", fullPage: false });

await browser.close();

console.log("=== 验证步骤 ===");
result.steps.forEach((s) => console.log(" - " + s));
console.log("\n=== JS 错误 (" + errors.length + ") ===");
errors.forEach((e) => console.log(" " + e));

const fail =
	hasSeed === 0 ||
	dialogOpen === 0 ||
	editorRows === 0 ||
	uploadBtn === 0 ||
	imgPreview === 0 ||
	addBtn === 0 ||
	patInput === 0 ||
	!(imgbedAuth && imgbedAuth.startsWith("imgbed_")) ||
	errors.length > 0;
console.log(fail ? "\n❌ 验证未通过" : "\n✅ 全部通过");
process.exit(fail ? 1 : 0);
