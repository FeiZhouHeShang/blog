// 统一上传管理器
// 收集所有功能的本地草稿 → 展平为文件操作 → 通过 GitHub Git Data API
// 一次性构建一个 tree + 一个 commit → 推到 main。只占一次提交（即一次 Vercel 部署）。
//
// 未来新增可编辑功能，只需：① 在保存时 putDraft({feature:"<id>", ...})；
// ②（可选）在 FEATURE_META 注册展示信息。上传逻辑无需改动即可覆盖。

import { getAllDrafts, deleteDraft } from "@/scripts/draftStore";

const REPO = "FeiZhouHeShang/blog";
const API = "https://api.github.com/repos/" + REPO;

// 各功能在上传抽屉里的展示信息（未来功能在此登记即可）
export const FEATURE_META = {
  posts: { label: "文章", icon: "📝" },
  "movies-games": { label: "影视游戏", icon: "🎬" },
  "daily-grumble": { label: "日常吐槽", icon: "💬" },
};
export function featureMeta(id) {
  return FEATURE_META[id] || { label: id, icon: "📦" };
}

// 解析 PAT：三个编辑器各自存的位置不同，统一在此汇聚。
// 优先级：文章(session) > 吐槽(session) > 影视(localStorage) > 烘焙默认值（影视）。
export function resolvePat() {
  try {
    if (typeof sessionStorage !== "undefined") {
      const pe = sessionStorage.getItem("__pe_session_pat__");
      if (pe) return pe;
      const dg = sessionStorage.getItem("__dg_pat__");
      if (dg) return dg;
    }
    if (typeof localStorage !== "undefined") {
      const mg = localStorage.getItem("__mg_pat__");
      if (mg) return mg;
    }
  } catch (_e) {
    /* 隐私模式等可能抛错 */
  }
  return "";
}

// 供上传抽屉临时写入令牌（本次浏览有效）
export function setSessionPat(token) {
  try {
    if (token) sessionStorage.setItem("__pe_session_pat__", token);
    else sessionStorage.removeItem("__pe_session_pat__");
  } catch (_e) {
    /* ignore */
  }
}

async function gh(token, method, path, body) {
  const r = await fetch(API + path, {
    method,
    headers: {
      Accept: "application/vnd.github+json",
      Authorization: "Bearer " + token,
      "Content-Type": "application/json",
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  if (!r.ok) {
    let msg = r.status + " " + r.statusText;
    try {
      const j = await r.json();
      if (j && j.message) msg = j.message;
    } catch (_e) {
      /* ignore */
    }
    throw new Error("GitHub " + method + " " + path + " 失败：" + msg);
  }
  return r.json();
}

/**
 * 一次性上传所有本地草稿。
 * @param {object} opts
 *   onProgress(p, text)  0~1 进度
 *   onLog(kind, text)    kind: info|ok|error
 *   message              提交信息（默认自动生成）
 * @returns {{pushed:number, files:number, commitSha:string}}
 */
export async function uploadAll(opts) {
  opts = opts || {};
  const onProgress = opts.onProgress || function () {};
  const onLog = opts.onLog || function () {};

  const token = resolvePat();
  if (!token) {
    const e = new Error("未找到 GitHub PAT，请先在任意编辑器（文章 / 影视 / 吐槽）验证令牌");
    onLog("error", e.message);
    throw e;
  }

  const drafts = await getAllDrafts();
  if (!drafts.length) {
    onLog("info", "没有待上传的草稿");
    return { pushed: 0, files: 0, commitSha: "" };
  }

  // 展平文件操作；同一 path 多次写入以最后一次为准
  const fileMap = new Map();
  drafts.forEach((d) =>
    (d.files || []).forEach((f) => {
      if (f && f.path) fileMap.set(f.path, f);
    })
  );
  const files = [...fileMap.values()];
  const upserts = files.filter((f) => !f.delete);
  const deletes = files.filter((f) => f.delete);

  onProgress(0.05, "读取仓库最新提交…");
  const head = await gh(token, "GET", "/git/refs/heads/main");
  const baseCommitSha = head.object.sha;
  const baseCommit = await gh(token, "GET", "/git/commits/" + baseCommitSha);
  const baseTreeSha = baseCommit.tree.sha;

  // 为每个 upsert 创建 blob
  onProgress(0.15, "写入文件内容（" + upserts.length + " 个）…");
  const treeEntries = [];
  for (let i = 0; i < upserts.length; i++) {
    const f = upserts[i];
    const blob = await gh(token, "POST", "/git/blobs", {
      content: f.content,
      encoding: "base64",
    });
    treeEntries.push({ path: f.path, mode: "100644", type: "blob", sha: blob.sha });
    onProgress(0.15 + 0.6 * ((i + 1) / Math.max(1, upserts.length)), "已准备 " + (i + 1) + "/" + upserts.length);
  }
  // 删除项：sha 设为 null 即从树上移除
  deletes.forEach((f) => treeEntries.push({ path: f.path, mode: "100644", type: "blob", sha: null }));

  onProgress(0.8, "组装提交树…");
  const tree = await gh(token, "POST", "/git/trees", {
    base_tree: baseTreeSha,
    tree: treeEntries,
  });

  onProgress(0.9, "创建提交…");
  const msg =
    opts.message ||
    "chore: 批量上传本地草稿（" + drafts.length + " 项 / " + files.length + " 文件）";
  const commit = await gh(token, "POST", "/git/commits", {
    message: msg,
    tree: tree.sha,
    parents: [baseCommitSha],
  });

  onProgress(0.97, "更新 main 分支…");
  await gh(token, "PATCH", "/git/refs/heads/main", { sha: commit.sha });

  // 成功后清除这些草稿
  onProgress(1, "完成");
  await Promise.all(drafts.map((d) => deleteDraft(d.feature, d.id)));

  onLog(
    "ok",
    "✅ 已合并推送 " + drafts.length + " 项草稿 / " + files.length + " 个文件（仅 1 次提交）"
  );
  return { pushed: drafts.length, files: files.length, commitSha: commit.sha };
}
