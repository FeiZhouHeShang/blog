import { chromium } from "file:///C:/Users/ADMINI~1/AppData/Local/Temp/node_modules/playwright-core/index.mjs";

const errors = [];
const browser = await chromium.launch({
  executablePath: "C:/Program Files/Google/Chrome/Application/chrome.exe",
  args: ["--no-sandbox"],
});
const page = await browser.newPage();
page.on("pageerror", (e) => errors.push("[pageerror] " + e.message));

const result = { steps: [] };
try {
  await page.goto("http://localhost:4321/moments/", { waitUntil: "networkidle", timeout: 30000 });
  result.steps.push("页面加载: OK");

  const folder = await page.getAttribute("#dg-editor", "data-imgbed-folder");
  result.steps.push("图床目录: " + (folder || "(空)"));
  result.hasFolder = folder === "日常吐槽";

  // crypto.subtle 是否可用（去重哈希依赖 secure context；localhost 视为 secure）
  const hasSubtle = await page.evaluate(() => !!(window.crypto && window.crypto.subtle && window.crypto.subtle.digest));
  result.steps.push("crypto.subtle 可用: " + hasSubtle);
  result.hasSubtle = hasSubtle;

  // 打开编辑器
  await page.locator("#dg-open-editor").click();
  await page.waitForTimeout(400);
  const dialogOpen = await page.locator("#dg-editor[open]").count();
  result.steps.push("编辑器打开: " + (dialogOpen ? "OK" : "失败"));
  result.dialogOpen = dialogOpen > 0;

  // 进入种子行编辑态
  await page.locator('#dg-editor-list .dg-row [data-act="edit"]').first().click();
  await page.waitForTimeout(300);
  const uploadBtn = await page.locator('#dg-editor-list .dg-row.is-editing [data-act="upload-img"]').count();
  result.steps.push("上传按钮可见: " + (uploadBtn ? "OK" : "缺失"));
  result.uploadBtn = uploadBtn > 0;
} catch (e) {
  result.steps.push("异常: " + e.message);
}

await browser.close();
console.log(result.steps.join("\n"));
console.log("\nJS 错误数: " + errors.length);
errors.forEach((e) => console.log("  " + e));

const fail = !result.hasFolder || !result.hasSubtle || !result.dialogOpen || !result.uploadBtn || errors.length > 0;
console.log(fail ? "\n❌ 验证未通过" : "\n✅ 全部通过");
process.exit(fail ? 1 : 0);
