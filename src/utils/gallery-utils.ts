import fs from "node:fs";
import path from "node:path";
import type { GalleryAlbum } from "@/types/config";
import { url } from "@/utils/url-utils";

function withBase(assetPath: string): string {
	if (!assetPath) return "";
	if (/^(https?:)?\/\//i.test(assetPath) || /^(data|blob):/i.test(assetPath)) {
		return assetPath;
	}
	const normalizedPath = assetPath.startsWith("/")
		? assetPath
		: `/${assetPath}`;
	const base = import.meta.env.BASE_URL || "/";
	if (base !== "/" && normalizedPath.startsWith(base)) {
		return normalizedPath;
	}
	return url(normalizedPath);
}

/**
 * 相册元素：图片或视频。
 * 视频在瀑布流里用 <video muted autoplay loop playsinline> 缩略自动播放，
 * 灯箱（fancybox）里用 data-type="html5video" 弹出可暂停/全屏播放。
 */
export type PhotoItem = {
	/** 站点内（或外链）的可访问 URL */
	src: string;
	/** 元素类型：image 图片 / video 视频（mp4/webm/mov） */
	type: "image" | "video";
	/** 原文件名（用于在 PhotoCard title 上做悬浮提示） */
	name: string;
};

/**
 * 扫描相册目录下的图片 + 视频文件。
 * 视频后缀：mp4 / webm / mov；图片：jpg/png/webp/avif/gif。
 * cover.* 仍只匹配图片（视频不作封面）；视频排在图片之后。
 */
export function scanAlbumPhotos(albumId: string): PhotoItem[] {
	const dir = path.join(process.cwd(), "public", "gallery", albumId);
	if (!fs.existsSync(dir)) return [];
	const IMAGE_RE = /\.(jpe?g|png|webp|avif|gif)$/i;
	const VIDEO_RE = /\.(mp4|webm|mov)$/i;
	const files = fs
		.readdirSync(dir)
		.filter((f) => IMAGE_RE.test(f) || VIDEO_RE.test(f))
		.sort();
	// 将 cover.* 排到第一位（视频不作封面，所以 cover.* 一定是图片）
	const coverIdx = files.findIndex((f) => /^cover\./i.test(f));
	if (coverIdx > 0) {
		const [coverFile] = files.splice(coverIdx, 1);
		files.unshift(coverFile);
	}
	return files.map((f) => ({
		src: withBase(`/gallery/${albumId}/${f}`),
		type: VIDEO_RE.test(f) ? "video" : "image",
		name: f,
	}));
}

/**
 * 获取相册封面图（仅图片）。视频不作封面。
 * 优先级：手动指定 > cover.* 文件 > 第一张图片 > 空
 */
export function getAlbumCover(album: GalleryAlbum, photos: PhotoItem[]): string {
	if (album.cover) return withBase(album.cover);
	const coverFile = photos.find(
		(p) => p.type === "image" && /\/cover\./i.test(p.src),
	);
	if (coverFile) return coverFile.src;
	const firstImage = photos.find((p) => p.type === "image");
	return firstImage ? firstImage.src : "";
}
