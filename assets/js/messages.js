(() => {
  const user = getCurrentUser();
  if (!user) return;
  const isAdmin = user.role === 'admin';

  // ── DOM refs ──────────────────────────────────────────────
  const listScroll    = document.getElementById('msg-list-scroll');
  const listSubtitle  = document.getElementById('msg-list-subtitle');
  const unreadBadge   = document.getElementById('unread-count');
  const threadEmpty   = document.getElementById('msg-thread-empty');
  const threadContent = document.getElementById('msg-thread-content');
  const threadScroll  = document.getElementById('msg-thread-scroll');
  const threadName    = document.getElementById('thread-name');
  const threadSub     = document.getElementById('thread-sub');
  const threadAvatar  = document.getElementById('thread-avatar');
  const statusBar     = document.getElementById('msg-status-bar');
  const composeText   = document.getElementById('compose-text');
  const btnSend       = document.getElementById('btn-send');
  const btnDeleteConversation = document.getElementById('btn-delete-conversation');
  const btnNewMsg     = document.getElementById('btn-new-msg');
  const newMsgForm    = document.getElementById('msg-new-form');
  const newMsgText    = document.getElementById('new-msg-text');
  const btnSendNew    = document.getElementById('btn-send-new');
  const btnCancelNew  = document.getElementById('btn-cancel-new');
  const btnBack       = document.getElementById('btn-back');
  const layout        = document.getElementById('msg-layout');

  let activeConversationId = null;
  let allConversations     = [];

  // ── Helpers ───────────────────────────────────────────────
  function formatDateTime(iso) {
    if (!iso) return '—';
    const d = new Date(iso);
    return d.toLocaleDateString('fr-FR', { day:'2-digit', month:'2-digit', year:'numeric' })
      + ' ' + d.toLocaleTimeString('fr-FR', { hour:'2-digit', minute:'2-digit' });
  }

  function timeAgo(iso) {
    if (!iso) return '';
    const diff = Math.floor((Date.now() - new Date(iso)) / 1000);
    if (diff < 60)    return 'il y a quelques secondes';
    if (diff < 3600)  return `il y a ${Math.floor(diff/60)} min`;
    if (diff < 86400) return `il y a ${Math.floor(diff/3600)}h`;
    return `il y a ${Math.floor(diff/86400)}j`;
  }

  function getAvatarContent(name) {
    const nameStr = String(name || '').trim();
    if (!nameStr) {
      return '<i class="fa-solid fa-user"></i>';
    } else if (nameStr === 'Administrateur') {
      return '<i class="fa-solid fa-user-shield"></i>';
    }
    const inits = nameStr.split(/\s+/).map(w => w[0]).join('').toUpperCase().slice(0, 2);
    return escHtml(inits || '?');
  }

  function setStatus(msg, isError = false) {
    statusBar.textContent = msg;
    statusBar.className = 'msg-status-bar' + (isError ? ' error' : '');
  }

  function escHtml(str) {
    return String(str || '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
  }

  // ── Render liste ──────────────────────────────────────────
  function renderList(conversations) {
    allConversations = conversations;
    listScroll.innerHTML = '';

    const unread = conversations.filter(c => !c.is_read).length;
    unreadBadge.textContent = unread;
    unreadBadge.style.display = unread > 0 ? '' : 'none';

    listSubtitle.textContent = isAdmin
      ? `${conversations.length} conversation(s) reçue(s)`
      : `${conversations.length} conversation(s)`;

    if (conversations.length === 0) {
      listScroll.innerHTML = `<div class="msg-empty-state">
        <div class="msg-empty-icon"><i class="fa-solid fa-envelope-open-text"></i></div>
        Aucun message pour le moment.</div>`;
      return;
    }

    conversations.forEach(conversation => {
      const lastMessage = conversation.messages && conversation.messages.length
        ? conversation.messages[conversation.messages.length - 1]
        : null;
      const preview    = lastMessage ? lastMessage.content.slice(0, 55) + (lastMessage.content.length > 55 ? '…' : '') : '—';
      const senderName = isAdmin ? (conversation.sender?.fullname || 'Utilisateur') : 'Administrateur';
      const isUnread   = !conversation.is_read;
      const timeStr    = lastMessage ? timeAgo(lastMessage.created_at) : timeAgo(conversation.created_at);

      const item = document.createElement('div');
      item.className = 'msg-item' + (isUnread ? ' unread' : '') + (activeConversationId === conversation.id ? ' active' : '');
      item.dataset.id = conversation.id;
      item.innerHTML = `
        <div class="msg-item-avatar">${getAvatarContent(senderName)}</div>
        <div class="msg-item-body">
          <div class="msg-item-name">${escHtml(senderName)}</div>
          <div class="msg-item-preview">${escHtml(preview)}</div>
        </div>
        <div class="msg-item-meta">
          <span class="msg-item-time">${timeStr}</span>
          ${isUnread
            ? '<span class="msg-badge-unread">Non lu</span>'
            : '<span class="msg-badge-read">✓ Lu</span>'}
        </div>`;
      item.addEventListener('click', () => openThread(conversation));
      listScroll.appendChild(item);
    });
  }

  // ── Ouvrir conversation ───────────────────────────────────
  function openThread(conversation) {
    // Marquer automatiquement comme lu si l'admin ouvre une conversation non lue
    if (isAdmin && !conversation.is_read) {
      // Appel API en arrière-plan, sans attendre la réponse pour afficher le thread
      apiFetch(`${API_BASE}/messages/${conversation.id}/read`, { method: 'PUT' })
        .then(res => {
          if (!res.ok) throw new Error(`Erreur HTTP ${res.status}`);
          
          // En cas de succès, mettre à jour les données locales et l'interface
          const conv = allConversations.find(c => c.id === conversation.id);
          if (conv) {
            conv.is_read = true;
          }
          renderList(allConversations); // Met à jour la liste et le compteur de non-lus
          setStatus('Conversation marquée comme lue.');
        })
        .catch(err => {
          console.error('Échec du marquage comme lu:', err);
          // Ne pas afficher d'erreur à l'utilisateur, c'est une tâche de fond.
        });
    }
    activeConversationId = conversation.id;

    listScroll.querySelectorAll('.msg-item').forEach(el => {
      el.classList.toggle('active', Number(el.dataset.id) === conversation.id);
    });

    const senderName = isAdmin ? (conversation.sender?.fullname || 'Utilisateur') : 'Administrateur';
    threadAvatar.innerHTML   = getAvatarContent(senderName);
    threadName.textContent   = senderName;
    threadSub.textContent    = formatDateTime(conversation.created_at);

    btnDeleteConversation.style.display = isAdmin ? '' : 'none';

    threadEmpty.style.display   = 'none';
    threadContent.style.display = 'flex';
    layout.classList.add('thread-open');
    btnBack.style.display = window.innerWidth <= 768 ? '' : 'none';

    renderThread(conversation);
    setStatus('');
  }

  function renderThread(conversation) {
    threadScroll.innerHTML = '';
    const messages = conversation.messages || [];

    messages.forEach(message => {
      const sentByMe = isAdmin
        ? message.sender_role === 'admin'
        : message.sender_role === 'user';
      const label = sentByMe ? 'Vous' : (isAdmin ? (conversation.sender?.fullname || 'Utilisateur') : 'Administrateur');

      const wrap = document.createElement('div');
      wrap.className = 'msg-bubble-wrap ' + (sentByMe ? 'sent' : 'received');
      wrap.dataset.messageId = message.id;

      const deleteBtnHtml = isAdmin
        ? `<button class="msg-delete-btn" type="button" data-message-id="${message.id}" aria-label="Supprimer ce message"><i class="fa-solid fa-times"></i></button>`
        : '';

      wrap.innerHTML = `
        <div class="msg-bubble" data-message-id="${message.id}">${escHtml(message.content)}</div>
        ${deleteBtnHtml}
        <div class="msg-bubble-meta">
          <span>${escHtml(label)}</span>
          <span>·</span>
          <span>${formatDateTime(message.created_at)}</span>
        </div>`;
      threadScroll.appendChild(wrap);
    });

    threadScroll.querySelectorAll('.msg-delete-btn').forEach(btn => {
      btn.addEventListener('click', async (event) => {
        event.stopPropagation();
        await handleDeleteMessage(btn.dataset.messageId);
      });
    });

    threadScroll.scrollTop = threadScroll.scrollHeight;
  }

  async function handleDeleteMessage(messageId) {
    if (!window.confirm("Voulez-vous vraiment supprimer ce message ?\nCette action est irréversible.")) {
      return;
    }

    const button = threadScroll.querySelector(`.msg-delete-btn[data-message-id=\"${messageId}\"]`);
    if (button) button.disabled = true;

    try {
      const res = await apiFetch(`${API_BASE}/messages/${messageId}`, { method: 'DELETE' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || `Erreur HTTP ${res.status}`);

      const conversation = allConversations.find(c => c.id === activeConversationId);
      if (conversation) {
        conversation.messages = (conversation.messages || []).filter(msg => msg.id !== parseInt(messageId, 10));
      }

      const bubbleWrap = threadScroll.querySelector(`.msg-bubble-wrap[data-message-id=\"${messageId}\"]`);
      if (bubbleWrap) bubbleWrap.remove();

      setStatus('Message supprimé avec succès.');

      if (conversation && conversation.messages.length === 0) {
        threadScroll.innerHTML = `<div class="msg-empty-state">
          <div class="msg-empty-icon"><i class="fa-solid fa-trash-can"></i></div>
          Aucun message dans cette conversation.</div>`;
      }
    } catch (err) {
      console.error('Delete message failed:', err);
      setStatus(err.message || 'Erreur lors de la suppression du message.', true);
    } finally {
      if (button) button.disabled = false;
    }
  }

  // ── Charger conversations ─────────────────────────────────
  async function loadMessages() {
    listScroll.innerHTML = `<div class="msg-empty-state">
      <div class="msg-empty-icon"><i class="fa-solid fa-spinner fa-spin"></i></div>
      Chargement…</div>`;
    try {
      const url = isAdmin
        ? `${API_BASE}/messages/admin`
        : `${API_BASE}/messages/user/${encodeURIComponent(user.id)}`;
      const res  = await apiFetch(url);
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || `Erreur HTTP ${res.status}`);
      const conversations = Array.isArray(data) ? data : (data.conversations || data.data || []);
      conversations.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
      renderList(conversations);
    } catch (err) {
      listScroll.innerHTML = `<div class="msg-empty-state">
        <div class="msg-empty-icon"><i class="fa-solid fa-triangle-exclamation"></i></div>
        ${escHtml(err.message || 'Erreur réseau.')}</div>`;
    }
  }

  // ── Envoyer réponse ───────────────────────────────────────
  btnSend.addEventListener('click', sendReply);
  composeText.addEventListener('keydown', e => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendReply(); }
  });

  async function sendReply() {
    const text = composeText.value.trim();
    if (!text || !activeConversationId) return;
    btnSend.disabled = true;
    setStatus('Envoi…');
    try {
      const res = await apiFetch(`${API_BASE}/messages/${activeConversationId}/reply`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sender_id: user.id, content: text })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || `Erreur HTTP ${res.status}`);
      composeText.value = '';
      setStatus('Message envoyé ✓');
      await loadMessages();
      const updated = allConversations.find(c => c.id === activeConversationId);
      if (updated) openThread(updated);
    } catch (err) {
      console.error('[sendReply] erreur', err);
      setStatus(err.message || 'Erreur réseau.', true);
    } finally {
      btnSend.disabled = false;
    }
  }

  async function sendNewMessage() {
    const text = newMsgText.value.trim();
    if (!text) return;
    btnSendNew.disabled = true;
    setStatus('Envoi du nouveau message…');
    try {
      const res = await apiFetch(`${API_BASE}/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sender_id: user.id, content: text })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || `Erreur HTTP ${res.status}`);
      newMsgText.value = '';
      newMsgForm.style.display = 'none';
      btnNewMsg.style.display = '';
      setStatus('Message envoyé ✓');
      await loadMessages();
    } catch (err) {
      console.error('[sendNewMessage] erreur', err);
      setStatus(err.message || 'Erreur réseau.', true);
    } finally {
      btnSendNew.disabled = false;
    }
  }

  // ── Nouveau message (utilisateur) ─────────────────────────
  if (!isAdmin) {
    btnNewMsg.style.display = '';
    btnNewMsg.addEventListener('click', () => {
      newMsgForm.style.display = '';
      newMsgText.focus();
      btnNewMsg.style.display = 'none';
    });
    btnCancelNew.addEventListener('click', () => {
      newMsgForm.style.display = 'none';
      newMsgText.value = '';
      btnNewMsg.style.display = '';
    });
    btnSendNew.addEventListener('click', sendNewMessage);
  }

  if (btnDeleteConversation) {
    btnDeleteConversation.addEventListener('click', async () => {
      if (!activeConversationId) return;
      await deleteConversation(activeConversationId);
    });
  }

  async function deleteConversation(conversationId) {
    if (!window.confirm('Voulez-vous vraiment supprimer cette conversation et tous ses messages ?')) {
      return;
    }

    btnDeleteConversation.disabled = true;
    try {
      const res = await apiFetch(`${API_BASE}/messages/conversation/${conversationId}`, { method: 'DELETE' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || `Erreur HTTP ${res.status}`);

      allConversations = allConversations.filter(c => c.id !== conversationId);
      activeConversationId = null;
      threadContent.style.display = 'none';
      threadEmpty.style.display = '';
      layout.classList.remove('thread-open');
      renderList(allConversations);
      setStatus('Conversation supprimée avec succès.');
    } catch (err) {
      console.error('Delete conversation failed:', err);
      setStatus(err.message || 'Erreur lors de la suppression de la conversation.', true);
    } finally {
      btnDeleteConversation.disabled = false;
    }
  }

  // ── Retour mobile ─────────────────────────────────────────
  btnBack.addEventListener('click', () => {
    layout.classList.remove('thread-open');
    threadContent.style.display = 'none';
    threadEmpty.style.display = '';
    activeConversationId = null;
  });

  // ── Recherche ─────────────────────────────────────────────
  document.getElementById('search').addEventListener('input', e => {
    const q = e.target.value.trim().toLowerCase();
    if (!q) { renderList(allConversations); return; }
    const filtered = allConversations.filter(c => {
      const inMessages = (c.messages || []).some(m => m.content.toLowerCase().includes(q));
      const inSender   = (c.sender?.fullname || '').toLowerCase().includes(q);
      return inMessages || inSender;
    });
    renderList(filtered);
  });

  // ── Init ──────────────────────────────────────────────────
  loadMessages();
})();