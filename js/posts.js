import { collection, getDocs } from 'https://www.gstatic.com/firebasejs/10.12.5/firebase-firestore.js';
import { db } from './firebase-config.js';
import { escapeHtml, FALLBACK_IMAGE, formatDate, getDeadlineInfo, safeUrl, statusMarkup } from './utils.js';

export async function getPosts() {
	if (!db) throw new Error('Firebase is not configured yet. Add your Firebase web app settings to js/firebase-config.js.');
	const snapshot = await getDocs(collection(db, 'posts'));
	return snapshot.docs
		.map((document) => ({ id: document.id, ...document.data() }))
		.filter((post) => post.deleted !== true)
		.sort((first, second) => (second.createdAt?.seconds || 0) - (first.createdAt?.seconds || 0));
}

export function renderPostCard(post, showPinBadge = false) {
	const image = safeUrl(post.imageUrl) || FALLBACK_IMAGE;
	const imageClass = post.category?.toLocaleLowerCase() === 'universities' ? ' card-image-university' : '';
	const detailPage = '/pages/post';
	const applicationUrl = safeUrl(post.applicationLink);
	const deadline = getDeadlineInfo(post);
	const deadlineText = deadline.daysRemaining === null
		? 'No fixed deadline'
		: deadline.daysRemaining === 0 ? 'Due today' : `${deadline.daysRemaining} ${deadline.daysRemaining === 1 ? 'day' : 'days'} remaining`;
	return `<article class="opportunity-card">
		<a class="card-image${imageClass}" href="${detailPage}?id=${encodeURIComponent(post.id)}" aria-label="View ${escapeHtml(post.title)} details"><img src="${escapeHtml(image)}" alt="${escapeHtml(post.organization || 'Opportunity')}" loading="lazy" onerror="this.onerror=null;this.src='${FALLBACK_IMAGE}'"><span class="card-category">${escapeHtml(post.category || 'Opportunity')}</span>${showPinBadge ? '<span class="card-pin">Pinned</span>' : ''}</a>
		<div class="card-content"><div class="card-org">${escapeHtml(post.organization || post.country || 'Opportunity')}</div><h3><a href="${detailPage}?id=${encodeURIComponent(post.id)}">${escapeHtml(post.title || 'Untitled opportunity')}</a></h3><p class="card-description">${escapeHtml((post.description || 'Details will be shared by the official organization.').slice(0, 150))}${(post.description || '').length > 150 ? '…' : ''}</p>
		<div class="card-meta"><span>${escapeHtml(deadline.label)}</span><span class="remaining-time">${escapeHtml(deadlineText)}</span></div><div class="card-status">${statusMarkup(post)}</div>
		<div class="card-actions"><a class="button button-card" href="${detailPage}?id=${encodeURIComponent(post.id)}">View details <span aria-hidden="true">↗</span></a>${applicationUrl ? `<a class="apply-link" href="${escapeHtml(applicationUrl)}" target="_blank" rel="noopener noreferrer">Apply now</a>` : '<span class="apply-link apply-unavailable">Application link unavailable</span>'}</div></div>
	</article>`;
}

export function renderPosts(container, posts, emptyMessage = 'No active opportunities available at the moment. Check back soon.', options = {}) {
	if (!container) return;
	container.innerHTML = posts.length ? posts.map((post) => renderPostCard(post, options.showPinBadge === true)).join('') : `<p class="empty-state">${escapeHtml(emptyMessage)}</p>`;
}

export function getActivePosts(posts) {
	return posts.filter((post) => getDeadlineInfo(post).active);
}

export function getClosingSoonPosts(posts) {
	return getActivePosts(posts).filter((post) => {
		const days = getDeadlineInfo(post).daysRemaining;
		return days !== null && days <= 7;
	});
}

export { formatDate };
