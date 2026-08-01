<script lang="ts">
interface Props {
	src: string;
	albumId: string;
	alt?: string;
	type?: "image" | "video";
	name?: string;
}

const { src, albumId, alt = "", type = "image", name = "" }: Props = $props();

let container: HTMLDivElement | undefined = $state();
let visible = $state(false);
let videoRef: HTMLVideoElement | undefined = $state();
let status = $state<"loading" | "loaded" | "error">("loading");

$effect(() => {
	if (!container) return;
	const observer = new IntersectionObserver(
		(entries) => {
			if (entries[0].isIntersecting) {
				visible = true;
				observer.disconnect();
			}
		},
		{ rootMargin: "200px" },
	);
	observer.observe(container);
	return () => observer.disconnect();
});

// 视频进入视口后再 autoplay（performance + 浏览器策略）
$effect(() => {
	if (type === "video" && visible && videoRef) {
		videoRef.play().catch(() => {});
	}
});

function onLoad() {
	status = "loaded";
}
function onError() {
	status = "error";
}
</script>

<div class="break-inside-avoid mb-3" bind:this={container}>
  <div
    data-fancybox={`gallery-${albumId}`}
    data-src={src}
    data-type={type === "video" ? "html5video" : "image"}
    data-video-src={type === "video" ? src : undefined}
    data-caption={name || alt || undefined}
    title={name || alt || undefined}
    class="block rounded-xl overflow-hidden group cursor-pointer relative {visible ? '' : 'invisible'}"
  >
    {#if status !== "error"}
      <!-- 骨架屏：加载期间作为正常流元素撑起容器高度，加载完成后淡出 -->
      <div
        class="w-full aspect-[4/3] bg-neutral-200 dark:bg-neutral-800 transition-opacity duration-500 {status === 'loaded' ? 'opacity-0 absolute inset-0' : 'animate-pulse'}"
      ></div>

      {#if type === "image"}
        <img
          {src}
          {alt}
          loading="lazy"
          decoding="async"
          onload={onLoad}
          onerror={onError}
          class="block w-full h-auto object-cover transition-all duration-500 {status === 'loaded' ? 'opacity-100 group-hover:scale-105' : 'opacity-0 absolute inset-0'}"
        />
      {:else}
        <!-- 视频：瀑布流里静音循环自动播放，给视频一个明确的画面提示 -->
        <div class="relative">
          <video
            bind:this={videoRef}
            {src}
            muted
            playsinline
            loop
            preload="metadata"
            onloadeddata={onLoad}
            onerror={onError}
            class="block w-full h-auto object-cover transition-all duration-500 {status === 'loaded' ? 'opacity-100 group-hover:scale-105' : 'opacity-0 absolute inset-0'}"
          ></video>
          <!-- 视频角标：让用户知道这是视频 -->
          <span
            class="absolute top-2 right-2 inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md text-[0.65rem] font-medium bg-black/55 text-white backdrop-blur-sm pointer-events-none"
          >
            <svg class="w-3 h-3" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
              <path d="M8 5v14l11-7z" />
            </svg>
            视频
          </span>
          <!-- 悬停提示：点击播放/暂停（实际在灯箱里完整控制） -->
          <span
            class="absolute bottom-2 left-2 text-[0.65rem] text-white/85 bg-black/45 backdrop-blur-sm px-1.5 py-0.5 rounded pointer-events-none"
          >
            点击打开播放
          </span>
        </div>
      {/if}

      <!-- 悬停遮罩 + 放大镜/播放图标 -->
      <div class="absolute inset-0 flex items-center justify-center bg-transparent transition-colors duration-200 group-hover:bg-black/35 pointer-events-none">
        {#if type === "image"}
          <svg class="w-7 h-7 text-white opacity-0 scale-75 transition-all duration-200 group-hover:opacity-100 group-hover:scale-100" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
            <circle cx="11" cy="11" r="8"/>
            <line x1="21" y1="21" x2="16.65" y2="16.65"/>
            <line x1="11" y1="8" x2="11" y2="14"/>
            <line x1="8" y1="11" x2="14" y2="11"/>
          </svg>
        {:else}
          <svg class="w-8 h-8 text-white opacity-0 scale-75 transition-all duration-200 group-hover:opacity-100 group-hover:scale-100 drop-shadow" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
            <path d="M8 5v14l11-7z" />
          </svg>
        {/if}
      </div>
    {:else}
      <div class="flex items-center justify-center w-full aspect-[4/3]">
        <svg class="w-8 h-8 text-neutral-300 dark:text-neutral-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909M3.75 21h16.5A2.25 2.25 0 0022.5 18.75V5.25A2.25 2.25 0 0020.25 3H3.75A2.25 2.25 0 001.5 5.25v13.5A2.25 2.25 0 003.75 21z" />
        </svg>
      </div>
    {/if}
  </div>
</div>
