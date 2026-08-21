// ============================================
// Share an Interview Experience — Client Logic
// ============================================
// Loaded only on /experiences/new (see partials/footer.ejs).
// Depends on showToast() and getCookie() from main.js, which loads first.
//
// Posts to POST /api/experiences, which is gated by `authenticate` and sets
// authorId from the verified token — the browser never sends an author id,
// so a student cannot file a writeup under someone else's name.

(function () {
  'use strict';

  // Bail before touching the DOM on every other page.
  if (!document.querySelector('[data-page="new-experience"]')) return;

  // A writeup shorter than this is not worth reading. Enforced here as a
  // quality nudge only — the server requires non-empty content, so this is
  // UX, never a security boundary.
  const MIN_CONTENT_LENGTH = 50;

  const form = document.getElementById('experience-form');
  // The view renders an explanatory empty state instead of the form when no
  // companies exist, so there may be nothing to wire up.
  if (!form) return;

  const submitBtn = document.getElementById('experience-submit');
  const errorBox = document.getElementById('experience-form-error');
  const errorText = document.getElementById('experience-form-error-text');
  const contentField = document.getElementById('exp-content');
  const contentCount = document.getElementById('exp-content-count');
  const cancelLink = document.getElementById('experience-cancel');

  // Cleared once the post succeeds, or once the author confirms they want to
  // discard, so neither the redirect nor an intentional exit trips the guard.
  let isDirty = false;
  let bypassGuard = false;

  // ── Error Banner ─────────────────────────────

  /**
   * Shows the error banner above the form and scrolls it into view.
   *
   * Uses textContent, not innerHTML: the message may be a server string,
   * and this keeps a reflected value from ever being parsed as markup.
   *
   * @param {string} message
   */
  function showError(message) {
    errorText.textContent = message;
    errorBox.classList.remove('is-hidden');
    errorBox.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }

  function clearError() {
    errorBox.classList.add('is-hidden');
    errorText.textContent = '';
  }

  /**
   * Turns a failed response into one readable line, folding in the per-field
   * errors that validate() returns as `errors[]`.
   *
   * @param {{status: number, data: object}} result
   * @returns {string}
   */
  function errorMessage(result) {
    const data = result.data || {};

    if (Array.isArray(data.errors) && data.errors.length) {
      return data.errors.join(' ');
    }
    if (result.status === 401) {
      return 'Your session has expired. Please sign in again, then re-post — ' +
        'your text is still here until you leave this page.';
    }
    if (result.status === 403) {
      return 'Your account is not permitted to post experiences.';
    }
    if (result.status === 429) {
      return 'Too many requests. Please wait a moment and try again.';
    }
    return data.message || 'Something went wrong. Please try again.';
  }

  // ── Submit Button State ──────────────────────

  /**
   * Puts the submit button into its loading state and returns a restore fn.
   *
   * @param {string} loadingLabel
   * @returns {Function} Call to restore the original markup
   */
  function setLoading(loadingLabel) {
    const original = submitBtn.innerHTML;
    submitBtn.disabled = true;
    submitBtn.setAttribute('aria-busy', 'true');
    submitBtn.innerHTML = '<div class="spinner"></div> ' + loadingLabel;

    return function restore() {
      submitBtn.disabled = false;
      submitBtn.removeAttribute('aria-busy');
      submitBtn.innerHTML = original;
    };
  }

  // ── Client-Side Validation ───────────────────

  /**
   * Checks the fields the API requires, so an obvious mistake costs no
   * round trip. The server re-validates everything regardless.
   *
   * @param {object} values - Trimmed field values
   * @returns {{field: HTMLElement, message: string}|null} First problem found
   */
  function firstProblem(values) {
    if (!values.title) {
      return { field: form.title, message: 'A headline is required.' };
    }
    if (!values.companyId) {
      return { field: form.companyId, message: 'Please choose the company you interviewed with.' };
    }
    if (!values.content) {
      return { field: contentField, message: 'Please describe your interview experience.' };
    }
    if (values.content.length < MIN_CONTENT_LENGTH) {
      return {
        field: contentField,
        message: 'Please add a bit more detail — at least ' + MIN_CONTENT_LENGTH +
          ' characters (currently ' + values.content.length + ').',
      };
    }

    const year = values.yearOfInterview;
    if (year && (!/^\d{4}$/.test(year) || Number(year) < 2000 || Number(year) > 2100)) {
      return { field: form.yearOfInterview, message: 'Year of interview must be a 4-digit year.' };
    }

    return null;
  }

  // ── Live Character Count ─────────────────────

  contentField.addEventListener('input', function () {
    const length = contentField.value.trim().length;
    contentCount.textContent = length + ' character' + (length === 1 ? '' : 's');
    isDirty = true;
  });

  // Any edit marks the draft dirty, so Cancel and tab-close can warn.
  form.addEventListener('input', function () {
    isDirty = true;
  });

  // ── Unsaved-Work Guards ──────────────────────

  cancelLink.addEventListener('click', function (e) {
    if (!isDirty) return;

    const confirmed = window.confirm(
      'Discard this experience? Anything you have typed will be lost.'
    );

    if (!confirmed) {
      e.preventDefault();
      return;
    }

    // Already answered the question — don't ask again via beforeunload.
    bypassGuard = true;
  });

  window.addEventListener('beforeunload', function (e) {
    if (!isDirty || bypassGuard) return;
    e.preventDefault();
    // Browsers ignore custom text here, but a returnValue is still required
    // for the native prompt to appear.
    e.returnValue = '';
  });

  // ── Submit ───────────────────────────────────

  form.addEventListener('submit', async function (e) {
    e.preventDefault();
    clearError();

    const values = {
      title: form.title.value.trim(),
      companyId: form.companyId.value,
      role: form.role.value.trim(),
      outcome: form.outcome.value,
      yearOfInterview: form.yearOfInterview.value.trim(),
      content: contentField.value.trim(),
    };

    const problem = firstProblem(values);
    if (problem) {
      showError(problem.message);
      problem.field.focus();
      return;
    }

    const payload = {
      title: values.title,
      content: values.content,
      companyId: values.companyId,
      outcome: values.outcome,
      role: values.role || null,
      yearOfInterview: values.yearOfInterview || null,
      // The API creates one ExperienceTag row per entry, so drop blanks that a
      // trailing comma would otherwise turn into empty tags.
      tags: form.tags.value
        .split(',')
        .map(function (tag) { return tag.trim(); })
        .filter(function (tag) { return tag.length > 0; }),
    };

    const restore = setLoading('Posting…');

    try {
      const token = getCookie('token');
      const headers = { 'Content-Type': 'application/json' };
      // `authenticate` reads the Bearer header only — it has no cookie
      // fallback — so the cookie has to be forwarded explicitly.
      if (token) headers.Authorization = 'Bearer ' + token;

      const res = await fetch('/api/experiences', {
        method: 'POST',
        headers: headers,
        body: JSON.stringify(payload),
      });

      let data = {};
      try {
        data = await res.json();
      } catch (err) {
        // Non-JSON body (proxy error page, rate limiter, etc.)
        data = { message: 'Unexpected response from the server (HTTP ' + res.status + ').' };
      }

      if (res.ok && data.success !== false) {
        bypassGuard = true;
        showToast('Experience posted. Thanks for sharing!', 'success');

        // Let the toast register before navigating. Land on the new post when
        // the API returns its id, so the author sees exactly what went live.
        const newId = data.data && data.data.id;
        setTimeout(function () {
          window.location.href = newId ? '/experiences/' + newId : '/experiences';
        }, 900);
        return;
      }

      showError(errorMessage({ status: res.status, data: data }));
    } catch (err) {
      showError('Network error — your post was not saved. Check your connection and try again.');
    }

    restore();
  });
})();
