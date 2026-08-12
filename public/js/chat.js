// ============================================
// AI Chat Panel — Client-Side Logic
// ============================================

(function () {
  'use strict';

  // ── DOM Elements ──────────────────────────────
  const chatPanel = document.getElementById('chat-panel');
  const chatToggleBtn = document.getElementById('chat-toggle-btn');
  const chatCloseBtn = document.getElementById('chat-panel-close');
  const chatForm = document.getElementById('chat-form');
  const chatInput = document.getElementById('chat-input');
  const chatMessages = document.getElementById('chat-messages');
  const chatSendBtn = document.getElementById('chat-send-btn');

  // Guard: exit if chat elements are missing (e.g., on landing/login pages)
  if (!chatPanel || !chatToggleBtn) return;

  let isLoading = false;

  // ── Toggle Chat Panel ─────────────────────────
  function openChat() {
    chatPanel.classList.add('open');
    document.body.classList.add('chat-open');
    chatInput.focus();
    scrollToBottom();
  }

  function closeChat() {
    chatPanel.classList.remove('open');
    document.body.classList.remove('chat-open');
  }

  chatToggleBtn.addEventListener('click', () => {
    if (chatPanel.classList.contains('open')) {
      closeChat();
    } else {
      openChat();
    }
  });

  chatCloseBtn.addEventListener('click', closeChat);

  // Close on Escape key
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && chatPanel.classList.contains('open')) {
      closeChat();
    }
  });

  // ── Auto-Scroll ───────────────────────────────
  function scrollToBottom() {
    requestAnimationFrame(() => {
      chatMessages.scrollTop = chatMessages.scrollHeight;
    });
  }

  // ── Basic Markdown Rendering ──────────────────
  function renderMarkdown(text) {
    if (!text) return '<p>No response received.</p>';

    let html = text
      // Escape HTML to prevent XSS
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')

      // Code blocks (```)
      .replace(/```(\w*)\n([\s\S]*?)```/g, (_, lang, code) => {
        return `<pre><code>${code.trim()}</code></pre>`;
      })

      // Inline code
      .replace(/`([^`]+)`/g, '<code>$1</code>')

      // Bold
      .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')

      // Italic
      .replace(/\*(.+?)\*/g, '<em>$1</em>')

      // Unordered lists (lines starting with - or *)
      .replace(/^[\-\*]\s+(.+)$/gm, '<li>$1</li>')

      // Ordered lists (lines starting with 1. 2. etc.)
      .replace(/^\d+\.\s+(.+)$/gm, '<li>$1</li>');

    // Wrap consecutive <li> tags in <ul>
    html = html.replace(/((?:<li>.*<\/li>\n?)+)/g, '<ul>$1</ul>');

    // Convert remaining newlines to paragraphs
    // Split by double newlines for paragraphs
    const parts = html.split(/\n{2,}/);
    html = parts
      .map((part) => {
        part = part.trim();
        if (!part) return '';
        // Don't wrap if already wrapped in block element
        if (
          part.startsWith('<ul>') ||
          part.startsWith('<ol>') ||
          part.startsWith('<pre>') ||
          part.startsWith('<h')
        ) {
          return part;
        }
        // Replace single newlines with <br>
        return `<p>${part.replace(/\n/g, '<br>')}</p>`;
      })
      .join('');

    return html || '<p>No response received.</p>';
  }

  // ── Append Messages ───────────────────────────
  function appendUserMessage(text) {
    const msgDiv = document.createElement('div');
    msgDiv.className = 'chat-msg chat-msg-user';
    msgDiv.innerHTML = `
      <div class="chat-msg-bubble">
        <p>${escapeHtml(text)}</p>
      </div>
    `;
    chatMessages.appendChild(msgDiv);
    scrollToBottom();
  }

  function appendAIMessage(html) {
    const msgDiv = document.createElement('div');
    msgDiv.className = 'chat-msg chat-msg-ai';
    msgDiv.innerHTML = `
      <div class="chat-msg-avatar">
        <i class="fa-solid fa-robot"></i>
      </div>
      <div class="chat-msg-bubble">${html}</div>
    `;
    chatMessages.appendChild(msgDiv);
    scrollToBottom();
  }

  function appendErrorMessage(text) {
    const msgDiv = document.createElement('div');
    msgDiv.className = 'chat-msg chat-msg-ai chat-msg-error';
    msgDiv.innerHTML = `
      <div class="chat-msg-avatar">
        <i class="fa-solid fa-robot"></i>
      </div>
      <div class="chat-msg-bubble">
        <p><i class="fa-solid fa-triangle-exclamation"></i> ${escapeHtml(text)}</p>
      </div>
    `;
    chatMessages.appendChild(msgDiv);
    scrollToBottom();
  }

  // ── Typing Indicator ──────────────────────────
  function showTypingIndicator() {
    const typingDiv = document.createElement('div');
    typingDiv.className = 'chat-typing';
    typingDiv.id = 'chat-typing-indicator';
    typingDiv.innerHTML = `
      <div class="chat-msg-avatar">
        <i class="fa-solid fa-robot"></i>
      </div>
      <div class="chat-msg-bubble">
        <div class="typing-dots">
          <span></span>
          <span></span>
          <span></span>
        </div>
      </div>
    `;
    chatMessages.appendChild(typingDiv);
    scrollToBottom();
  }

  function removeTypingIndicator() {
    const indicator = document.getElementById('chat-typing-indicator');
    if (indicator) indicator.remove();
  }

  // ── Escape HTML ───────────────────────────────
  function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  // ── Send Message ──────────────────────────────
  async function sendMessage(prompt) {
    if (isLoading || !prompt.trim()) return;

    isLoading = true;
    chatSendBtn.disabled = true;
    chatInput.disabled = true;

    // Show user message
    appendUserMessage(prompt.trim());
    chatInput.value = '';

    // Show typing indicator
    showTypingIndicator();

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: prompt.trim() }),
      });

      const data = await res.json();
      removeTypingIndicator();

      if (res.ok && data.reply) {
        const renderedHtml = renderMarkdown(data.reply);
        appendAIMessage(renderedHtml);
      } else {
        appendErrorMessage(
          data.reply || data.message || 'Something went wrong. Please try again.'
        );
      }
    } catch (err) {
      removeTypingIndicator();
      appendErrorMessage(
        'Unable to reach the server. Please check your connection and try again.'
      );
      console.error('[Chat] Fetch error:', err);
    } finally {
      isLoading = false;
      chatSendBtn.disabled = false;
      chatInput.disabled = false;
      chatInput.focus();
    }
  }

  // ── Event Listeners ───────────────────────────
  chatForm.addEventListener('submit', (e) => {
    e.preventDefault();
    sendMessage(chatInput.value);
  });

  // Allow Shift+Enter for newline (future textarea upgrade), Enter to send
  chatInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage(chatInput.value);
    }
  });
})();
