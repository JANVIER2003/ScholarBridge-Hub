const SEARCH_FIELDS = ['title', 'organization', 'description', 'programmes', 'country', 'category'];

export function filterPosts(posts, query, category = '') {
	const normalizedQuery = query.trim().toLocaleLowerCase();
	const normalizedCategory = category.trim().toLocaleLowerCase();
	return posts.filter((post) => {
		const matchesCategory = !normalizedCategory || post.category?.toLocaleLowerCase() === normalizedCategory;
		if (!matchesCategory) return false;
		if (!normalizedQuery) return true;
		return SEARCH_FIELDS.some((field) => {
			const value = post[field];
			return (Array.isArray(value) ? value.join(' ') : String(value || '')).toLocaleLowerCase().includes(normalizedQuery);
		});
	});
}
