export const CONTACT_EMAIL = 'nybzjnvr@gmail.com';
export const CONTACT_PHONE = '+250 784 315 928';
export const WHATSAPP_NUMBER = '250784315928';
export const FALLBACK_IMAGE = `${location.pathname.includes('/pages/') ? '../' : ''}assets/images/placeholders/university-placeholder.jpg`;

export function escapeHtml(value = '') {
	return String(value).replace(/[&<>"']/g, (character) => ({
		'&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
	})[character]);
}

export function safeUrl(value = '') {
	try {
		const url = new URL(value);
		return ['http:', 'https:'].includes(url.protocol) ? url.href : '';
	} catch {
		return '';
	}
}

function zonedParts(date, timezone) {
	const parts = new Intl.DateTimeFormat('en-CA', {
		timeZone: timezone, year: 'numeric', month: '2-digit', day: '2-digit',
		hour: '2-digit', minute: '2-digit', second: '2-digit', hourCycle: 'h23'
	}).formatToParts(date);
	return Object.fromEntries(parts.filter((part) => part.type !== 'literal').map(({ type, value }) => [type, Number(value)]));
}

function zonedDateTimeToUtc(year, month, day, hour, minute, timezone) {
	const desired = Date.UTC(year, month - 1, day, hour, minute);
	let guess = desired;
	for (let attempt = 0; attempt < 3; attempt += 1) {
		const local = zonedParts(new Date(guess), timezone);
		const represented = Date.UTC(local.year, local.month - 1, local.day, local.hour, local.minute);
		guess += desired - represented;
	}
	return new Date(guess);
}

export function getDeadlineInfo(post, now = new Date()) {
	if (!post.deadlineDate || post.noFixedDeadline) {
		return { active: true, expired: false, daysRemaining: null, deadlineAt: null, label: 'No fixed deadline' };
	}
	const [year, month, day] = post.deadlineDate.split('-').map(Number);
	const timezone = post.timezone || 'Africa/Kigali';
	try {
		new Intl.DateTimeFormat('en', { timeZone: timezone });
		const exactTime = Boolean(post.deadlineTime);
		const [hour, minute] = exactTime ? post.deadlineTime.split(':').map(Number) : [0, 0];
		const deadlineAt = exactTime
			? zonedDateTimeToUtc(year, month, day, hour, minute, timezone)
			: zonedDateTimeToUtc(year, month, day + 1, 0, 0, timezone);
		const displayAt = exactTime ? deadlineAt : zonedDateTimeToUtc(year, month, day, 12, 0, timezone);
		const today = zonedParts(now, timezone);
		const targetUtcDay = Date.UTC(year, month - 1, day);
		const todayUtcDay = Date.UTC(today.year, today.month - 1, today.day);
		const daysRemaining = Math.round((targetUtcDay - todayUtcDay) / 86400000);
		return {
			active: deadlineAt.getTime() > now.getTime(),
			expired: deadlineAt.getTime() <= now.getTime(),
			daysRemaining: Math.max(0, daysRemaining),
			deadlineAt,
			label: new Intl.DateTimeFormat('en', { timeZone: timezone, day: 'numeric', month: 'long', year: 'numeric' }).format(displayAt)
		};
	} catch {
		return { active: false, expired: true, daysRemaining: null, deadlineAt: null, label: 'Invalid deadline' };
	}
}

export function formatDate(value, timezone = 'Africa/Kigali') {
	const date = value?.toDate ? value.toDate() : value ? new Date(value) : null;
	if (!date || Number.isNaN(date.getTime())) return 'Not provided';
	return new Intl.DateTimeFormat('en', { timeZone: timezone, day: 'numeric', month: 'short', year: 'numeric' }).format(date);
}

export function statusMarkup(post) {
	const info = getDeadlineInfo(post);
	if (info.expired) return '<span class="status status-expired">Expired</span>';
	if (info.daysRemaining !== null && info.daysRemaining <= 7) return '<span class="status status-soon">Closing soon</span>';
	return '<span class="status status-open">Application open</span>';
}
