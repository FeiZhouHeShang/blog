// 全局本地草稿存储（IndexedDB）
// 所有前端可编辑功能（文章 / 影视游戏 / 日常吐槽 / 未来新增）都先把「工作副本」写入此处，
// 再由 uploadManager 统一一次性推送。这样编辑是实时本地保存、可反复确认，最后只「上传」一次。
//
// 草稿记录结构：
// {
//   feature: "posts" | "movies-games" | "daily-grumble" | <未来功能 id>,
//   id:      同一 feature 内的唯一键（文章=仓库路径；数据类=固定 "data"），
//   label:   给人看的名称（用于上传抽屉展示），
//   updatedAt: 时间戳，
//   files:   [{ path: "src/...", content: <base64(utf8)>, sha?: <当前远端 sha，可选>, delete?: true }]
// }

const DB_NAME = "blog-editor-drafts";
const STORE = "drafts";
const DB_VERSION = 1;

let _dbPromise = null;
function openDB() {
  if (_dbPromise) return _dbPromise;
  _dbPromise = new Promise((resolve, reject) => {
    if (typeof indexedDB === "undefined") {
      reject(new Error("当前环境不支持 IndexedDB"));
      return;
    }
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE)) {
        // 复合主键 [feature, id]：同一 feature 下每个条目一份草稿
        db.createObjectStore(STORE, { keyPath: ["feature", "id"] });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
  return _dbPromise;
}

function store(mode) {
  return openDB().then((db) => db.transaction(STORE, mode).objectStore(STORE));
}

export async function putDraft(draft) {
  const d = {
    feature: draft.feature,
    id: draft.id,
    label: draft.label || String(draft.id),
    updatedAt: draft.updatedAt || Date.now(),
    files: Array.isArray(draft.files) ? draft.files : [],
  };
  const s = await store("readwrite");
  return new Promise((resolve, reject) => {
    const r = s.put(d);
    r.onsuccess = () => {
      notify();
      resolve(d);
    };
    r.onerror = () => reject(r.error);
  });
}

export async function getDraft(feature, id) {
  const s = await store("readonly");
  return new Promise((resolve, reject) => {
    const r = s.get([feature, id]);
    r.onsuccess = () => resolve(r.result || null);
    r.onerror = () => reject(r.error);
  });
}

export async function getDrafts(feature) {
  const s = await store("readonly");
  return new Promise((resolve, reject) => {
    const r = s.getAll();
    r.onsuccess = () => {
      let all = r.result || [];
      if (feature) all = all.filter((x) => x.feature === feature);
      all.sort((a, b) => b.updatedAt - a.updatedAt);
      resolve(all);
    };
    r.onerror = () => reject(r.error);
  });
}

export const getAllDrafts = getDrafts;

export async function deleteDraft(feature, id) {
  const s = await store("readwrite");
  return new Promise((resolve, reject) => {
    const r = s.delete([feature, id]);
    r.onsuccess = () => {
      notify();
      resolve();
    };
    r.onerror = () => reject(r.error);
  });
}

export async function clearFeature(feature) {
  const all = await getDrafts(feature);
  await Promise.all(all.map((d) => deleteDraft(d.feature, d.id)));
}

export async function countDrafts() {
  const all = await getDrafts();
  return all.length;
}

// ===== 订阅：悬浮按钮红点实时刷新 =====
const _subs = new Set();
export function subscribe(cb) {
  _subs.add(cb);
  return () => _subs.delete(cb);
}
function notify() {
  _subs.forEach((cb) => {
    try {
      cb();
    } catch (_e) {
      /* 忽略单个订阅错误 */
    }
  });
}

if (typeof window !== "undefined") {
  window.addEventListener("DOMContentLoaded", () => setTimeout(notify, 0));
}
