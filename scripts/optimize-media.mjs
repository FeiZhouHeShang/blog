// scripts/optimize-media.mjs
// 部署前（prebuild）自动压缩 public/ 下的图片与视频。
// - 幂等：已压缩（尺寸/体积达标）的文件直接跳过，重复构建不会重压、不会拖慢。
// - 安全：覆盖原文件前先把原图备份到 public/.media-originals/（已 gitignore）。
// - 健壮：sharp / ffmpeg 任一不可用也只是跳过并告警，绝不导致构建失败。
// 用法：node scripts/optimize-media.mjs [--dry]
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const PUBLIC = path.join(ROOT, 'public');
const BACKUP = path.join(PUBLIC, '.media-originals');
const DRY = process.argv.includes('--dry');

const IMG_MAX_WIDTH = 1600;            // 图片宽上限（相册/配图）
const IMG_THRESHOLD = 400 * 1024;      // 图片：体积小于此且尺寸达标则跳过
const VID_THRESHOLD = 5 * 1024 * 1024; // 视频：大于 5MB 才压

// 待扫描目录（覆盖之前实测出的所有大资源：gallery 133MB / pio wav / assets webm）
const TARGET_DIRS = [
  path.join(PUBLIC, 'gallery'),
  path.join(PUBLIC, 'assets'),
  path.join(PUBLIC, 'pio'),
];

const IMG_EXT = new Set(['.jpg', '.jpeg', '.png', '.webp', '.avif', '.gif', '.bmp']);
const VID_EXT = new Set(['.mp4', '.webm', '.mov', '.m4v', '.ogg']);

const log = (...a) => console.log('[optimize-media]', ...a);

let sharp = null;
try {
  sharp = (await import('sharp')).default;
} catch {
  sharp = null;
}

let ffmpegPath = null;
try {
  ffmpegPath = (await import('ffmpeg-static')).default;
} catch {}
if (!ffmpegPath) {
  try {
    ffmpegPath = spawnSync('ffmpeg', ['-version'], { stdio: 'ignore' }).status === 0 ? 'ffmpeg' : null;
  } catch {
    ffmpegPath = null;
  }
}

let changed = 0;
let skipped = 0;
let errors = 0;

function walk(dir) {
  const out = [];
  if (!fs.existsSync(dir)) return out;
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) out.push(...walk(p));
    else out.push(p);
  }
  return out;
}

function rel(p) {
  return path.relative(ROOT, p);
}

// 覆盖前备份原文件（仅首次）
function backup(orig) {
  const dest = path.join(BACKUP, rel(orig));
  if (fs.existsSync(dest)) return;
  fs.mkdirSync(path.dirname(dest), { recursive: true });
  fs.copyFileSync(orig, dest);
}

async function optimizeImage(file) {
  const buf = fs.readFileSync(file);
  if (!sharp) {
    log('WARN sharp 不可用，跳过图片', rel(file));
    errors++;
    return;
  }
  try {
    const img = sharp(buf);
    const meta = await img.metadata();
    const w = meta.width || 0;
    // 已达标：宽度不超上限 且 体积不超阈值 → 跳过
    if (w <= IMG_MAX_WIDTH && buf.length <= IMG_THRESHOLD) {
      skipped++;
      return;
    }
    const fmt = meta.format === 'jpeg' ? 'jpg' : (meta.format || 'webp');
    const out = await img
      .resize({ width: IMG_MAX_WIDTH, withoutEnlargement: true })
      .toFormat(fmt, { quality: 82 })
      .toBuffer();
    // 压完没变小（比如已是极限压缩）就不动，避免无谓写盘
    if (out.length >= buf.length) {
      skipped++;
      return;
    }
    if (!DRY) backup(file);
    if (!DRY) fs.writeFileSync(file, out);
    changed++;
    log(
      (DRY ? '[dry] ' : '') + '压缩图片',
      rel(file),
      (buf.length / 1024) | 0 + 'KB -> ' + (out.length / 1024) | 0 + 'KB'
    );
  } catch (e) {
    errors++;
    log('ERR', rel(file), e.message);
  }
}

function optimizeVideo(file) {
  const size = fs.statSync(file).size;
  if (size <= VID_THRESHOLD) {
    skipped++;
    return;
  }
  if (!ffmpegPath) {
    log('WARN ffmpeg 不可用，跳过视频', rel(file));
    errors++;
    return;
  }
  if (DRY) {
    log('[dry] 将压缩视频', rel(file), (size / 1048576).toFixed(1) + 'MB');
    changed++;
    return;
  }
  const tmp = file + '.tmp' + path.extname(file);
  const args = [
    '-y',
    '-i', file,
    '-vf', 'scale=-2:min(720,ih)',
    '-c:v', 'libx264',
    '-crf', '28',
    '-preset', 'veryfast',
    '-movflags', '+faststart',
    '-c:a', 'aac',
    '-b:a', '128k',
    tmp,
  ];
  const r = spawnSync(ffmpegPath, args, { stdio: 'ignore' });
  if (r.status !== 0) {
    errors++;
    try { fs.unlinkSync(tmp); } catch {}
    log('ERR ffmpeg 失败', rel(file));
    return;
  }
  backup(file);
  fs.renameSync(tmp, file);
  changed++;
  log('压缩视频', rel(file), (size / 1048576).toFixed(1) + 'MB -> ' + (fs.statSync(file).size / 1048576).toFixed(1) + 'MB');
}

async function main() {
  log('开始扫描媒体资源（dry=' + DRY + '）');
  if (!sharp) log('提示：sharp 未加载，图片不会被压缩');
  if (!ffmpegPath) log('提示：ffmpeg 未加载，视频不会被压缩（请确认已安装 ffmpeg-static 或系统 ffmpeg）');

  for (const dir of TARGET_DIRS) {
    for (const file of walk(dir)) {
      const ext = path.extname(file).toLowerCase();
      if (IMG_EXT.has(ext)) await optimizeImage(file);
      else if (VID_EXT.has(ext)) optimizeVideo(file);
    }
  }

  log(`完成：压缩 ${changed} 个，跳过 ${skipped} 个，异常 ${errors} 个`);
  // 即使有异常也以 0 退出，绝不阻断部署
  process.exit(0);
}

main();
