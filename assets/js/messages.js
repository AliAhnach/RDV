/* =============================================================
   RDV — Messages Page Logic
   Gère la récupération et l'affichage des conversations et des
   messages pour les utilisateurs et les administrateurs.
   ============================================================= */

(() => {
  'use strict';

  // Vérifie si on est sur la page des messages
  if (!document.querySelector('.msg-layout')) {
    return;
  }

  const API_ROOT = API_BASE;
  const MESSAGES_API = `${API_ROOT}/messages`;

  // --- État local ---
  let state = {
    conversations: [],
    activeConversationId: null,
    currentUser: getCurrentUser(),
    isAdmin: getCurrentUser()?.role === 'admin',
  };

  // --- Éléments du DOM ---
  const layout = document.querySelector('.msg-layout');
  const listPanel = document.querySelector('.msg-list-panel');
  const threadPanel = document.querySelector('.msg-thread-panel');
  const convListContainer = document.querySelector('.msg-list-scroll');
  const threadHeaderName = document.getElementById('thread-header-name');
  const messageContainer = document.querySelector('.msg-thread-scroll');
  const composeForm = document.getElementById('msg-compose-form');
  const composeTextarea = document.getElementById('msg-compose-textarea');
  const emptyState = document.querySelector('.msg-empty-state');
  const backToListBtn = document.getElementById('btn-back-to-list');

  // --- Helpers ---

  async function readApiResponse(res) {
    const body = await res.text();
    let data = {};
    if (body) {
      try {
        data = JSON.parse(body);
      } catch {
        throw new Error(res.ok ? 'Réponse invalide du serveur.' : `Erreur HTTP ${res.status}`);
      }
    }
    if (!res.ok) throw new Error(data.message || data.error || `Erreur HTTP ${res.status}`);
    if (data.success === false) throw new Error(data.message || data.error || 'La requête a échoué.');
    return data;
  }

  function showFeedback(message, isError = false) {
    const statusBar = document.querySelector('.msg-status-bar');
    if (!statusBar) return;
    statusBar.textContent = message;
    statusBar.className = `msg-status-bar ${isError ? 'error' : ''}`;
    setTimeout(() => { statusBar.textContent = ''; }, 4000);
  }

  function deleteIcon() {
    return '<svg class="inline-icon" viewBox="0 0 24 24"><path d="M4 7h16M10 11v6m4-6v6M9 7l1-3h4l1 3M6 7l1 14h10l1-14"/></svg>';
  }

  // --- Rendu ---

  function renderConversations() {
    if (!convListContainer) return;
    convListContainer.innerHTML = '';
    if (state.conversations.length === 0) {
      convListContainer.innerHTML = '<p class="card-empty" style="padding: 20px;">Aucune conversation.</p>';
      return;
    }

    state.conversations.forEach(conv => {
      const lastMessage = conv.messages[conv.messages.length - 1];
      const item = document.createElement('div');
      item.className = `msg-item ${conv.id === state.activeConversationId ? 'active' : ''} ${!conv.is_read && state.isAdmin ? 'unread' : ''}`;
      item.dataset.conversationId = conv.id;
      const initials = (conv.sender?.fullname || 'U').charAt(0).toUpperCase();

      item.innerHTML = `
        <div class="msg-item-avatar">${initials}</div>
        <div class="msg-item-body">
          <div class="msg-item-name">${conv.sender?.fullname || 'Utilisateur inconnu'}</div>
          <div class="msg-item-preview">${lastMessage?.content || '...'}</div>
        </div>
        <div class="msg-item-meta">
          <span class="msg-item-time">${new Date(lastMessage?.created_at || conv.created_at).toLocaleDateString('fr-FR')}</span>
          ${!conv.is_read && state.isAdmin ? '<div class="msg-badge-unread"></div>' : ''}
        </div>
      `;
      convListContainer.appendChild(item);
    });

    // Attacher les écouteurs d'événements
    convListContainer.querySelectorAll('.msg-item').forEach(item => {
      item.addEventListener('click', () => {
        const convId = parseInt(item.dataset.conversationId, 10);
        setActiveConversation(convId);
      });
    });
  }

  function renderActiveConversation() {
    const conv = state.conversations.find(c => c.id === state.activeConversationId);
    if (!conv || !messageContainer || !threadHeaderName) {
      if (emptyState) emptyState.hidden = false;
      if (composeForm) composeForm.hidden = true;
      return;
    }

    if (emptyState) emptyState.hidden = true;
    if (composeForm) composeForm.hidden = false;

    threadHeaderName.textContent = conv.sender?.fullname || 'Conversation';
    messageContainer.innerHTML = '';

    conv.messages.forEach(msg => {
      const isSentByCurrentUser = msg.sender_id === state.currentUser.id;
      const bubbleWrap = document.createElement('div');
      bubbleWrap.className = `msg-bubble-wrap ${isSentByCurrentUser ? 'sent' : 'received'}`;

      const bubble = document.createElement('div');
      bubble.className = 'msg-bubble';
      bubble.dataset.messageId = msg.id;

      let deleteBtnHtml = '';
      // C'EST ICI QU'ON AJOUTE LE BOUTON SUPPRIMER
      if (state.isAdmin) {
        deleteBtnHtml = `
          <button class="btn-icon btn-delete-msg" data-message-id="${msg.id}" title="Supprimer ce message">
            ${deleteIcon()}
          </button>`;
      }

      bubble.innerHTML = `
        <div class="msg-content"><p>${msg.content.replace(/\n/g, '<br>')}</p></div>
        ${deleteBtnHtml}
      `;

      const meta = document.createElement('div');
      meta.className = 'msg-bubble-meta';
      meta.innerHTML = `
        <span class="msg-sender">${msg.sender_name}</span>
        <span class="msg-time">${new Date(msg.created_at).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}</span>
      `;

      bubbleWrap.appendChild(bubble);
      bubbleWrap.appendChild(meta);
      messageContainer.appendChild(bubbleWrap);
    });

    // Attacher les écouteurs pour les nouveaux boutons de suppression
    messageContainer.querySelectorAll('.btn-delete-msg').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        handleDeleteMessage(btn.dataset.messageId);
      });
    });

    messageContainer.scrollTop = messageContainer.scrollHeight;
  }

  // --- Actions ---

  async function handleDeleteMessage(messageId) {
    if (!window.confirm("Voulez-vous vraiment supprimer ce message ?\nCette action est irréversible.")) {
      return;
    }

    try {
      const res = await apiFetch(`${MESSAGES_API}/${messageId}`, { method: 'DELETE' });
      await readApiResponse(res);

      // Mettre à jour l'état local
      const conv = state.conversations.find(c => c.id === state.activeConversationId);
      if (conv) {
        conv.messages = conv.messages.filter(m => m.id !== parseInt(messageId, 10));
      }

      // Mettre à jour l'UI
      const bubbleWrap = document.querySelector(`.msg-bubble[data-message-id="${messageId}"]`)?.closest('.msg-bubble-wrap');
      if (bubbleWrap) {
        bubbleWrap.remove();
      }
      showFeedback('Message supprimé avec succès.');

    } catch (error) {
      console.error('Failed to delete message:', error);
      showFeedback(error.message || 'Une erreur est survenue lors de la suppression.', true);
    }
  }

  async function setActiveConversation(convId) {
    state.activeConversationId = convId;
    if (layout) layout.classList.add('thread-open');

    // Marquer comme lu si admin
    const conv = state.conversations.find(c => c.id === convId);
    if (state.isAdmin && conv && !conv.is_read) {
      try {
        await apiFetch(`${MESSAGES_API}/${convId}/read`, { method: 'PUT' });
        conv.is_read = true;
      } catch (error) {
        console.error("Failed to mark as read:", error);
      }
    }

    renderConversations(); // Pour mettre à jour la classe 'active'
    renderActiveConversation();
  }

  async function handleReply(event) {
    event.preventDefault();
    const content = composeTextarea.value.trim();
    if (!content || !state.activeConversationId) return;

    const originalButtonText = composeForm.querySelector('button span')?.textContent || 'Envoyer';
    composeForm.querySelector('button').disabled = true;
    composeForm.querySelector('button span').textContent = 'Envoi...';

    try {
      const res = await apiFetch(`${MESSAGES_API}/${state.activeConversationId}/reply`, {
        method: 'POST',
        body: JSON.stringify({
          content: content,
          sender_id: state.currentUser.id
        })
      });
      const data = await readApiResponse(res);

      // Mettre à jour l'état et ré-afficher
      const convIndex = state.conversations.findIndex(c => c.id === state.activeConversationId);
      if (convIndex > -1) {
        state.conversations[convIndex] = data.data;
      }
      composeTextarea.value = '';
      renderActiveConversation();

    } catch (error) {
      showFeedback(error.message || "Erreur lors de l'envoi.", true);
    } finally {
      composeForm.querySelector('button').disabled = false;
      composeForm.querySelector('button span').textContent = originalButtonText;
    }
  }

  // --- Initialisation ---

  async function init() {
    if (!state.currentUser) return;

    const url = state.isAdmin ? `${MESSAGES_API}/admin` : `${MESSAGES_API}/user/${state.currentUser.id}`;

    try {
      const res = await apiFetch(url);
      const data = await readApiResponse(res);
      state.conversations = data.data || [];
      renderConversations();
    } catch (error) {
      console.error("Failed to load conversations:", error);
      if (convListContainer) convListContainer.innerHTML = `<p class="card-empty" style="padding: 20px;">${error.message}</p>`;
    }

    if (composeForm) {
      composeForm.addEventListener('submit', handleReply);
    }

    if (backToListBtn) {
      backToListBtn.addEventListener('click', () => {
        if (layout) layout.classList.remove('thread-open');
        state.activeConversationId = null;
        renderConversations();
      });
    }
  }

  init();
})();