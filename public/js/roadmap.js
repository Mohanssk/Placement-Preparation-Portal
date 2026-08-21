// ============================================
// Roadmap AI — Client-Side JavaScript
// ============================================
// Handles skill loading, roadmap rendering, node
// details (AI explanation + certs), and AI chat.

(function () {
  'use strict';

  const API_BASE = '/api/roadmap';

  // ── DOM References ─────────────────────────────
  const dom = {
    skillsList: document.getElementById('skills-list'),
    skillsCount: document.getElementById('skills-count'),
    roadmapContainer: document.getElementById('roadmap-container'),
    skillTitle: document.getElementById('current-skill-title'),
    nodeTitle: document.getElementById('node-title'),
    nodeExplain: document.getElementById('node-explain-content'),
    certSection: document.getElementById('cert-section'),
    certsList: document.getElementById('node-certs-list'),
    chatMessages: document.getElementById('roadmap-chat-messages'),
    chatForm: document.getElementById('roadmap-chat-form'),
    chatInput: document.getElementById('roadmap-chat-input'),
    sendBtn: document.getElementById('roadmap-send-btn'),
    infoPanel: document.getElementById('info-panel'),
    infoPanelClose: document.getElementById('info-panel-close'),
    infoScroll: document.querySelector('.roadmap-info-scroll'),
    tabs: Array.prototype.slice.call(document.querySelectorAll('.roadmap-tab')),
    tabPanels: {
      info: document.getElementById('panel-info'),
      chat: document.getElementById('panel-chat'),
    },
    chatUnreadDot: document.getElementById('chat-unread-dot'),
  };

  let activeSkillBtn = null;
  let activeTab = 'info';

  // ── Tabs: Info ⇄ AI Mentor ─────────────────────
  // Each tab owns 100% of the panel's vertical space, so the info text
  // and the chat never compete for height.
  function switchTab(name) {
    if (!dom.tabPanels[name]) return;
    activeTab = name;

    dom.tabs.forEach(function (tab) {
      var isActive = tab.dataset.tab === name;
      tab.classList.toggle('is-active', isActive);
      tab.setAttribute('aria-selected', isActive ? 'true' : 'false');
    });

    Object.keys(dom.tabPanels).forEach(function (key) {
      dom.tabPanels[key].classList.toggle('is-active', key === name);
    });

    if (name === 'chat') {
      clearChatUnread();
      // Scroll to latest and focus the input now that the panel is visible.
      dom.chatMessages.scrollTop = dom.chatMessages.scrollHeight;
      if (dom.chatInput) dom.chatInput.focus();
    }
  }

  function markChatUnread() {
    if (activeTab !== 'chat' && dom.chatUnreadDot) {
      dom.chatUnreadDot.classList.add('is-visible');
    }
  }

  function clearChatUnread() {
    if (dom.chatUnreadDot) dom.chatUnreadDot.classList.remove('is-visible');
  }

  // ── Fetch and Display Skills on Load ───────────
  async function fetchSkills() {
    try {
      const res = await fetch(`${API_BASE}/skills`);
      const skills = await res.json();

      dom.skillsList.innerHTML = '';
      dom.skillsCount.textContent = skills.length;

      skills.forEach(function (skill) {
        const btn = document.createElement('button');
        btn.className = 'roadmap-skill-btn';
        btn.textContent = skill.replace(/-/g, ' ');
        btn.addEventListener('click', function () {
          // Toggle active state
          if (activeSkillBtn) activeSkillBtn.classList.remove('active');
          btn.classList.add('active');
          activeSkillBtn = btn;
          loadRoadmap(skill);
        });
        dom.skillsList.appendChild(btn);
      });
    } catch (error) {
      dom.skillsList.innerHTML =
        '<div class="roadmap-error"><i class="fa-solid fa-triangle-exclamation"></i> Failed to load skills. Is the backend running?</div>';
    }
  }

  // ── Load Roadmap for a Skill ───────────────────
  async function loadRoadmap(skill) {
    dom.skillTitle.textContent = skill.replace(/-/g, ' ');
    dom.roadmapContainer.innerHTML =
      '<div class="roadmap-loading"><div class="spinner spinner-dark"></div><span>Generating roadmap…</span></div>';

    try {
      const res = await fetch(`${API_BASE}/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ skill: skill }),
      });
      const data = await res.json();

      if (data.error) throw new Error(data.error);

      renderRoadmap(data.roadmap.nodes);
    } catch (err) {
      dom.roadmapContainer.innerHTML =
        '<div class="roadmap-error"><i class="fa-solid fa-triangle-exclamation"></i> ' + escapeHtml(err.message) + '</div>';
    }
  }

  // ── Render Roadmap Nodes ───────────────────────
  function renderRoadmap(nodes) {
    dom.roadmapContainer.innerHTML = '';

    nodes.forEach(function (node, index) {
      var wrapper = document.createElement('div');
      wrapper.className = 'roadmap-node-item';

      var btn = document.createElement('button');
      btn.className = 'roadmap-node-btn';
      btn.innerHTML =
        '<span class="roadmap-node-number">' + (index + 1) + '</span>' +
        '<span class="roadmap-node-label">' + escapeHtml(node) + '</span>';
      btn.addEventListener('click', function () {
        // Highlight active node
        var allNodes = document.querySelectorAll('.roadmap-node-btn');
        allNodes.forEach(function (n) { n.classList.remove('active'); });
        btn.classList.add('active');
        loadNodeDetails(node);
      });

      wrapper.appendChild(btn);

      // Add connecting line between nodes
      if (index < nodes.length - 1) {
        var line = document.createElement('div');
        line.className = 'roadmap-node-line';
        wrapper.appendChild(line);
      }

      dom.roadmapContainer.appendChild(wrapper);
    });
  }

  // ── Load Node Details (Explain + Certs) ────────
  async function loadNodeDetails(node) {
    // Show panel on mobile, and surface the Info tab
    dom.infoPanel.classList.add('visible');
    switchTab('info');

    // Reset the scroll region so new content starts at the top
    if (dom.infoScroll) dom.infoScroll.scrollTop = 0;

    dom.nodeTitle.innerHTML = '<i class="fa-solid fa-circle-info text-accent"></i> ' + escapeHtml(node);
    dom.nodeExplain.innerHTML =
      '<div class="roadmap-loading"><div class="spinner spinner-dark"></div><span>AI is analyzing topic…</span></div>';
    dom.certSection.hidden = true;
    dom.certsList.innerHTML = '';

    // Fetch explanation (async)
    fetch(`${API_BASE}/explain`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ topic: node }),
    })
      .then(function (r) { return r.json(); })
      .then(function (data) {
        var formatted = formatAIText(data.explanation);
        dom.nodeExplain.innerHTML = '<div class="roadmap-explanation">' + formatted + '</div>';
      })
      .catch(function () {
        dom.nodeExplain.innerHTML =
          '<div class="roadmap-error"><i class="fa-solid fa-triangle-exclamation"></i> Failed to load explanation.</div>';
      });

    // Fetch certifications (async)
    fetch(`${API_BASE}/node-certs`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ node: node }),
    })
      .then(function (r) { return r.json(); })
      .then(function (data) {
        if (!data.certifications || !data.certifications.length) return;
        dom.certSection.hidden = false;
        dom.certsList.innerHTML = data.certifications
          .map(function (cert) {
            return '<li>' +
              '<a href="' + escapeHtml(cert.url) + '" target="_blank" rel="noopener noreferrer" class="roadmap-cert-link">' +
              '<i class="fa-solid fa-arrow-up-right-from-square"></i> ' +
              escapeHtml(cert.title) +
              '</a>' +
              '</li>';
          })
          .join('');
      });
  }

  // ── AI Mentor Chat ─────────────────────────────
  async function handleChat() {
    var msg = dom.chatInput.value.trim();
    if (!msg) return;

    // Append user message
    appendChatMessage(msg, 'user');
    dom.chatInput.value = '';
    if (dom.sendBtn) dom.sendBtn.disabled = true;

    // Loading indicator
    var loadingId = 'loading-' + Date.now();
    var loadingEl = document.createElement('div');
    loadingEl.id = loadingId;
    loadingEl.className = 'roadmap-chat-msg roadmap-chat-msg-ai';
    loadingEl.innerHTML = '<div class="roadmap-chat-bubble"><div class="spinner spinner-dark"></div></div>';
    dom.chatMessages.appendChild(loadingEl);
    dom.chatMessages.scrollTop = dom.chatMessages.scrollHeight;

    try {
      var res = await fetch(`${API_BASE}/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question: msg }),
      });
      var data = await res.json();

      var el = document.getElementById(loadingId);
      if (el) el.remove();

      var reply = formatAIText(data.reply);
      appendChatMessage(reply, 'ai', true);
    } catch (err) {
      var el2 = document.getElementById(loadingId);
      if (el2) el2.remove();
      appendChatMessage('Connection error. Please try again.', 'error', true);
    } finally {
      if (dom.sendBtn) dom.sendBtn.disabled = false;
      if (activeTab === 'chat') dom.chatInput.focus();
    }
  }

  function appendChatMessage(text, type, isHtml) {
    var wrapper = document.createElement('div');
    wrapper.className = 'roadmap-chat-msg roadmap-chat-msg-' + type;

    var bubble = document.createElement('div');
    bubble.className = 'roadmap-chat-bubble';

    if (isHtml) {
      bubble.innerHTML = text;
    } else {
      bubble.textContent = text;
    }

    wrapper.appendChild(bubble);
    dom.chatMessages.appendChild(wrapper);
    dom.chatMessages.scrollTop = dom.chatMessages.scrollHeight;

    // Badge the tab if a reply lands while the user is on the Info tab
    if (type !== 'user') markChatUnread();
  }

  // ── Helpers ────────────────────────────────────

  function formatAIText(text) {
    if (!text) return '';
    return text
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
      .replace(/\*(.*?)\*/g, '<em>$1</em>')
      .replace(/^### (.*$)/gim, '<h4 class="roadmap-ai-heading">$1</h4>')
      .replace(/^## (.*$)/gim, '<h3 class="roadmap-ai-heading">$1</h3>')
      .replace(/^# (.*$)/gim, '<h3 class="roadmap-ai-heading">$1</h3>')
      .replace(/^- (.*$)/gim, '<li>$1</li>')
      .replace(/(<li>.*<\/li>)/s, '<ul class="roadmap-ai-list">$1</ul>')
      .replace(/\n/g, '<br/>');
  }

  function escapeHtml(str) {
    var div = document.createElement('div');
    div.appendChild(document.createTextNode(str));
    return div.innerHTML;
  }

  // ── Event Listeners ────────────────────────────

  // Tab switching (click + arrow-key roving, per ARIA tablist)
  dom.tabs.forEach(function (tab, index) {
    tab.addEventListener('click', function () {
      switchTab(tab.dataset.tab);
    });

    tab.addEventListener('keydown', function (e) {
      if (e.key !== 'ArrowRight' && e.key !== 'ArrowLeft') return;
      e.preventDefault();
      var offset = e.key === 'ArrowRight' ? 1 : -1;
      var next = dom.tabs[(index + offset + dom.tabs.length) % dom.tabs.length];
      switchTab(next.dataset.tab);
      next.focus();
    });
  });

  // The input bar is a <form>, so Enter and the button both submit here
  if (dom.chatForm) {
    dom.chatForm.addEventListener('submit', function (e) {
      e.preventDefault();
      handleChat();
    });
  }

  // Close info panel on mobile
  if (dom.infoPanelClose) {
    dom.infoPanelClose.addEventListener('click', function () {
      dom.infoPanel.classList.remove('visible');
    });
  }

  // ── Initialize ─────────────────────────────────
  fetchSkills();

})();
