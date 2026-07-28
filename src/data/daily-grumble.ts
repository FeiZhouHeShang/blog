/**
 * 日常吐槽（Daily Grumble）
 * --------------------------------------------------------------------------
 * 数据来源：本文件，由前端编辑器（src/pages/moments.astro）直接读写。
 * 内容完全由站长自己维护；不搬运任何第三方「说说」内容。
 *
 * 字段说明：
 *  - id       唯一标识（URL 锚点用，也用于编辑器定位）
 *  - content  正文，支持 Markdown
 *  - images   图片 URL 数组（上传到图床后回填）
 *  - date     发布时间，格式 "YYYY-MM-DD HH:mm"
 *  - location 地点（可选，如「中国」「杭州」）
 *  - tags     话题标签数组（可选，如 ["测试","吐槽"]）
 *  - pinned   是否置顶（可选）
 */

export interface DailyGrumble {
	id: string;
	content: string;
	images?: string[];
	date?: string;
	location?: string;
	tags?: string[];
	pinned?: boolean;
}

export const dailyGrumbles: DailyGrumble[] = [
  {
    "id": "grumble-627o",
    "content": "测试",
    "images": [
      "https://tc.d15.cc.cd/file/日常吐槽/_YM0Y__NEN9G_DQ_VQ_RTWM(1).png"
    ],
    "date": "2026-07-28 23:00",
    "tags": [
      "测试"
    ]
  }
];
