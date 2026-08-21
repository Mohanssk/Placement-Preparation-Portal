// ============================================
// Admin Panel — Client-Side Logic
// ============================================
// Loaded only on /admin* pages (see partials/footer.ejs).
// Depends on showToast() and getCookie() from main.js, which loads first.
//
// Every mutation goes through /api/admin/*, which is gated server-side by
// isAdmin. Hiding a button in the UI is convenience, never the control:
// a non-admin who forges a request still gets a 403 from the API.

(function () {
  'use strict';

  // Nothing on this page to wire up — bail before touching the DOM.
  if (!document.querySelector('[data-admin-page]')) return;

  // ── API Helper ───────────────────────────────

  /**
   * Calls an /api/admin endpoint with the JWT from the `token` cookie.
   *
   * @param {string} path - Path after /api/admin, e.g. '/notices'
   * @param {object} [options] - { method, body }
   * @returns {Promise<{ok: boolean, status: number, data: object}>}
   */
  async function adminFetch(path, options) {
    const opts = options || {};
    const token = getCookie('token');

    const headers = { 'Content-Type': 'application/json' };
    if (token) headers.Authorization = 'Bearer ' + token;

    const res = await fetch('/api/admin' + path, {
      method: opts.method || 'GET',
      headers: headers,
      body: opts.body ? JSON.stringify(opts.body) : undefined,
    });

    let data = {};
    try {
      data = await res.json();
    } catch (err) {
      // Non-JSON response (proxy error page, rate limiter, etc.)
      data = { message: 'Unexpected response from the server (HTTP ' + res.status + ').' };
    }

    return { ok: res.ok && data.success !== false, status: res.status, data: data };
  }

  /**
   * Turns a failed response into a single readable message, folding in the
   * per-field errors that validate() returns.
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
      return 'Your session has expired. Please sign in again.';
    }
    if (result.status === 403) {
      return 'Administrator privileges are required for this action.';
    }
    return data.message || 'Something went wrong. Please try again.';
  }

  /**
   * Puts a submit button into a loading state and returns a restore fn.
   *
   * @param {HTMLButtonElement} btn
   * @param {string} loadingLabel
   * @returns {Function} Call to restore the original markup
   */
  function setLoading(btn, loadingLabel) {
    const original = btn.innerHTML;
    btn.disabled = true;
    btn.innerHTML = '<div class="spinner"></div> ' + loadingLabel;

    return function restore() {
      btn.disabled = false;
      btn.innerHTML = original;
    };
  }

  // ── Confirm Dialog ───────────────────────────

  /**
   * Opens a modal confirmation for a destructive action.
   *
   * When `opts.requirePhrase` is set, the confirm button stays disabled
   * until the operator types that exact phrase — used for cascading
   * deletes where the blast radius extends beyond the row itself.
   *
   * @param {object} opts
   * @param {string} opts.title
   * @param {string} opts.body - Plain text (inserted as textContent, not HTML)
   * @param {string} [opts.confirmLabel='Delete']
   * @param {string} [opts.requirePhrase] - Phrase the operator must type
   * @returns {Promise<boolean>} true if confirmed
   */
  function confirmAction(opts) {
    return new Promise(function (resolve) {
      const overlay = document.createElement('div');
      overlay.className = 'confirm-overlay';

      const dialog = document.createElement('div');
      dialog.className = 'confirm-dialog';
      dialog.setAttribute('role', 'dialog');
      dialog.setAttribute('aria-modal', 'true');

      const icon = document.createElement('div');
      icon.className = 'confirm-dialog-icon';
      icon.innerHTML = '<i class="fa-solid fa-triangle-exclamation"></i>';

      const heading = document.createElement('h3');
      heading.textContent = opts.title;

      const body = document.createElement('p');
      body.textContent = opts.body;

      dialog.appendChild(icon);
      dialog.appendChild(heading);
      dialog.appendChild(body);

      let input = null;
      if (opts.requirePhrase) {
        const group = document.createElement('div');
        group.className = 'form-group';

        const label = document.createElement('label');
        label.className = 'form-label';
        label.textContent = 'Type "' + opts.requirePhrase + '" to confirm';

        input = document.createElement('input');
        input.type = 'text';
        input.className = 'form-input';
        input.autocomplete = 'off';

        group.appendChild(label);
        group.appendChild(input);
        dialog.appendChild(group);
      }

      const actions = document.createElement('div');
      actions.className = 'confirm-dialog-actions';

      const cancelBtn = document.createElement('button');
      cancelBtn.type = 'button';
      cancelBtn.className = 'btn btn-ghost';
      cancelBtn.textContent = 'Cancel';

      const confirmBtn = document.createElement('button');
      confirmBtn.type = 'button';
      confirmBtn.className = 'btn btn-danger';
      confirmBtn.innerHTML = '<i class="fa-solid fa-trash"></i> ' +
        (opts.confirmLabel || 'Delete');
      if (input) confirmBtn.disabled = true;

      actions.appendChild(cancelBtn);
      actions.appendChild(confirmBtn);
      dialog.appendChild(actions);
      overlay.appendChild(dialog);
      document.body.appendChild(overlay);

      // Force a reflow so the .active transition actually animates.
      requestAnimationFrame(function () {
        overlay.classList.add('active');
        (input || confirmBtn).focus();
      });

      function close(result) {
        overlay.classList.remove('active');
        document.removeEventListener('keydown', onKeydown);
        setTimeout(function () { overlay.remove(); }, 250);
        resolve(result);
      }

      function onKeydown(e) {
        if (e.key === 'Escape') close(false);
      }

      if (input) {
        input.addEventListener('input', function () {
          confirmBtn.disabled = input.value.trim() !== opts.requirePhrase;
        });
        input.addEventListener('keydown', function (e) {
          if (e.key === 'Enter' && !confirmBtn.disabled) {
            e.preventDefault();
            close(true);
          }
        });
      }

      cancelBtn.addEventListener('click', function () { close(false); });
      confirmBtn.addEventListener('click', function () { close(true); });
      overlay.addEventListener('click', function (e) {
        if (e.target === overlay) close(false);
      });
      document.addEventListener('keydown', onKeydown);
    });
  }

  /**
   * Fades a table row out, then drops it from the DOM.
   *
   * @param {HTMLTableRowElement} row
   */
  function removeRow(row) {
    const table = row.closest('table');
    row.classList.add('row-removing');

    setTimeout(function () {
      row.remove();

      // Last row gone — reload so the server-rendered empty state shows.
      if (table && table.querySelectorAll('tbody tr').length === 0) {
        window.location.reload();
      }
    }, 250);
  }

  // ── Notice Board ─────────────────────────────

  function initNoticeForm() {
    const form = document.getElementById('notice-form');
    if (!form) return;

    form.addEventListener('submit', async function (e) {
      e.preventDefault();

      const title = form.title.value.trim();
      const message = form.message.value.trim();

      if (!title || !message) {
        showToast('Title and body are both required.', 'error');
        return;
      }

      const payload = {
        title: title,
        message: message,
        type: form.type.value,
        companyName: form.companyName.value.trim() || null,
        eventDate: form.eventDate.value || null,
        targetBatch: form.targetBatch.value.trim() || null,
      };

      const restore = setLoading(
        document.getElementById('notice-submit'),
        'Publishing...'
      );

      try {
        const result = await adminFetch('/notices', { method: 'POST', body: payload });

        if (result.ok) {
          showToast('Notice published.', 'success');
          // Reload so the table reflects server-side ordering and formatting.
          setTimeout(function () { window.location.reload(); }, 600);
          return;
        }

        showToast(errorMessage(result), 'error');
      } catch (err) {
        showToast('Network error. Please try again.', 'error');
      }

      restore();
    });
  }

  function initNoticeDelete() {
    document.querySelectorAll('.js-delete-notice').forEach(function (btn) {
      btn.addEventListener('click', async function () {
        const id = btn.dataset.id;
        const title = btn.dataset.title;
        const row = document.querySelector('[data-notice-row="' + id + '"]');

        const confirmed = await confirmAction({
          title: 'Delete this notice?',
          body: '"' + title + '" will be removed from the notice board for every student. This cannot be undone.',
        });
        if (!confirmed) return;

        if (row) row.classList.add('row-pending');

        try {
          const result = await adminFetch('/notices/' + id, { method: 'DELETE' });

          if (result.ok) {
            showToast(result.data.message || 'Notice deleted.', 'success');
            if (row) removeRow(row);
            return;
          }

          showToast(errorMessage(result), 'error');
        } catch (err) {
          showToast('Network error. Please try again.', 'error');
        }

        if (row) row.classList.remove('row-pending');
      });
    });
  }

  // ── Companies ────────────────────────────────

  function initCompanyForm() {
    const form = document.getElementById('company-form');
    if (!form) return;

    const idField = document.getElementById('company-id');
    const heading = document.getElementById('company-form-heading');
    const submitLabel = document.getElementById('company-submit-label');
    const cancelBtn = document.getElementById('company-form-cancel');
    const card = document.getElementById('company-form-card');

    /** Returns the form to "create" mode. */
    function resetToCreate() {
      form.reset();
      idField.value = '';
      heading.textContent = 'Add a Recruiter';
      submitLabel.textContent = 'Add Company';
      cancelBtn.classList.add('is-hidden');
    }

    // ── Edit: prefill from the row's data attributes ──
    document.querySelectorAll('.js-edit-company').forEach(function (btn) {
      btn.addEventListener('click', function () {
        const d = btn.dataset;

        idField.value = d.id;
        form.name.value = d.name || '';
        form.website.value = d.website || '';
        form.description.value = d.description || '';
        form.rolesHired.value = d.roles || '';
        form.minCGPA.value = d.cgpa || '';
        form.allowedBranches.value = d.branches || '';
        form.eligibilityCriteria.value = d.eligibility || '';

        heading.textContent = 'Editing ' + (d.name || 'company');
        submitLabel.textContent = 'Save Changes';
        cancelBtn.classList.remove('is-hidden');

        card.scrollIntoView({ behavior: 'smooth', block: 'start' });
        form.name.focus();
      });
    });

    cancelBtn.addEventListener('click', resetToCreate);
    document.getElementById('company-reset').addEventListener('click', function () {
      // Let the native reset run first, then clear edit mode.
      setTimeout(resetToCreate, 0);
    });

    // ── Submit: POST to create, PUT to update ──
    form.addEventListener('submit', async function (e) {
      e.preventDefault();

      const name = form.name.value.trim();
      if (!name) {
        showToast('Company name is required.', 'error');
        return;
      }

      const editingId = idField.value;

      const payload = {
        name: name,
        website: form.website.value.trim() || null,
        description: form.description.value.trim() || null,
        rolesHired: form.rolesHired.value,
        minCGPA: form.minCGPA.value === '' ? null : form.minCGPA.value,
        allowedBranches: form.allowedBranches.value,
        eligibilityCriteria: form.eligibilityCriteria.value.trim() || null,
      };

      const restore = setLoading(
        document.getElementById('company-submit'),
        editingId ? 'Saving...' : 'Adding...'
      );

      try {
        const result = editingId
          ? await adminFetch('/companies/' + editingId, { method: 'PUT', body: payload })
          : await adminFetch('/companies', { method: 'POST', body: payload });

        if (result.ok) {
          showToast(result.data.message || 'Saved.', 'success');
          setTimeout(function () { window.location.reload(); }, 600);
          return;
        }

        showToast(errorMessage(result), 'error');
      } catch (err) {
        showToast('Network error. Please try again.', 'error');
      }

      restore();
    });
  }

  function initCompanyDelete() {
    document.querySelectorAll('.js-delete-company').forEach(function (btn) {
      btn.addEventListener('click', async function () {
        const id = btn.dataset.id;
        const name = btn.dataset.name;
        const experiences = parseInt(btn.dataset.experiences, 10) || 0;
        const row = document.querySelector('[data-company-row="' + id + '"]');

        let body = 'Deleting ' + name + ' permanently removes its profile and eligibility criteria.';
        if (experiences > 0) {
          body += ' It will ALSO delete ' + experiences + ' interview experience' +
            (experiences === 1 ? '' : 's') + ' that students contributed for this company.';
        }
        body += ' This cannot be undone.';

        const confirmed = await confirmAction({
          title: 'Delete ' + name + '?',
          body: body,
          // The API independently requires this echo, so a stray click on the
          // endpoint cannot cascade-delete student contributions.
          requirePhrase: name,
        });
        if (!confirmed) return;

        if (row) row.classList.add('row-pending');

        try {
          const result = await adminFetch(
            '/companies/' + id + '?confirm=' + encodeURIComponent(name),
            { method: 'DELETE' }
          );

          if (result.ok) {
            showToast(result.data.message || 'Company deleted.', 'success');
            if (row) removeRow(row);
            return;
          }

          showToast(errorMessage(result), 'error');
        } catch (err) {
          showToast('Network error. Please try again.', 'error');
        }

        if (row) row.classList.remove('row-pending');
      });
    });
  }

  // ── Student Roles ────────────────────────────

  function initRoleChange() {
    document.querySelectorAll('.js-change-role').forEach(function (select) {
      select.addEventListener('change', async function () {
        const id = select.dataset.id;
        const name = select.dataset.name;
        const previous = select.dataset.current;
        const next = select.value;

        if (next === previous) return;

        // Promotion to ADMIN grants full write access — confirm explicitly.
        if (next === 'ADMIN') {
          const confirmed = await confirmAction({
            title: 'Grant admin access to ' + name + '?',
            body: name + ' will be able to publish notices, add or delete companies, ' +
              'view the full student roster, and change other users\' roles.',
            confirmLabel: 'Grant admin access',
          });

          if (!confirmed) {
            select.value = previous;
            return;
          }
        }

        select.disabled = true;

        try {
          const result = await adminFetch('/users/' + id + '/role', {
            method: 'PATCH',
            body: { role: next },
          });

          if (result.ok) {
            showToast(result.data.message || 'Role updated.', 'success');
            select.dataset.current = next;

            // Keep the row's role badge in sync without a reload.
            const row = select.closest('tr');
            const badge = row && row.querySelector('[data-role-badge]');
            if (badge) {
              badge.textContent = next;
              badge.className = 'badge ' + (
                next === 'ADMIN' ? 'badge-red' :
                next === 'ALUMNI' ? 'badge-amber' : 'badge-blue'
              );
            }
          } else {
            showToast(errorMessage(result), 'error');
            select.value = previous;
          }
        } catch (err) {
          showToast('Network error. Please try again.', 'error');
          select.value = previous;
        }

        select.disabled = false;
      });
    });
  }

  // ── Init ─────────────────────────────────────
  document.addEventListener('DOMContentLoaded', function () {
    initNoticeForm();
    initNoticeDelete();
    initCompanyForm();
    initCompanyDelete();
    initRoleChange();
  });
})();
