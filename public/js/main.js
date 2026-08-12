// ============================================
// Placement Portal — Client-Side JavaScript
// ============================================

// ── Toast Notification System ─────────────────
function showToast(message, type = 'info') {
  const container = document.getElementById('toast-container');
  if (!container) return;

  const iconMap = {
    success: 'fa-circle-check',
    error: 'fa-circle-xmark',
    warning: 'fa-triangle-exclamation',
    info: 'fa-circle-info'
  };

  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;
  toast.innerHTML = `
    <i class="fa-solid ${iconMap[type] || iconMap.info} toast-icon"></i>
    <span>${message}</span>
    <button class="toast-close" onclick="this.parentElement.classList.add('removing'); setTimeout(() => this.parentElement.remove(), 300);">
      <i class="fa-solid fa-xmark"></i>
    </button>
  `;

  container.appendChild(toast);

  // Auto-remove after 5 seconds
  setTimeout(() => {
    if (toast.parentElement) {
      toast.classList.add('removing');
      setTimeout(() => toast.remove(), 300);
    }
  }, 5000);
}

// ── Cookie Helpers ─────────────────────────────
function getCookie(name) {
  const match = document.cookie.match(new RegExp('(^| )' + name + '=([^;]+)'));
  return match ? match[2] : null;
}

function setCookie(name, value, days = 7) {
  const d = new Date();
  d.setTime(d.getTime() + days * 24 * 60 * 60 * 1000);
  document.cookie = `${name}=${value};path=/;expires=${d.toUTCString()};SameSite=Lax`;
}

function deleteCookie(name) {
  document.cookie = `${name}=;path=/;expires=Thu, 01 Jan 1970 00:00:01 GMT`;
}

// ── Auth Form Handlers ─────────────────────────
function initAuthForms() {
  const loginForm = document.getElementById('login-form');
  const registerForm = document.getElementById('register-form');

  if (loginForm) {
    loginForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const btn = loginForm.querySelector('button[type="submit"]');
      const originalText = btn.innerHTML;

      btn.disabled = true;
      btn.innerHTML = '<div class="spinner"></div> Signing in...';

      try {
        const res = await fetch('/api/auth/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            email: loginForm.email.value,
            password: loginForm.password.value
          })
        });

        const data = await res.json();

        if (data.success) {
          setCookie('token', data.data.token, 7);
          showToast('Login successful! Redirecting...', 'success');
          setTimeout(() => window.location.href = '/dashboard', 500);
        } else {
          showToast(data.message || 'Login failed', 'error');
          btn.disabled = false;
          btn.innerHTML = originalText;
        }
      } catch (err) {
        showToast('Network error. Please try again.', 'error');
        btn.disabled = false;
        btn.innerHTML = originalText;
      }
    });
  }

  if (registerForm) {
    registerForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const btn = registerForm.querySelector('button[type="submit"]');
      const originalText = btn.innerHTML;

      // Validate passwords match
      if (registerForm.password.value !== registerForm.confirmPassword.value) {
        showToast('Passwords do not match', 'error');
        return;
      }

      btn.disabled = true;
      btn.innerHTML = '<div class="spinner"></div> Creating account...';

      try {
        const body = {
          name: registerForm.name.value,
          email: registerForm.email.value,
          password: registerForm.password.value,
          role: registerForm.role.value || 'STUDENT',
        };

        if (registerForm.college.value) body.college = registerForm.college.value;
        if (registerForm.branch.value) body.branch = registerForm.branch.value;
        if (registerForm.graduationYear.value) body.graduationYear = parseInt(registerForm.graduationYear.value);

        const res = await fetch('/api/auth/register', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body)
        });

        const data = await res.json();

        if (data.success) {
          setCookie('token', data.data.token, 7);
          showToast('Account created! Redirecting...', 'success');
          setTimeout(() => window.location.href = '/dashboard', 500);
        } else {
          showToast(data.message || 'Registration failed', 'error');
          btn.disabled = false;
          btn.innerHTML = originalText;
        }
      } catch (err) {
        showToast('Network error. Please try again.', 'error');
        btn.disabled = false;
        btn.innerHTML = originalText;
      }
    });
  }
}

// ── ATS Scanner ────────────────────────────────
function initATSScanner() {
  const uploadZone = document.getElementById('upload-zone');
  const fileInput = document.getElementById('resume-file');
  const fileName = document.getElementById('file-name');
  const scanForm = document.getElementById('ats-form');
  const scanBtn = document.getElementById('scan-btn');
  const resultsSection = document.getElementById('ats-results');

  if (!uploadZone || !fileInput) return;

  // Drag and drop
  ['dragenter', 'dragover'].forEach(evt => {
    uploadZone.addEventListener(evt, (e) => {
      e.preventDefault();
      uploadZone.classList.add('drag-over');
    });
  });

  ['dragleave', 'drop'].forEach(evt => {
    uploadZone.addEventListener(evt, (e) => {
      e.preventDefault();
      uploadZone.classList.remove('drag-over');
    });
  });

  uploadZone.addEventListener('drop', (e) => {
    const files = e.dataTransfer.files;
    if (files.length > 0) {
      const file = files[0];
      if (file.type === 'application/pdf') {
        fileInput.files = files;
        updateFileDisplay(file);
      } else {
        showToast('Please upload a PDF file only', 'error');
      }
    }
  });

  fileInput.addEventListener('change', (e) => {
    if (e.target.files.length > 0) {
      updateFileDisplay(e.target.files[0]);
    }
  });

  function updateFileDisplay(file) {
    fileName.textContent = file.name;
    uploadZone.classList.add('has-file');
    const icon = uploadZone.querySelector('.upload-zone-icon i');
    if (icon) {
      icon.className = 'fa-solid fa-file-pdf';
    }
    const heading = uploadZone.querySelector('h3');
    if (heading) heading.textContent = 'File Selected';
    const desc = uploadZone.querySelector('p');
    if (desc) desc.textContent = `${file.name} (${(file.size / 1024).toFixed(1)} KB)`;
  }

  // Form submission
  if (scanForm) {
    scanForm.addEventListener('submit', async (e) => {
      e.preventDefault();

      if (!fileInput.files.length) {
        showToast('Please upload your resume first', 'error');
        return;
      }

      const jd = document.getElementById('job-description').value;
      if (!jd || jd.trim().length < 20) {
        showToast('Please enter a job description (at least 20 characters)', 'error');
        return;
      }

      const originalText = scanBtn.innerHTML;
      scanBtn.disabled = true;
      scanBtn.innerHTML = '<div class="spinner"></div> Scanning Document...';

      const formData = new FormData();
      formData.append('resume', fileInput.files[0]);
      formData.append('jobDescription', jd);

      try {
        const token = getCookie('token');
        const res = await fetch('/api/ats/analyze', {
          method: 'POST',
          headers: token ? { 'Authorization': `Bearer ${token}` } : {},
          body: formData
        });

        const data = await res.json();

        if (data.success) {
          showToast('Analysis complete!', 'success');
          renderATSResults(data.data);
        } else {
          showToast(data.message || 'Analysis failed', 'error');
        }
      } catch (err) {
        showToast('Network error. Please try again.', 'error');
      } finally {
        scanBtn.disabled = false;
        scanBtn.innerHTML = originalText;
      }
    });
  }
}

function renderATSResults(data) {
  const resultsSection = document.getElementById('ats-results');
  if (!resultsSection) return;

  // Determine score color
  let gaugeColor, scoreClass;
  if (data.matchScore >= 75) {
    gaugeColor = 'var(--success-500)';
    scoreClass = 'high';
  } else if (data.matchScore >= 50) {
    gaugeColor = 'var(--warning-500)';
    scoreClass = 'medium';
  } else {
    gaugeColor = 'var(--danger-500)';
    scoreClass = 'low';
  }

  // Build found keywords
  const foundHTML = (data.foundKeywords || []).map(kw =>
    `<span class="keyword-pill found"><i class="fa-solid fa-check"></i> ${kw}</span>`
  ).join('');

  // Build missing keywords
  const missingHTML = (data.missingKeywords || []).map(kw =>
    `<span class="keyword-pill missing"><i class="fa-solid fa-xmark"></i> ${kw}</span>`
  ).join('');

  // Build category breakdown
  let categoryHTML = '';
  if (data.categoryBreakdown) {
    categoryHTML = Object.entries(data.categoryBreakdown).map(([cat, info]) => {
      const found = info.found || 0;
      const total = info.total || 0;
      const pct = total > 0 ? Math.round((found / total) * 100) : 0;
      return `
        <div class="category-bar">
          <div class="category-bar-header">
            <span class="name">${cat}</span>
            <span class="value">${found}/${total} (${pct}%)</span>
          </div>
          <div class="category-bar-track">
            <div class="category-bar-fill" style="width: ${pct}%"></div>
          </div>
        </div>
      `;
    }).join('');
  }

  resultsSection.innerHTML = `
    <div class="ats-results-header">
      <h2>Analysis Results</h2>
      <p class="text-secondary">${data.fileName || 'Resume'}</p>
    </div>

    <div class="ats-results-grid">
      <div class="card">
        <div class="card-body" style="text-align:center;">
          <div class="score-gauge">
            <div class="score-gauge-circle" style="--score: ${data.matchScore}; --gauge-color: ${gaugeColor}">
              <div class="score-gauge-value">
                <div class="score-number">${data.matchScore}%</div>
                <div class="score-label">Match Score</div>
              </div>
            </div>
          </div>
          <div class="ats-meta-stats">
            <div class="ats-meta-stat">
              <div class="value">${data.totalKeywords || 0}</div>
              <div class="label">Total Keywords</div>
            </div>
            <div class="ats-meta-stat">
              <div class="value text-success">${data.foundCount || 0}</div>
              <div class="label">Found</div>
            </div>
            <div class="ats-meta-stat">
              <div class="value text-danger">${data.missingCount || 0}</div>
              <div class="label">Missing</div>
            </div>
          </div>
        </div>
      </div>

      <div class="card">
        <div class="card-body">
          <h3 style="font-size: var(--text-base); font-weight: 600; margin-bottom: var(--space-4);">Category Breakdown</h3>
          ${categoryHTML || '<p class="text-secondary text-sm">No category data available.</p>'}
          <div style="margin-top: var(--space-4); padding-top: var(--space-4); border-top: 1px solid var(--border-light); display: flex; gap: var(--space-4); font-size: var(--text-sm); color: var(--text-secondary);">
            <span><i class="fa-solid fa-file-lines"></i> ${data.pdfPages || '?'} page${(data.pdfPages || 0) !== 1 ? 's' : ''}</span>
            <span><i class="fa-solid fa-font"></i> ${data.resumeWordCount || '?'} words</span>
          </div>
        </div>
      </div>
    </div>

    <div class="keywords-section card" style="margin-top: var(--space-6);">
      <div class="card-body">
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: var(--space-6);">
          <div>
            <h4><i class="fa-solid fa-check-circle text-success"></i> Found Keywords <span class="count">${data.foundCount || 0}</span></h4>
            <div class="keywords-grid">${foundHTML || '<span class="text-sm text-tertiary">None</span>'}</div>
          </div>
          <div>
            <h4><i class="fa-solid fa-xmark-circle text-danger"></i> Missing Keywords <span class="count">${data.missingCount || 0}</span></h4>
            <div class="keywords-grid">${missingHTML || '<span class="text-sm text-tertiary">None</span>'}</div>
          </div>
        </div>
      </div>
    </div>
  `;

  resultsSection.classList.add('active');
  resultsSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

// ── Tab Switching (Prep Hub) ───────────────────
function initTabs() {
  const tabBtns = document.querySelectorAll('.tab-btn');
  const tabContents = document.querySelectorAll('.tab-content');

  tabBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      const target = btn.dataset.tab;

      tabBtns.forEach(b => b.classList.remove('active'));
      tabContents.forEach(c => c.classList.remove('active'));

      btn.classList.add('active');
      const targetContent = document.getElementById(`tab-${target}`);
      if (targetContent) targetContent.classList.add('active');
    });
  });
}

// ── Mobile Sidebar Toggle ──────────────────────
function initSidebar() {
  const toggle = document.getElementById('sidebar-toggle');
  const sidebar = document.querySelector('.app-sidebar');
  const overlay = document.getElementById('sidebar-overlay');

  if (!toggle || !sidebar) return;

  toggle.addEventListener('click', () => {
    sidebar.classList.toggle('open');
    if (overlay) overlay.classList.toggle('active');
  });

  if (overlay) {
    overlay.addEventListener('click', () => {
      sidebar.classList.remove('open');
      overlay.classList.remove('active');
    });
  }
}

// ── Logout ─────────────────────────────────────
function initLogout() {
  const logoutLinks = document.querySelectorAll('.logout-link');
  logoutLinks.forEach(link => {
    link.addEventListener('click', (e) => {
      e.preventDefault();
      deleteCookie('token');
      window.location.href = '/login';
    });
  });
}

// ── Initialize ─────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  initAuthForms();
  initATSScanner();
  initTabs();
  initSidebar();
  initLogout();
});
