// 全局上传中心（抽屉 + 计数角标）
// 不再有独立悬浮按钮：改为复用右下角 FloatingDock 里的「上传」按钮（#uc-dock-trigger），
// 颜色与主题同步，融入原有功能列表；待上传数量同时显示在 dock 开关上（#uc-dock-toggle-badge）。
// 由 Layout 的持久化引导脚本调用 bootUploadCenter() 启动。

import { getAllDrafts, deleteDraft, countDrafts, subscribe } from "@/scripts/draftStore";
import { uploadAll, featureMeta, resolvePat, setSessionPat } from "@/scripts/uploadManager";

let _built = false;
let _els = {};

export function bootUploadCenter() {
  if (_built) return;
  if (typeof document === "undefined") return;
  _built = true;
  injectStyles();
  buildDom();
  bindEvents();
  refresh();
  subscribe(refresh);
  // 对外 API：
  //   open/close/toggle/refresh —— 抽屉控制
  //   upload()                  —— 走抽屉 UI 的上传（状态显示在抽屉里）
  //   uploadAll(opts)           —— 原始上传函数，支持 onProgress/onLog 回调，
  //                                供各功能页「一键上传」在自己的 UI 里显示进度
  //   resolvePat()              —— 读取当前可用令牌
  //   refreshBadge()            —— 上传后刷新角标
  window.__uploadCenter = {
    open,
    close,
    refresh,
    upload: doUpload,
    toggle,
    uploadAll,
    resolvePat,
    refreshBadge: refresh,
  };
}

function injectStyles() {
  if (document.getElementById("uc-style")) return;
  const css = `
  #uc-backdrop {
    position: fixed; inset: 0; background: rgba(15,15,25,0.45); z-index: 99991;
    backdrop-filter: blur(2px);
  }
  #uc-drawer {
    position: fixed; right: 22px; bottom: 88px; z-index: 99992; width: min(380px, calc(100vw - 32px));
    max-height: min(70vh, 640px); display: flex; flex-direction: column;
    background: var(--card-bg, #fff); color: var(--deep-text, #111);
    border: 1px solid var(--line-divider, #e5e7eb); border-radius: 16px; overflow: hidden;
    box-shadow: 0 20px 60px rgba(0,0,0,0.25); font-size: 14px;
  }
  #uc-drawer[hidden], #uc-backdrop[hidden] { display: none; }
  .uc-head { display: flex; align-items: center; justify-content: space-between; padding: 14px 16px 6px; }
  .uc-head strong { font-size: 15px; }
  .uc-close { background: transparent; border: none; font-size: 22px; line-height: 1; cursor: pointer; color: var(--content-meta,#9ca3af); border-radius: 8px; width: 32px; height: 32px; }
  .uc-close:hover { background: var(--btn-card-bg-hover,#f1f1f4); color: var(--deep-text,#111); }
  .uc-sub { padding: 0 16px 10px; color: var(--content-meta,#9ca3af); font-size: 12.5px; }
  .uc-list { flex: 1; overflow-y: auto; padding: 4px 10px 10px; display: flex; flex-direction: column; gap: 6px; }
  .uc-group-title { font-size: 12px; color: var(--content-meta,#9ca3af); margin: 8px 6px 2px; font-weight: 600; }
  .uc-item { display: flex; align-items: center; gap: 8px; padding: 8px 10px; border-radius: 10px;
    background: var(--btn-card-bg-hover,#f6f6f9); border: 1px solid var(--line-divider,#eef0f3); }
  .uc-item-icon { font-size: 16px; }
  .uc-item-label { flex: 1; min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  .uc-item-time { font-size: 11px; color: var(--content-meta,#9ca3af); white-space: nowrap; }
  .uc-item-discard { background: transparent; border: 1px solid var(--line-divider,#e5e7eb); color: #ef4444;
    border-radius: 8px; padding: 3px 8px; font-size: 12px; cursor: pointer; }
  .uc-item-discard:hover { background: #fee2e2; }
  .uc-empty { padding: 24px 16px; text-align: center; color: var(--content-meta,#9ca3af); }
  .uc-foot { border-top: 1px solid var(--line-divider,#e5e7eb); padding: 12px 14px; display: flex; flex-direction: column; gap: 10px; }
  .uc-status { font-size: 12.5px; min-height: 16px; }
  .uc-status.is-ok { color: #16a34a; }
  .uc-status.is-error { color: #ef4444; }
  .uc-pat-row { display: flex; gap: 6px; }
  .uc-pat-row input { flex: 1; min-width: 0; padding: 7px 9px; border-radius: 8px; border: 1px solid var(--line-divider,#e5e7eb); background: var(--btn-card-bg-hover,#fafafa); color: var(--deep-text,#111); font-size: 12.5px; }
  .uc-pat-row input:focus { outline: 2px solid var(--primary, #6366f1); border-color: var(--primary, #6366f1); }
  .uc-pat-save { padding: 7px 10px; border-radius: 8px; border: 1px solid var(--line-divider,#e5e7eb); background: var(--btn-card-bg-hover,#f1f1f4); color: var(--deep-text,#111); cursor: pointer; font-size: 12.5px; }
  .uc-upload-btn { width: 100%; padding: 11px; border-radius: 10px; border: none; cursor: pointer;
    background: var(--primary, #6366f1); color: var(--page-bg, #fff); font-size: 14px; font-weight: 600; }
  .uc-upload-btn:hover { filter: brightness(1.05); }
  .uc-upload-btn:disabled { opacity: 0.6; cursor: default; }
  @media (prefers-reduced-motion: reduce) { #uc-drawer { transition: none; } }
  `;
  const style = document.createElement("style");
  style.id = "uc-style";
  style.textContent = css;
  document.head.appendChild(style);
}

function buildDom() {
  const backdrop = document.createElement("div");
  backdrop.id = "uc-backdrop";
  backdrop.hidden = true;

  const drawer = document.createElement("div");
  drawer.id = "uc-drawer";
  drawer.hidden = true;
  drawer.setAttribute("role", "dialog");
  drawer.setAttribute("aria-label", "上传中心");
  drawer.innerHTML = `
    <div class="uc-head">
      <strong>上传中心</strong>
      <button id="uc-close" class="uc-close" type="button" aria-label="关闭">×</button>
    </div>
    <div class="uc-sub">本地所有草稿将合并为 <b>1 次提交</b> 推送（仅 1 次部署）</div>
    <div id="uc-list" class="uc-list"></div>
    <div class="uc-foot">
      <div id="uc-status" class="uc-status" role="status"></div>
      <div class="uc-pat-row">
        <input id="uc-pat" type="password" placeholder="GitHub PAT（已验证可留空）" autocomplete="off" spellcheck="false" />
        <button id="uc-pat-save" class="uc-pat-save" type="button">记住</button>
      </div>
      <button id="uc-upload" class="uc-upload-btn" type="button">全部上传 (0)</button>
    </div>`;

  document.body.appendChild(backdrop);
  document.body.appendChild(drawer);

  _els = {
    backdrop,
    drawer,
    list: drawer.querySelector("#uc-list"),
    status: drawer.querySelector("#uc-status"),
    pat: drawer.querySelector("#uc-pat"),
    patSave: drawer.querySelector("#uc-pat-save"),
    upload: drawer.querySelector("#uc-upload"),
    close: drawer.querySelector("#uc-close"),
    // 复用 FloatingDock 中的触发按钮与角标（不存在时安全跳过）
    trigger: document.getElementById("uc-dock-trigger"),
    badge: document.getElementById("uc-dock-badge"),
    toggleBadge: document.getElementById("uc-dock-toggle-badge"),
  };
}

function bindEvents() {
  _els.close.addEventListener("click", close);
  _els.backdrop.addEventListener("click", close);
  _els.patSave.addEventListener("click", () => {
    const v = _els.pat.value.trim();
    setSessionPat(v);
    setStatus(v ? "✓ 已记住令牌（本次浏览有效）" : "已清除令牌", v ? "is-ok" : "");
  });
  _els.upload.addEventListener("click", () => doUpload());
  // 复用 dock 里的「上传」按钮：点击切换抽屉
  if (_els.trigger) {
    _els.trigger.addEventListener("click", (e) => {
      e.stopPropagation();
      toggle();
    });
  }
  // 抽屉内的丢弃按钮（事件委托）
  _els.list.addEventListener("click", (e) => {
    const btn = e.target.closest && e.target.closest(".uc-item-discard");
    if (!btn) return;
    const item = btn.closest(".uc-item");
    if (!item) return;
    const f = item.getAttribute("data-feature");
    const id = item.getAttribute("data-id");
    deleteDraft(f, id).then(refresh).catch((err) => setStatus("丢弃失败：" + err.message, "is-error"));
  });
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && !_els.drawer.hidden) close();
  });
}

function open() {
  _els.drawer.hidden = false;
  _els.backdrop.hidden = false;
  refresh();
}
function close() {
  _els.drawer.hidden = true;
  _els.backdrop.hidden = true;
}
function toggle() {
  if (_els.drawer.hidden) open();
  else close();
}

function fmtTime(ts) {
  try {
    const d = new Date(ts);
    const p = (n) => String(n).padStart(2, "0");
    return p(d.getHours()) + ":" + p(d.getMinutes());
  } catch (_e) {
    return "";
  }
}

async function refresh() {
  const drafts = await getAllDrafts();
  const n = drafts.length;
  if (_els.badge) {
    _els.badge.textContent = n > 99 ? "99+" : String(n);
    _els.badge.hidden = n === 0;
  }
  if (_els.toggleBadge) {
    // 仅作红点提示，无数字
    _els.toggleBadge.hidden = n === 0;
  }
  if (_els.upload) _els.upload.textContent = "全部上传 (" + n + ")";
  if (_els.list) {
    if (!n) {
      _els.list.innerHTML = '<div class="uc-empty">暂无待上传草稿<br/>编辑文章 / 影视 / 吐槽会自动存为本地草稿</div>';
      return;
    }
    // 按功能分组
    const groups = {};
    drafts.forEach((d) => {
      (groups[d.feature] = groups[d.feature] || []).push(d);
    });
    let html = "";
    Object.keys(groups).forEach((feat) => {
      const meta = featureMeta(feat);
      html += '<div class="uc-group-title">' + meta.icon + " " + meta.label + "（" + groups[feat].length + "）</div>";
      groups[feat].forEach((d) => {
        html +=
          '<div class="uc-item" data-feature="' + esc(feat) + '" data-id="' + esc(d.id) + '">' +
          '<span class="uc-item-icon" aria-hidden="true">' + meta.icon + "</span>" +
          '<span class="uc-item-label" title="' + esc(d.label) + '">' + esc(d.label) + "</span>" +
          '<span class="uc-item-time">' + fmtTime(d.updatedAt) + "</span>" +
          '<button class="uc-item-discard" type="button" aria-label="丢弃草稿">丢弃</button>' +
          "</div>";
      });
    });
    _els.list.innerHTML = html;
  }
}

async function doUpload() {
  _els.upload.disabled = true;
  setStatus("准备上传…", "");
  const patVal = _els.pat.value.trim();
  if (patVal) setSessionPat(patVal);
  try {
    await uploadAll({
      onProgress: (_p, text) => {
        if (text) setStatus(text, "");
      },
      onLog: (kind, text) => setStatus(text, kind === "error" ? "is-error" : kind === "ok" ? "is-ok" : ""),
    });
    refresh();
  } catch (e) {
    setStatus("❌ " + (e && e.message ? e.message : e), "is-error");
  } finally {
    _els.upload.disabled = false;
  }
}

function setStatus(text, kind) {
  if (!_els.status) return;
  _els.status.textContent = text || "";
  _els.status.className = "uc-status" + (kind ? " " + kind : "");
}

function esc(s) {
  return String(s == null ? "" : s).replace(/[&<>"']/g, (c) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;",
  })[c]);
}
