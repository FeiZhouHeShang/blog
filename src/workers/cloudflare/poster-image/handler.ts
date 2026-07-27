import { coverImageConfig } from "../../../config/coverImageConfig";

const ALLOWED_IMAGE_TYPES = new Set([
	"image/avif",
	"image/gif",
	"image/jpeg",
	"image/png",
	"image/webp",
]);

function isAllowedRandomCoverApi(url: URL): boolean {
	return coverImageConfig.randomCoverImage.apis.some((api) => {
		const configuredUrl = new URL(api);
		return (
			url.protocol === configuredUrl.protocol &&
			url.hostname === configuredUrl.hostname &&
			url.port === configuredUrl.port &&
			url.pathname === configuredUrl.pathname
		);
	});
}

function errorResponse(status: number, message: string): Response {
	return new Response(message, {
		status,
		headers: { "Content-Type": "text/plain; charset=utf-8" },
	});
}

export async function handlePosterImage(request: Request): Promise<Response> {
	if (request.method !== "GET") {
		return new Response(null, { status: 405, headers: { Allow: "GET" } });
	}

	const source = new URL(request.url).searchParams.get("url");
	if (!source) return errorResponse(400, "Missing image URL");

	let sourceUrl: URL;
	try {
		sourceUrl = new URL(source);
	} catch {
		return errorResponse(400, "Invalid image URL");
	}

	if (!isAllowedRandomCoverApi(sourceUrl)) {
		return errorResponse(403, "Image source is not allowed");
	}

	let upstream: Response;
	try {
		upstream = await fetch(sourceUrl, {
			headers: { Accept: "image/avif,image/webp,image/apng,image/*,*/*;q=0.8" },
		});
	} catch {
		return errorResponse(502, "Unable to fetch image");
	}

	if (!upstream.ok || !upstream.body) {
		return errorResponse(502, "Image service returned an error");
	}

	const contentType = upstream.headers.get("Content-Type")?.split(";", 1)[0];
	if (!contentType || !ALLOWED_IMAGE_TYPES.has(contentType.toLowerCase())) {
		return errorResponse(502, "Image service returned an unsupported response");
	}

	return new Response(upstream.body, {
		headers: {
			"Cache-Control":
				"public, max-age=86400, s-maxage=604800, stale-while-revalidate=86400",
			"Content-Type": contentType,
			"X-Content-Type-Options": "nosniff",
		},
	});
}
