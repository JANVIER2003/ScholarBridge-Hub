import { collection, deleteDoc, doc, getDocs, updateDoc } from 'https://www.gstatic.com/firebasejs/10.12.5/firebase-firestore.js';
import { db } from '../../js/firebase-config.js';
import { escapeHtml, formatDate, getDeadlineInfo, isPinnablePost, MAX_PINNED_POSTS, safeUrl, statusMarkup } from '../../js/utils.js';
import { requireAdmin, setupSignOut } from './auth.js';

const tableBody = document.querySelector('#posts-table-body');
const message = document.querySelector('#dashboard-message');
const statistics = document.querySelector('#post-statistics');
let posts = [];

function postStatus(post) {
	return getDeadlineInfo(post).active ? statusMarkup(post) : '<span class="status status-expired">Expired</span>';
}

function renderStatistics() {
	const active = posts.filter((post) => getDeadlineInfo(post).active);
	const expired = posts.filter((post) => !getDeadlineInfo(post).active);
	const countCategory = (category) => posts.filter((post) => post.category?.toLowerCase() === category).length;
	const values = [posts.length, active.length, expired.length, countCategory('scholarships'), countCategory('universities'), posts.length - countCategory('scholarships') - countCategory('universities')];
	const labels = ['Total posts', 'Active posts', 'Expired posts', 'Scholarships', 'Universities', 'Other opportunities'];
	statistics.innerHTML = labels.map((label, index) => `<div class="stat-card"><span>${label}</span><strong>${values[index]}</strong></div>`).join('');
}

function renderTable(query = '') {
	const normalized = query.toLowerCase().trim();
	const matching = posts.filter((post) => [post.title, post.category, post.organization].some((value) => String(value || '').toLowerCase().includes(normalized)));
	if (!matching.length) {
		tableBody.innerHTML = `<tr><td colspan="7" class="table-empty">${posts.length ? 'No posts match this filter.' : 'No opportunities have been added yet.'}</td></tr>`;
		return;
	}
	tableBody.innerHTML = matching.map((post) => {
		const canTogglePin = isPinnablePost(post) || post.pinned === true;
		const pinLabel = post.pinned === true ? 'Unpin' : 'Pin';
		return `<tr><td data-label="Opportunity"><div class="table-opportunity"><img src="${escapeHtml(safeUrl(post.imageUrl) || '../assets/images/placeholders/university-placeholder.jpg')}" alt="" onerror="this.onerror=null;this.src='../assets/images/placeholders/university-placeholder.jpg'"><div><strong>${escapeHtml(post.title || 'Untitled')}</strong>${post.pinned === true ? '<span class="admin-pin-badge">Pinned</span>' : ''}</div></div></td><td data-label="Category">${escapeHtml(post.category || '—')}</td><td data-label="Organization">${escapeHtml(post.organization || '—')}</td><td data-label="Deadline">${escapeHtml(getDeadlineInfo(post).label)}</td><td data-label="Status">${postStatus(post)}</td><td data-label="Created">${escapeHtml(formatDate(post.createdAt))}</td><td data-label="Actions"><div class="table-actions"><a class="table-edit" href="/admin/edit-post?id=${encodeURIComponent(post.id)}">Edit</a><button class="table-pin" type="button" data-pin-id="${escapeHtml(post.id)}" ${canTogglePin ? '' : 'disabled'}>${pinLabel}</button><button class="table-delete" type="button" data-delete-id="${escapeHtml(post.id)}">Delete</button></div></td></tr>`;
	}).join('');
}

async function deletePost(postId) {
	const post = posts.find((item) => item.id === postId);
	if (!post || !window.confirm('Are you sure you want to delete this opportunity?')) return;
	try {
		// The post's Cloudinary image (public_id in post.imagePath) is left in place: deleting it
		// requires the Cloudinary API secret, which must never ship in frontend code.
		await deleteDoc(doc(db, 'posts', postId));
		posts = posts.filter((item) => item.id !== postId);
		renderStatistics();
		renderTable(document.querySelector('#table-filter').value);
		message.textContent = 'Opportunity deleted.';
	} catch (error) {
		message.textContent = error.message || 'Could not delete this opportunity. Check your connection and permissions.';
	}
}

async function togglePin(postId, button) {
	button.disabled = true;
	try {
		const snapshot = await getDocs(collection(db, 'posts'));
		posts = snapshot.docs.map((item) => ({ id: item.id, ...item.data() })).filter((post) => post.deleted !== true);
		posts.sort((first, second) => (second.createdAt?.seconds || 0) - (first.createdAt?.seconds || 0));
		const post = posts.find((item) => item.id === postId);
		if (!post) throw new Error('This opportunity no longer exists.');
		const shouldPin = post.pinned !== true;
		if (shouldPin && !isPinnablePost(post)) throw new Error('Only posts in the Other Opportunities category can be pinned.');
		if (shouldPin) {
			const pinnedCount = posts.filter((item) => item.id !== postId && item.pinned === true).length;
			if (pinnedCount >= MAX_PINNED_POSTS) {
				message.textContent = 'You can pin a maximum of 3 opportunities. Unpin one first.';
				message.dataset.state = 'error';
				button.disabled = false;
				return;
			}
		}
		await updateDoc(doc(db, 'posts', postId), { pinned: shouldPin });
		post.pinned = shouldPin;
		renderTable(document.querySelector('#table-filter').value);
		message.textContent = shouldPin ? 'Opportunity pinned to the home page.' : 'Opportunity unpinned.';
		message.dataset.state = 'success';
	} catch (error) {
		message.textContent = error.message || 'Could not update the pin. Check your connection and permissions.';
		message.dataset.state = 'error';
		button.disabled = false;
	}
}

tableBody?.addEventListener('click', (event) => {
	const pinButton = event.target.closest('[data-pin-id]');
	if (pinButton) togglePin(pinButton.dataset.pinId, pinButton);
	const button = event.target.closest('[data-delete-id]');
	if (button) deletePost(button.dataset.deleteId);
});
document.querySelector('#table-filter')?.addEventListener('input', (event) => renderTable(event.target.value));

try {
	await requireAdmin();
	setupSignOut();
	const snapshot = await getDocs(collection(db, 'posts'));
	posts = snapshot.docs.map((item) => ({ id: item.id, ...item.data() })).filter((post) => post.deleted !== true);
	posts.sort((first, second) => (second.createdAt?.seconds || 0) - (first.createdAt?.seconds || 0));
	renderStatistics();
	renderTable();
	message.textContent = `${posts.length} ${posts.length === 1 ? 'opportunity' : 'opportunities'} loaded.`;
} catch (error) {
	message.textContent = error.message || 'Could not load the dashboard. Check your Firebase connection and security rules.';
}
