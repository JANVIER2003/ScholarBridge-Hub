import { addDoc, collection, doc, getDoc, serverTimestamp, updateDoc } from 'https://www.gstatic.com/firebasejs/10.12.5/firebase-firestore.js';
import { db } from '../../js/firebase-config.js';
import { requireAdmin, setupSignOut } from './auth.js';

const MAX_IMAGE_BYTES = 5 * 1024 * 1024;
const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
const CLOUDINARY_CLOUD_NAME = 'dnvwfd3h';
const CLOUDINARY_UPLOAD_PRESET = 'scholarbridge_uploads';
const CLOUDINARY_API = `https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}`;

function setMessage(form, text, state = '') {
  const message = form.querySelector('.form-message');
  message.textContent = text;
  message.dataset.state = state;
}

function toggleDeadlineFields(form) {
  const noDeadline = form.elements.noFixedDeadline.checked;
  form.elements.deadlineDate.disabled = noDeadline;
  form.elements.deadlineTime.disabled = noDeadline;
  form.elements.deadlineDate.required = !noDeadline;
  if (noDeadline) {
    form.elements.deadlineDate.value = '';
    form.elements.deadlineTime.value = '';
  }
}

function validateImage(file) {
  if (!file) return '';
  if (!ALLOWED_IMAGE_TYPES.includes(file.type)) return 'Choose a JPG, PNG or WebP image.';
  if (file.size > MAX_IMAGE_BYTES) return 'Image must be 5 MB or smaller.';
  return '';
}

function parseProgrammes(value) {
  return value.split(',').map((programme) => programme.trim()).filter(Boolean);
}

function getFormData(form) {
  const values = new FormData(form);
  const applicationLink = String(values.get('applicationLink') || '').trim();
  if (applicationLink) {
    const url = new URL(applicationLink);
    if (!['https:', 'http:'].includes(url.protocol)) throw new Error('Application link must start with http:// or https://.');
  }
  const timezone = String(values.get('timezone') || '').trim();
  try { new Intl.DateTimeFormat('en', { timeZone: timezone }); } catch { throw new Error('Enter a valid timezone such as Africa/Kigali.'); }
  const noFixedDeadline = form.elements.noFixedDeadline.checked;
  if (!noFixedDeadline && !values.get('deadlineDate')) throw new Error('Choose a deadline date or select No fixed deadline.');
  return {
    title: String(values.get('title') || '').trim(),
    organization: String(values.get('organization') || '').trim(),
    category: String(values.get('category') || '').trim(),
    country: String(values.get('country') || '').trim(),
    location: String(values.get('location') || '').trim(),
    description: String(values.get('description') || '').trim(),
    eligibility: String(values.get('eligibility') || '').trim(),
    requirements: String(values.get('requirements') || '').trim(),
    programmes: parseProgrammes(String(values.get('programmes') || '')),
    minimumGrade: String(values.get('minimumGrade') || '').trim(),
    additionalInformation: String(values.get('additionalInformation') || '').trim(),
    deadlineDate: noFixedDeadline ? '' : String(values.get('deadlineDate') || ''),
    deadlineTime: noFixedDeadline ? '' : String(values.get('deadlineTime') || ''),
    timezone,
    noFixedDeadline,
    applicationLink,
    contact: String(values.get('contact') || '').trim(),
    deleted: false
  };
}

// Unsigned upload, so no API secret is needed in the browser. imagePath stores the Cloudinary public_id.
async function uploadImage(file) {
  if (!file) return null;
  const body = new FormData();
  body.append('file', file);
  body.append('upload_preset', CLOUDINARY_UPLOAD_PRESET);
  let response;
  try {
    response = await fetch(`${CLOUDINARY_API}/image/upload`, { method: 'POST', body });
  } catch {
    throw new Error('Image upload failed. Check your internet connection and try again.');
  }
  const result = await response.json().catch(() => ({}));
  if (!response.ok || !result.secure_url) {
    throw new Error(`Image upload failed: ${result.error?.message || `Cloudinary returned status ${response.status}.`}`);
  }
  return { imagePath: result.public_id || '', imageUrl: result.secure_url };
}

function fillForm(form, post) {
  for (const field of ['title', 'organization', 'category', 'country', 'location', 'description', 'eligibility', 'requirements', 'minimumGrade', 'additionalInformation', 'deadlineDate', 'deadlineTime', 'timezone', 'applicationLink', 'contact']) {
    form.elements[field].value = post[field] || (field === 'timezone' ? 'Africa/Kigali' : '');
  }
  form.elements.programmes.value = Array.isArray(post.programmes) ? post.programmes.join(', ') : post.programmes || '';
  form.elements.noFixedDeadline.checked = post.noFixedDeadline === true;
  toggleDeadlineFields(form);
  const preview = form.querySelector('#image-preview');
  if (post.imageUrl) {
    preview.src = post.imageUrl;
    preview.hidden = false;
  }
}

export async function initializePostForm(mode) {
  const form = document.querySelector('#post-form');
  if (!form) return;
  const isEdit = mode === 'edit';
  let existingPost = null;
  try {
    await requireAdmin();
    setupSignOut();
    if (isEdit) {
      const postId = new URLSearchParams(location.search).get('id');
      if (!postId) throw new Error('No opportunity was selected for editing.');
      const postSnapshot = await getDoc(doc(db, 'posts', postId));
      if (!postSnapshot.exists() || postSnapshot.data().deleted === true) throw new Error('This opportunity no longer exists.');
      existingPost = { id: postId, ...postSnapshot.data() };
      fillForm(form, existingPost);
    }
  } catch (error) {
    setMessage(form, error.message || 'Could not load the form.');
    for (const control of form.querySelectorAll('input, textarea, button')) control.disabled = true;
    return;
  }

  const imageInput = form.querySelector('#post-image');
  const imagePreview = form.querySelector('#image-preview');
  imageInput.addEventListener('change', () => {
    const file = imageInput.files[0];
    const error = validateImage(file);
    if (error) {
      imageInput.value = '';
      setMessage(form, error, 'error');
      return;
    }
    if (file) {
      imagePreview.src = URL.createObjectURL(file);
      imagePreview.hidden = false;
      setMessage(form, 'Image ready to upload.', 'success');
    } else if (!existingPost?.imageUrl) imagePreview.hidden = true;
  });
  form.elements.noFixedDeadline.addEventListener('change', () => toggleDeadlineFields(form));

  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    if (!form.reportValidity()) return;
    const submitButton = form.querySelector('[type="submit"]');
    const selectedImage = imageInput.files[0];
    const imageError = validateImage(selectedImage);
    if (imageError) {
      setMessage(form, imageError, 'error');
      return;
    }
    const submitLabel = submitButton.textContent;
    submitButton.disabled = true;
    let newlyUploadedImage = null;
    try {
      const fields = getFormData(form);
      if (selectedImage) {
        submitButton.textContent = 'Uploading...';
        setMessage(form, 'Uploading image...');
        newlyUploadedImage = await uploadImage(selectedImage);
      }
      submitButton.textContent = 'Saving...';
      setMessage(form, 'Saving opportunity...');
      if (newlyUploadedImage) {
        fields.imageUrl = newlyUploadedImage.imageUrl;
        fields.imagePath = newlyUploadedImage.imagePath;
      } else if (existingPost) {
        fields.imageUrl = existingPost.imageUrl || '';
        fields.imagePath = existingPost.imagePath || '';
      } else {
        fields.imageUrl = '';
        fields.imagePath = '';
      }
      if (isEdit) {
        // A replaced image is left in Cloudinary: deleting it from the browser would need the API secret.
        await updateDoc(doc(db, 'posts', existingPost.id), { ...fields, updatedAt: serverTimestamp() });
        setMessage(form, 'Opportunity updated. The public listing now reflects your changes.', 'success');
      } else {
        await addDoc(collection(db, 'posts'), { ...fields, createdAt: serverTimestamp(), updatedAt: serverTimestamp() });
        setMessage(form, 'Opportunity published successfully.', 'success');
      }
      window.setTimeout(() => location.assign('dashboard.html'), 900);
    } catch (error) {
      // If the image uploaded but the post save failed, that image is now orphaned in Cloudinary.
      // Unsigned uploads can't return a delete token, so remove it manually in the Cloudinary
      // Media Library, or add a signed backend call for cleanup in the future.
      setMessage(form, error.message || 'Could not save this opportunity. Check your connection and permissions.', 'error');
      submitButton.textContent = submitLabel;
      submitButton.disabled = false;
    }
  });
}