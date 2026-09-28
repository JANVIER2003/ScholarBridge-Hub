import { getPosts, getActivePosts, getClosingSoonPosts, renderPosts } from './posts.js';
import { filterPosts } from './search.js';
import { escapeHtml, FALLBACK_IMAGE, formatDate, getDeadlineInfo, isPinnablePost, MAX_PINNED_POSTS, safeUrl, statusMarkup, CONTACT_EMAIL, CONTACT_PHONE, WHATSAPP_NUMBER } from './utils.js';

const menuToggle = document.querySelector('.menu-toggle');
const navigation = document.querySelector('.primary-navigation');
menuToggle?.addEventListener('click', () => {
	const expanded = menuToggle.getAttribute('aria-expanded') === 'true';
	menuToggle.setAttribute('aria-expanded', String(!expanded));
	navigation?.classList.toggle('is-open', !expanded);
});

let allPosts = [];

function showLoadError(container, error) {
	if (!container) return;
	container.innerHTML = `<p class="empty-state empty-error">${escapeHtml(error.message || 'We could not load opportunities right now. Please try again later.')}</p>`;
}

function renderDetails(post) {
	const root = document.querySelector('[data-post-detail]');
	if (!root) return;
	const image = safeUrl(post.imageUrl) || FALLBACK_IMAGE;
	const applicationUrl = safeUrl(post.applicationLink);
	const deadline = getDeadlineInfo(post);
	const deadlineText = deadline.daysRemaining === null ? deadline.label : deadline.daysRemaining === 0 ? 'Due today' : `${deadline.daysRemaining} days remaining`;
	const programmes = Array.isArray(post.programmes) ? post.programmes.join(', ') : post.programmes;
	const shareUrl = window.location.href;
	const shareMessage = `Opportunity: ${post.title || ''}\nOrganization: ${post.organization || ''}\nDeadline: ${deadline.label}\nScholarBridge Hub: ${shareUrl}`;
	root.innerHTML = `<div class="detail-back"><a class="text-link" href="/pages/opportunities">← All opportunities</a></div>
		<div class="detail-layout"><div class="detail-main"><img class="detail-image" src="${escapeHtml(image)}" alt="${escapeHtml(post.organization || 'Opportunity')}" onerror="this.onerror=null;this.src='../assets/images/placeholders/university-placeholder.jpg'">
		<div class="detail-heading"><span class="detail-category">${escapeHtml(post.category || 'Opportunity')}</span><h1>${escapeHtml(post.title || 'Opportunity details')}</h1><p>${escapeHtml(post.organization || 'Organization not specified')}</p></div>
		<section class="detail-section"><h2>About this opportunity</h2><p>${escapeHtml(post.description || 'No description has been provided yet.')}</p></section>
		${post.eligibility ? `<section class="detail-section"><h2>Eligibility</h2><p>${escapeHtml(post.eligibility)}</p></section>` : ''}
		${post.requirements ? `<section class="detail-section"><h2>Requirements</h2><p>${escapeHtml(post.requirements)}</p></section>` : ''}
		${programmes ? `<section class="detail-section"><h2>Eligible programmes</h2><p>${escapeHtml(programmes)}</p></section>` : ''}
		${post.minimumGrade ? `<section class="detail-section"><h2>Minimum grade</h2><p>${escapeHtml(post.minimumGrade)}</p></section>` : ''}
		${post.additionalInformation ? `<section class="detail-section"><h2>Additional information</h2><p>${escapeHtml(post.additionalInformation)}</p></section>` : ''}
		<section class="detail-section detail-posted"><h2>About the listing</h2><p>Posted ${escapeHtml(formatDate(post.createdAt))}. Verify all requirements with the official organization before applying.</p>${post.contact ? `<p>Organization contact: ${escapeHtml(post.contact)}</p>` : ''}</section></div>
		<aside class="detail-sidebar"><div class="deadline-panel"><span class="section-kicker">APPLICATION DEADLINE</span><strong>${escapeHtml(deadline.label)}</strong><span class="remaining-time">${escapeHtml(deadlineText)}</span>${statusMarkup(post)}${post.country ? `<p><b>Country</b>${escapeHtml(post.country)}</p>` : ''}${post.location ? `<p><b>Location</b>${escapeHtml(post.location)}</p>` : ''}${applicationUrl && deadline.active ? `<a class="button button-primary button-wide" href="${escapeHtml(applicationUrl)}" target="_blank" rel="noopener noreferrer">Apply now <span aria-hidden="true">↗</span></a>` : '<p class="apply-unavailable">An official application link has not been provided.</p>'}</div>
		<div class="share-panel"><h2>Pass it along</h2><a class="share-button" href="https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(shareMessage)}" target="_blank" rel="noopener noreferrer">Share on WhatsApp <span aria-hidden="true">↗</span></a><button class="copy-button" type="button" data-copy-link>Copy link</button><p class="copy-feedback" aria-live="polite"></p></div></aside></div>`;
	root.querySelector('[data-copy-link]')?.addEventListener('click', async (event) => {
		const feedback = root.querySelector('.copy-feedback');
		try {
			await navigator.clipboard.writeText(shareUrl);
			feedback.textContent = 'Link copied.';
		} catch {
			feedback.textContent = 'Copy is unavailable in this browser. Copy the page URL from the address bar.';
		}
	});
}

function setupListing(posts) {
	const list = document.querySelector('[data-post-list]');
	if (!list) return;
	const title = document.querySelector('[data-list-title]');
	const requestedCategory = new URLSearchParams(location.search).get('category') || list.dataset.category || '';
	const search = document.querySelector('[data-list-search]');
	if (search) search.value = new URLSearchParams(location.search).get('q') || '';
	const applyFilters = () => {
		const matching = filterPosts(getActivePosts(posts), search?.value || '', requestedCategory);
		renderPosts(list, matching, search?.value ? 'No opportunities found. Try another search.' : 'No active opportunities available at the moment. Check back soon.');
	};
	if (title && requestedCategory) title.textContent = requestedCategory;
	search?.addEventListener('input', applyFilters);
	document.querySelector('[data-list-search-form]')?.addEventListener('submit', (event) => event.preventDefault());
	applyFilters();
}

function setupHome(posts) {
	const featuredSection = document.querySelector('#featured-opportunities');
	const featuredList = document.querySelector('#featured-list');
	const latestList = document.querySelector('#latest-list');
	const closingList = document.querySelector('#closing-list');
	if (!featuredList && !latestList && !closingList) return;
	const featured = posts.filter((post) => post.pinned === true && isPinnablePost(post)).slice(0, MAX_PINNED_POSTS);
	if (featuredSection) featuredSection.hidden = featured.length === 0;
	renderPosts(featuredList, featured, '', { showPinBadge: true });
	const unpinned = posts.filter((post) => post.pinned !== true);
	const active = getActivePosts(unpinned);
	renderPosts(latestList, active.slice(0, 6));
	renderPosts(closingList, getClosingSoonPosts(unpinned).slice(0, 3), 'Nothing is closing in the next seven days. Explore all active opportunities.');
	const form = document.querySelector('#opportunity-search');
	const input = document.querySelector('#search-query');
	form?.addEventListener('submit', (event) => {
		event.preventDefault();
		const url = new URL('/pages/opportunities', window.location.href);
		if (input?.value.trim()) url.searchParams.set('q', input.value.trim());
		window.location.href = url.href;
	});
}

try {
	allPosts = await getPosts();
	setupHome(allPosts);
	setupListing(allPosts);
	const detailsRoot = document.querySelector('[data-post-detail]');
	if (detailsRoot) {
		const postId = new URLSearchParams(location.search).get('id');
		const post = allPosts.find((item) => item.id === postId);
		if (!post || post.deleted) detailsRoot.innerHTML = '<p class="empty-state">This opportunity could not be found.</p>';
		else renderDetails(post);
	}
} catch (error) {
	const featuredSection = document.querySelector('#featured-opportunities');
	if (featuredSection) featuredSection.hidden = false;
	document.querySelectorAll('#featured-list, #latest-list, #closing-list, [data-post-list], [data-post-detail]').forEach((container) => showLoadError(container, error));
}
