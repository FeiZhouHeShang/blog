// _test_imgbed_dedup.mjs
// 日常吐槽图床查重逻辑单测（filename 索引 / 跨目录隔离 / TTL 过期）
// 用 Node 22 + 自带 localStorage polyfill（不依赖浏览器）
// --------------------------------------------------------------------------

import { strict as assert } from "node:assert";
import { test } from "node:test";

// --- localStorage polyfill（按浏览器语义实现） ---
class LS {
	constructor() { this.s = new Map(); }
	getItem(k) { return this.s.has(k) ? this.s.get(k) : null; }
	setItem(k, v) { this.s.set(k, String(v)); }
	removeItem(k) { this.s.delete(k); }
	clear() { this.s.clear(); }
	get length() { return this.s.size; }
	key(i) { return Array.from(this.s.keys())[i] ?? null; }
}
const ls = new LS();
// 把 globalThis.localStorage 指过去，让被测代码直接用
Object.defineProperty(globalThis, "localStorage", { value: ls, writable: false, configurable: false });

// --- 复刻被测代码的常量（与 src/pages/moments.astro 中实现完全一致） ---
const FILENAME_INDEX_KEY = "__dg_imgbed_filename_index_v1__";
const FILENAME_INDEX_TTL_MS = 30 * 24 * 60 * 60 * 1000;

function loadFilenameIndex() {
	try {
		const raw = localStorage.getItem(FILENAME_INDEX_KEY);
		if (!raw) return {};
		const obj = JSON.parse(raw);
		if (!obj || typeof obj !== "object" || !obj.map) return {};
		const now = Date.now();
		const out = {};
		let changed = false;
		for (const k of Object.keys(obj.map)) {
			const v = obj.map[k];
			if (!v || typeof v !== "object" || !v.url || !v.t) continue;
			if (now - v.t > FILENAME_INDEX_TTL_MS) { changed = true; continue; }
			out[k] = v;
		}
		if (changed) saveFilenameIndex(out);
		return out;
	} catch (_e) { return {}; }
}
function saveFilenameIndex(map) {
	try { localStorage.setItem(FILENAME_INDEX_KEY, JSON.stringify({ map, ts: Date.now() })); } catch (_e) {}
}
function indexKey(folder, filename) { return (folder || "") + "/" + filename; }
function lookupFilenameIndex(folder, filename) {
	const idx = loadFilenameIndex();
	return idx[indexKey(folder, filename)] || null;
}
function writeFilenameIndex(folder, filename, url) {
	const idx = loadFilenameIndex();
	idx[indexKey(folder, filename)] = { url, t: Date.now() };
	saveFilenameIndex(idx);
}

// ====== 测试用例 ======

test("空索引：lookup 应该返回 null", () => {
	ls.clear();
	assert.equal(lookupFilenameIndex("日常吐槽", "test.png"), null);
});

test("写入 + 读回：writeFilenameIndex 后 lookup 应能命中", () => {
	ls.clear();
	writeFilenameIndex("日常吐槽", "test.png", "https://tc.d15.cc.cd/file/日常吐槽/test.png");
	const r = lookupFilenameIndex("日常吐槽", "test.png");
	assert.ok(r, "应能命中");
	assert.equal(r.url, "https://tc.d15.cc.cd/file/日常吐槽/test.png");
	assert.ok(r.t > 0, "应有时间戳");
});

test("跨目录隔离：日常吐槽/test.png 不应命中 其他/test.png", () => {
	ls.clear();
	writeFilenameIndex("日常吐槽", "test.png", "https://tc.d15.cc.cd/file/日常吐槽/test.png");
	assert.ok(lookupFilenameIndex("日常吐槽", "test.png"));
	assert.equal(lookupFilenameIndex("相册", "test.png"), null, "不同目录同文件名应隔离");
});

test("同目录同文件覆盖：后写覆盖前写", () => {
	ls.clear();
	writeFilenameIndex("日常吐槽", "test.png", "https://old.url");
	writeFilenameIndex("日常吐槽", "test.png", "https://new.url");
	const r = lookupFilenameIndex("日常吐槽", "test.png");
	assert.equal(r.url, "https://new.url", "应被新 URL 覆盖");
});

test("TTL 过期清理：30 天前的条目 load 时应被剔除", () => {
	ls.clear();
	// 直接构造过期数据
	const expired = {
		map: {
			"日常吐槽/old.png": { url: "https://old.url", t: Date.now() - 31 * 24 * 60 * 60 * 1000 },
			"日常吐槽/fresh.png": { url: "https://fresh.url", t: Date.now() - 1000 },
		},
		ts: Date.now(),
	};
	ls.setItem(FILENAME_INDEX_KEY, JSON.stringify(expired));
	const r = loadFilenameIndex();
	assert.equal(r["日常吐槽/old.png"], undefined, "过期项应被剔除");
	assert.ok(r["日常吐槽/fresh.png"], "新鲜项应保留");
	assert.equal(r["日常吐槽/fresh.png"].url, "https://fresh.url");
});

test("损坏数据：localStorage 是非 JSON 时 load 不应崩", () => {
	ls.clear();
	ls.setItem(FILENAME_INDEX_KEY, "{这不是合法 JSON");
	const r = loadFilenameIndex();
	assert.deepEqual(r, {}, "应安全降级为空对象");
});

test("空 map：saveFilenameIndex({}) 后 lookup 应返回 null", () => {
	ls.clear();
	saveFilenameIndex({});
	assert.equal(lookupFilenameIndex("日常吐槽", "x.png"), null);
});

test("大量条目：1000 个文件写入读回应全部命中", () => {
	ls.clear();
	for (let i = 0; i < 1000; i++) {
		writeFilenameIndex("日常吐槽", `img-${i}.png`, `https://tc.d15.cc.cd/file/日常吐槽/img-${i}.png`);
	}
	for (let i = 0; i < 1000; i++) {
		const r = lookupFilenameIndex("日常吐槽", `img-${i}.png`);
		assert.ok(r, `第 ${i} 个应命中`);
		assert.equal(r.url, `https://tc.d15.cc.cd/file/日常吐槽/img-${i}.png`);
	}
});

test("中文字段：文件夹/文件名含中文应正常", () => {
	ls.clear();
	writeFilenameIndex("日常吐槽", "吐槽照片.png", "https://tc.d15.cc.cd/file/日常吐槽/吐槽照片.png");
	const r = lookupFilenameIndex("日常吐槽", "吐槽照片.png");
	assert.ok(r);
	assert.equal(r.url, "https://tc.d15.cc.cd/file/日常吐槽/吐槽照片.png");
});
