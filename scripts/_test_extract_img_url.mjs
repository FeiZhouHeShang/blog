// 用 Function eval 把 moments.astro 里那段 inline JS 抽出 extractImgUrl 来测
const extractSrc = `
function extractImgUrl(data) {
\tif (!data) return "";
\tif (typeof data === "string") return data;
\t// ① 顶层就是数组（CF ImgBed 标准）
\tif (Array.isArray(data)) {
\t\tvar first = data[0];
\t\tif (!first || typeof first !== "object") return "";
\t\treturn first.src || first.url || first.link || first.absolute_url || first.full_url || first.pathname || first.publicUrl || "";
\t}
\t// ② {data: [...] | {...}} —— 兼容旧版/API Token 模式返回
\tvar inner = data.data;
\tif (inner && typeof inner === "object") {
\t\tif (Array.isArray(inner)) {
\t\t\tvar f = inner[0];
\t\t\tif (!f || typeof f !== "object") return "";
\t\t\treturn f.src || f.url || f.link || f.publicUrl || "";
\t\t}
\t\treturn inner.src || inner.url || inner.link || inner.absolute_url || inner.full_url || inner.pathname || inner.publicUrl || "";
\t}
\t// ③ 扁平对象
\treturn data.src || data.url || data.link || data.absolute_url || data.full_url || data.pathname || data.publicUrl || "";
}
return extractImgUrl;
`;

const cases = [
    // [label, input, expected]
    ["CF ImgBed 标准数组 (full)", [{ src: "https://tc.d15.cc.cd/file/abc.png", publicUrl: "https://cdn.example/abc" }], "https://tc.d15.cc.cd/file/abc.png"],
    ["CF ImgBed 标准数组 (relative)", [{ src: "/file/abc.png" }], "/file/abc.png"],
    ["空数组", [], ""],
    ["包装数组 {data: [...]}", { data: [{ src: "https://x/y.jpg" }] }, "https://x/y.jpg"],
    ["包装对象 {data: {...}}", { data: { src: "https://x/y.jpg" } }, "https://x/y.jpg"],
    ["扁平对象 (url)", { url: "https://x/y.jpg" }, "https://x/y.jpg"],
    ["扁平对象 (link)", { link: "https://x/y.jpg" }, "https://x/y.jpg"],
    ["字符串直返", "https://x/y.jpg", "https://x/y.jpg"],
    ["null", null, ""],
    ["undef", undefined, ""],
    ["publicUrl 兜底 (无 src)", [{ publicUrl: "https://cdn.example/abc.png" }], "https://cdn.example/abc.png"],
    ["双对象 兼容 link 字段", [{ link: "https://x/y.jpg" }], "https://x/y.jpg"],
];

const fn = new Function(extractSrc)();

let fail = 0;
for (const [label, input, expected] of cases) {
    let actual;
    try { actual = fn(input); } catch (e) { actual = "<<<THROW: " + e.message + ">>>"; }
    const ok = actual === expected;
    console.log((ok ? "✅" : "❌") + ` ${label.padEnd(36)} → ${JSON.stringify(actual)}` + (ok ? "" : `  (期望 ${JSON.stringify(expected)})`));
    if (!ok) fail++;
}
console.log(fail ? `\n❌ ${fail} 用例失败` : `\n✅ 全部 ${cases.length} 用例通过`);
process.exit(fail ? 1 : 0);
