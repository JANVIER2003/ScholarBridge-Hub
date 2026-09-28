// Interactive ScholarBridge Hub logo. Upgrades every element with a data-sbh-logo attribute.
//   data-sbh-logo="full"     mark + name + tagline + phone
//   data-sbh-logo="compact"  mark + name + phone (data-label replaces the tagline, e.g. "Admin portal")
//   data-sbh-logo="mark"     mark only
// Optional: data-href (home link, default "/"), data-tone="dark" for dark backgrounds.
// The mark and the phone line open a contact popup with call and WhatsApp links.
(() => {
	const PHONE_DISPLAY = '+250 784 315 928';
	const PHONE_TEL = '+250784315928';
	const WHATSAPP_URL = 'https://wa.me/250784315928';
	const TAGLINE = 'Bridging ambition to global opportunity.';
	const VARIANTS = ['full', 'compact', 'mark'];
	let instanceCount = 0;

	const escapeHtml = (value) => String(value).replace(/[&<>"']/g, (character) => `&#${character.charCodeAt(0)};`);

	function markSvg(id) {
		return `<svg class="sbh-mark" viewBox="0 0 64 64" aria-hidden="true" focusable="false">
			<defs><filter id="${id}-glow" filterUnits="userSpaceOnUse" x="0" y="30" width="64" height="22"><feGaussianBlur stdDeviation="1.3" result="blur"/><feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge></filter></defs>
			<path class="sbh-mark__tile" d="M32 2a30 30 0 0 1 30 30 30 30 0 0 1-30 30H10a8 8 0 0 1-8-8V32A30 30 0 0 1 32 2z"/>
			<path class="sbh-mark__deck" d="M6 41h52" pathLength="100"/>
			<path class="sbh-mark__spark" d="M6 41h52" pathLength="100" filter="url(#${id}-glow)"/>
			<path class="sbh-mark__arch" d="M9 41C15 16 49 16 55 41" pathLength="100"/>
			<g class="sbh-mark__cap">
				<path class="sbh-mark__cap-body" d="M26.5 18.6v3.6c3.3 2.2 7.7 2.2 11 0v-3.6L32 21.3z"/>
				<path class="sbh-mark__cap-board" d="M32 11l10 5-10 5-10-5z"/>
				<path class="sbh-mark__tassel" d="M42 16v5.4"/>
				<circle class="sbh-mark__tassel-end" cx="42" cy="22.4" r="1.4"/>
			</g>
			<text class="sbh-mark__letters" x="32" y="56" text-anchor="middle">SBH</text>
		</svg>`;
	}

	function render(root) {
		const variant = VARIANTS.includes(root.dataset.sbhLogo) ? root.dataset.sbhLogo : 'full';
		const id = `sbh-logo-${++instanceCount}`;
		const href = root.dataset.href || '/';
		const subline = root.dataset.label || (variant === 'full' ? TAGLINE : '');
		const popupId = `${id}-contact`;

		const wordmark = variant === 'mark' ? '' : `<span class="sbh-logo__text">
			<a class="sbh-logo__home" href="${escapeHtml(href)}" aria-label="ScholarBridge Hub home">
				<span class="sbh-logo__name">ScholarBridge <strong>Hub</strong></span>
				${subline ? `<span class="sbh-logo__sub">${escapeHtml(subline)}</span>` : ''}
			</a>
			<button class="sbh-logo__phone" type="button" data-sbh-toggle aria-expanded="false" aria-controls="${popupId}" aria-label="Contact ScholarBridge Hub on ${PHONE_DISPLAY}">${PHONE_DISPLAY}</button>
		</span>`;

		root.classList.add('sbh-logo', `sbh-logo--${variant}`, 'sbh-logo--intro');
		if (root.dataset.tone === 'dark') root.classList.add('sbh-logo--on-dark');
		root.innerHTML = `<button class="sbh-logo__mark" type="button" data-sbh-toggle aria-expanded="false" aria-controls="${popupId}" aria-label="ScholarBridge Hub logo. Show contact options">${markSvg(id)}</button>
			${wordmark}
			<div class="sbh-logo__popup" id="${popupId}" role="group" aria-label="Contact ScholarBridge Hub" hidden>
				<p class="sbh-logo__popup-title">Talk to ScholarBridge Hub</p>
				<a class="sbh-logo__action sbh-logo__action--call" href="tel:${PHONE_TEL}">Call ${PHONE_DISPLAY}</a>
				<a class="sbh-logo__action sbh-logo__action--whatsapp" href="${WHATSAPP_URL}" target="_blank" rel="noopener noreferrer">Chat on WhatsApp</a>
			</div>`;

		const popup = root.querySelector('.sbh-logo__popup');
		const toggles = [...root.querySelectorAll('[data-sbh-toggle]')];
		const setOpen = (open) => {
			popup.hidden = !open;
			root.classList.toggle('is-open', open);
			for (const toggle of toggles) toggle.setAttribute('aria-expanded', String(open));
		};

		for (const toggle of toggles) toggle.addEventListener('click', () => setOpen(popup.hidden));
		document.addEventListener('click', (event) => {
			if (!popup.hidden && !root.contains(event.target)) setOpen(false);
		});
		root.addEventListener('keydown', (event) => {
			if (event.key !== 'Escape' || popup.hidden) return;
			setOpen(false);
			toggles[0].focus();
		});
		root.addEventListener('focusout', (event) => {
			if (!popup.hidden && event.relatedTarget && !root.contains(event.relatedTarget)) setOpen(false);
		});
		// The spark crossing is the last intro animation; clearing the class lets hover animations take over.
		root.addEventListener('animationend', (event) => {
			if (event.animationName === 'sbh-travel') root.classList.remove('sbh-logo--intro');
		});
	}

	function init() {
		for (const root of document.querySelectorAll('[data-sbh-logo]:not(.sbh-logo)')) render(root);
	}

	window.ScholarBridgeLogo = { init };
	if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
	else init();
})();
