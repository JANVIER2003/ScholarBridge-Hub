import { onAuthStateChanged, signInWithEmailAndPassword, signOut } from 'https://www.gstatic.com/firebasejs/10.12.5/firebase-auth.js';
import { doc, getDoc } from 'https://www.gstatic.com/firebasejs/10.12.5/firebase-firestore.js';
import { auth, db, isFirebaseConfigured } from '../../js/firebase-config.js';

export async function isAuthorizedAdmin(user) {
	if (!user || !db) return false;
	const adminRecord = await getDoc(doc(db, 'admins', user.uid));
	return adminRecord.exists() && adminRecord.data().active !== false;
}

export function requireAdmin() {
	if (!isFirebaseConfigured || !auth || !db) {
		location.replace('/admin?setup=required');
		return Promise.reject(new Error('Firebase is not configured.'));
	}
	return new Promise((resolve, reject) => {
		const unsubscribe = onAuthStateChanged(auth, async (user) => {
			unsubscribe();
			if (!user) {
				location.replace('/admin');
				reject(new Error('Please sign in to continue.'));
				return;
			}
			try {
				if (!(await isAuthorizedAdmin(user))) {
					await signOut(auth);
					location.replace('/admin?access=denied');
					reject(new Error('This account is not authorized to manage content.'));
					return;
				}
				resolve(user);
			} catch (error) {
				reject(error);
			}
		});
	});
}

export function setupSignOut() {
	document.querySelector('[data-sign-out]')?.addEventListener('click', async () => {
		await signOut(auth);
		location.replace('/admin');
	});
}

const loginForm = document.querySelector('#login-form');
if (loginForm) {
	const message = loginForm.querySelector('.form-message');
	const params = new URLSearchParams(location.search);
	if (params.has('setup')) message.textContent = 'Add your Firebase web app settings to js/firebase-config.js, then enable Email/Password sign-in.';
	else if (params.has('access')) message.textContent = 'That account is not authorized for the admin portal.';
	if (!isFirebaseConfigured || !auth || !db) {
		loginForm.querySelector('button').disabled = true;
	}
	loginForm.addEventListener('submit', async (event) => {
		event.preventDefault();
		message.textContent = 'Signing in...';
		const button = loginForm.querySelector('button');
		button.disabled = true;
		try {
			const credentials = await signInWithEmailAndPassword(auth, loginForm.elements.email.value.trim(), loginForm.elements.password.value);
			if (!(await isAuthorizedAdmin(credentials.user))) {
				await signOut(auth);
				throw new Error('This account is not on the administrator allowlist.');
			}
			location.replace('/admin/dashboard');
		} catch (error) {
			message.textContent = error.message.includes('allowlist')
				? error.message
				: error.code === 'auth/invalid-credential' || error.code === 'auth/wrong-password'
					? 'Email or password is incorrect.'
					: error.code === 'auth/too-many-requests'
						? 'Too many attempts. Wait a moment and try again.'
						: error.message || 'Sign-in failed. Check Firebase configuration and try again.';
			button.disabled = !isFirebaseConfigured;
		}
	});
	if (auth) onAuthStateChanged(auth, async (user) => {
		if (!user) return;
		try {
			if (await isAuthorizedAdmin(user)) location.replace('/admin/dashboard');
		} catch {
			message.textContent = 'Could not check administrator access. Try again.';
		}
	});
}
