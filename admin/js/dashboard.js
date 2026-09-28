import { collection, deleteDoc, doc, getDocs } from 'https://www.gstatic.com/firebasejs/10.12.5/firebase-firestore.js';
import { db } from '../../js/firebase-config.js';
import { escapeHtml, formatDate, getDeadlineInfo, safeUrl, statusMarkup } from '../../js/utils.js';
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
	tableBody.innerHTML = matching.map((post) => `<tr><td data-label="Opportunity"><div class="table-opportunity"><img src="${escapeHtml(safeUrl(post.imageUrl) || '../assets/images/placeholders/university-placeholder.jpg')}" alt="" onerror="this.onerror=null;this.src='../assets/images/placeholders/university-placeholder.jpg'"><strong>${escapeHtml(post.title || 'Untitled')}</strong></div></td><td data-label="Category">${escapeHtml(post.category || '—')}</td><td data-label="Organization">${escapeHtml(post.organization || '—')}</td><td data-label="Deadline">${escapeHtml(getDeadlineInfo(post).label)}</td><td data-label="Status">${postStatus(post)}</td><td data-label="Created">${escapeHtml(formatDate(post.createdAt))}</td><td data-label="Actions"><div class="table-actions"><a class="table-edit" href="edit-post.html?id=${encodeURIComponent(post.id)}">Edit</a><button class="table-delete" type="button" data-delete-id="${escapeHtml(post.id)}">Delete</button></div></td></tr>`).join('');
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

tableBody?.addEventListener('click', (event) => {
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
