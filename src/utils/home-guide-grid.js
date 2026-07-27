export function getGuidePostSets(posts = [], limit = 3) {
	const pinned = posts.filter((post) => post?.data?.pinned).slice(0, limit);
	const nonPinned = posts.filter((post) => !post?.data?.pinned).slice(0, limit);

	return {
		pinned,
		recent: nonPinned.length > 0 ? nonPinned : posts.slice(0, limit),
	};
}

export function pickRandomGuidePost(posts = [], random = Math.random) {
	if (posts.length === 0) return undefined;
	const index = Math.min(posts.length - 1, Math.floor(random() * posts.length));
	return posts[index];
}
