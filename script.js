const loginForm = document.getElementById('loginForm');
const loginUsername = document.getElementById('loginUsername');
const loginPassword = document.getElementById('loginPassword');
const statusText = document.getElementById('statusText');
const currentUserLabel = document.getElementById('currentUserLabel');
const profileUsername = document.getElementById('profileUsername');
const messageForm = document.getElementById('messageForm');
const messageInput = document.getElementById('messageInput');
const messageList = document.getElementById('messageList');
const loginReset = document.getElementById('loginReset');
const resetPasswordBtn = document.getElementById('resetPasswordBtn');
const logoutBtn = document.getElementById('logoutBtn');
const landingScreen = document.getElementById('landingScreen');
const authScreen = document.getElementById('authScreen');
const chatScreen = document.getElementById('chatScreen');
const joinBtn = document.getElementById('joinBtn');
const drawerToggle = document.getElementById('drawerToggle');
const drawerOverlay = document.getElementById('drawerOverlay');
const sideDrawer = document.getElementById('sideDrawer');
const friendForm = document.getElementById('addFriendForm');
const friendNameInput = document.getElementById('friendName');
const serverForm = document.getElementById('addServerForm');
const serverNameInput = document.getElementById('serverName');
const friendList = document.getElementById('friendList');
const serverList = document.getElementById('serverList');
const addGroupButton = document.getElementById('addServerButton');
const groupIconList = document.getElementById('groupIconList');
const tabButtons = Array.from(document.querySelectorAll('.tab'));
const addFriendBtn = document.getElementById('addFriendBtn');
const navMenu = document.getElementById('navMenu');
const friendsNav = document.getElementById('friendsNav');
const requestsNav = document.getElementById('requestsNav');
const friendsPanel = document.getElementById('friendsPanel');
const requestsPanel = document.getElementById('requestsPanel');
const requestList = document.getElementById('requestList');
const addFriendModal = document.getElementById('addFriendModal');
const addFriendInput = document.getElementById('addFriendInput');
const userSuggestions = document.getElementById('userSuggestions');
const addFriendStatus = document.getElementById('addFriendStatus');
const cancelAddFriend = document.getElementById('cancelAddFriend');
const confirmAddFriend = document.getElementById('confirmAddFriend');

const STORAGE_TOKEN = 'chatGateToken';
const API_BASE = '/api';

let currentUser = null;
let selectedGroupId = null;
let activeChatFriend = null;
let activeNavView = 'friends';
let cachedFriends = [];
let cachedServers = [];
let cachedRequests = [];
let pollTimer = null;

function showStatus(message, isError = false) {
  statusText.textContent = message;
  statusText.style.color = isError ? '#f6a5c0' : '#c5d5ff';
}

function setScreen(screen) {
  landingScreen.classList.toggle('active', screen === 'landing');
  authScreen.classList.toggle('active', screen === 'auth');
  chatScreen.classList.toggle('active', screen === 'chat');
}

function openAuth() {
  setScreen('auth');
  showStatus('Create an account or sign in to join the chat.');
}

function openDrawer() {
  sideDrawer.classList.add('open');
  drawerOverlay.classList.add('open');
}

function closeDrawer() {
  sideDrawer.classList.remove('open');
  drawerOverlay.classList.remove('open');
}

function toggleDrawer() {
  if (sideDrawer.classList.contains('open')) {
    closeDrawer();
  } else {
    openDrawer();
  }
}

function saveToken(token) {
  localStorage.setItem(STORAGE_TOKEN, token);
}

function getToken() {
  return localStorage.getItem(STORAGE_TOKEN);
}

function clearToken() {
  localStorage.removeItem(STORAGE_TOKEN);
}

async function apiFetch(path, options = {}) {
  const headers = { 'Content-Type': 'application/json', ...(options.headers || {}) };
  const token = getToken();
  if (token) headers.Authorization = `Bearer ${token}`;

  const response = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers,
    body: options.body ? JSON.stringify(options.body) : undefined,
  });

  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    const error = new Error(data.error || 'Something went wrong.');
    error.code = data.code;
    error.status = response.status;
    error.suggestions = data.suggestions || [];
    throw error;
  }
  return data;
}

function setAddFriendStatus(message, type = '') {
  if (!addFriendStatus) return;
  addFriendStatus.textContent = message;
  addFriendStatus.className = `add-friend-status${type ? ` ${type}` : ''}`;
}

function openAddFriendModal() {
  if (!addFriendModal) return;
  addFriendModal.hidden = false;
  setAddFriendStatus('');
  if (userSuggestions) userSuggestions.innerHTML = '';
  if (addFriendInput) {
    addFriendInput.value = '';
    addFriendInput.focus();
  }
}

function closeAddFriendModal() {
  if (!addFriendModal) return;
  addFriendModal.hidden = true;
}

async function refreshUserSuggestions(query) {
  if (!userSuggestions) return;
  const q = query.trim();
  if (q.length < 2) {
    userSuggestions.innerHTML = '';
    return;
  }
  try {
    const data = await apiFetch(`/users/search?q=${encodeURIComponent(q)}`);
    userSuggestions.innerHTML = '';
    data.users.forEach((username) => {
      const li = document.createElement('li');
      const button = document.createElement('button');
      button.type = 'button';
      button.textContent = username;
      button.addEventListener('click', () => {
        if (addFriendInput) addFriendInput.value = username;
        userSuggestions.innerHTML = '';
      });
      li.appendChild(button);
      userSuggestions.appendChild(li);
    });
  } catch (error) {
    userSuggestions.innerHTML = '';
  }
}

function updateProfilePanel() {
  if (!currentUser) return;
  currentUserLabel.innerHTML = `Logged in as <strong>${currentUser.username}</strong>`;
  profileUsername.textContent = currentUser.username;
}

function switchNavView(view) {
  activeNavView = view;
  if (navMenu) {
    navMenu.querySelectorAll('.menu-item').forEach((item) => {
      item.classList.toggle('active', item.dataset.nav === view);
    });
  }
  if (friendsNav) friendsNav.hidden = view !== 'friends';
  if (requestsNav) requestsNav.hidden = view !== 'requests';
  if (friendsPanel) friendsPanel.hidden = view !== 'friends';
  if (requestsPanel) requestsPanel.hidden = view !== 'requests';
  if (view === 'requests') {
    renderFriendRequests();
  } else {
    renderMessagesForActiveChat();
  }
}

function renderFriendRequests() {
  if (!requestList) return;
  requestList.innerHTML = '';
  if (!cachedRequests.length) {
    requestList.innerHTML = '<li class="request-empty">No pending friend requests right now.</li>';
    return;
  }
  cachedRequests.forEach((request) => {
    const li = document.createElement('li');
    li.className = 'request-item';
    li.innerHTML = `
      <div class="request-avatar">${request.from.slice(0, 2).toUpperCase()}</div>
      <div class="request-details">
        <strong>${request.from}</strong>
        <span>Sent you a friend request.</span>
      </div>
      <div class="request-actions">
        <button class="btn primary small accept-request" type="button">Accept</button>
        <button class="btn secondary small decline-request" type="button">Ignore</button>
      </div>
    `;
    li.querySelector('.accept-request').addEventListener('click', () => acceptFriendRequest(request.id));
    li.querySelector('.decline-request').addEventListener('click', () => declineFriendRequest(request.id));
    requestList.appendChild(li);
  });
}

async function refreshRequests() {
  const data = await apiFetch('/requests');
  cachedRequests = data.requests;
  if (activeNavView === 'requests') renderFriendRequests();
}

async function sendFriendRequest(username) {
  if (!currentUser) return false;
  const target = username.trim().replace(/\s+/g, ' ');
  if (!target) {
    setAddFriendStatus('Enter a username first.', 'error');
    return false;
  }
  try {
    const data = await apiFetch('/requests', { method: 'POST', body: { to: target } });
    setAddFriendStatus(`Friend request sent to ${data.request.to}.`, 'success');
    setTimeout(closeAddFriendModal, 1200);
    return true;
  } catch (error) {
    if (error.code === 'incoming_exists') {
      setAddFriendStatus(`${target} already sent you a request. Open Message Requests.`, 'error');
      switchNavView('requests');
      await refreshRequests();
      return false;
    }
    let message = error.message;
    if (error.suggestions?.length) {
      message += ` Available users: ${error.suggestions.join(', ')}`;
    }
    setAddFriendStatus(message, 'error');
    return false;
  }
}

async function acceptFriendRequest(requestId) {
  try {
    const data = await apiFetch(`/requests/${requestId}/accept`, {
      method: 'POST',
      body: { groupId: selectedGroupId },
    });
    cachedFriends = data.friends;
    await refreshRequests();
    renderFriends(cachedFriends);
    switchNavView('friends');
  } catch (error) {
    alert(error.message);
  }
}

async function declineFriendRequest(requestId) {
  try {
    await apiFetch(`/requests/${requestId}/decline`, { method: 'POST' });
    await refreshRequests();
  } catch (error) {
    alert(error.message);
  }
}

function renderFriends(friends) {
  friendList.innerHTML = '';
  const visible = friends;
  if (!visible.length) {
    friendList.innerHTML = '<li>No chats yet. Add a friend to start talking.</li>';
    return;
  }
  visible.forEach((friend) => {
    const li = document.createElement('li');
    li.innerHTML = `
      <div class="chat-avatar">${friend.name.slice(0, 2).toUpperCase()}</div>
      <div class="chat-item-details">
        <strong>${friend.name}</strong>
        <span>Say hello and start your first message.</span>
      </div>
    `;
    li.dataset.id = friend.id;
    li.addEventListener('click', () => {
      document.querySelectorAll('.chat-list li').forEach((el) => el.classList.toggle('active', el === li));
      activeChatFriend = friend;
      renderMessagesForActiveChat();
    });
    friendList.appendChild(li);
  });
}

function renderServers(servers) {
  serverList.innerHTML = '';
  if (!servers.length) {
    serverList.innerHTML = '<li>No groups yet. Create one to get started.</li>';
  } else {
    servers.forEach((server) => {
      const li = document.createElement('li');
      li.textContent = server.name;
      serverList.appendChild(li);
    });
  }
  renderGroups(servers);
}

function renderGroups(servers) {
  groupIconList.innerHTML = '';
  servers.forEach((server) => {
    const badge = document.createElement('div');
    badge.className = 'group-item';
    badge.textContent = server.name.slice(0, 2).toUpperCase();
    badge.title = server.name;
    badge.dataset.id = server.id;
    badge.addEventListener('click', () => selectGroup(server.id));
    groupIconList.appendChild(badge);
  });
}

async function loadCommunity() {
  const [friendsData, serversData] = await Promise.all([
    apiFetch('/friends'),
    apiFetch('/servers'),
  ]);
  cachedFriends = friendsData.friends;
  cachedServers = serversData.servers;
  renderFriends(cachedFriends);
  renderServers(cachedServers);
  await refreshRequests();
}

function autoSelectDefault() {
  if (!selectedGroupId && cachedServers.length) {
    selectGroup(cachedServers[0].id);
    return;
  }
  if (cachedFriends.length) {
    const first = cachedFriends[0];
    const li = document.querySelector(`.chat-list li[data-id="${first.id}"]`);
    if (li) li.click();
  }
}

function selectGroup(groupId) {
  selectedGroupId = groupId;
  document.querySelectorAll('.group-item').forEach((el) => {
    el.classList.toggle('selected', el.dataset.id === String(groupId));
  });
  renderFriends(cachedFriends);
}

function paintMessages(messages) {
  messageList.innerHTML = '';
  if (!messages.length) {
    messageList.innerHTML = '<div class="message-row"><div class="message-bubble">No messages in this chat yet.</div></div>';
    return;
  }
  messages.forEach((message) => {
    const row = document.createElement('div');
    row.className = `message-row ${message.sender === currentUser.username ? 'self' : ''}`;
    const bubble = document.createElement('div');
    bubble.className = 'message-bubble';
    bubble.textContent = message.content;
    const meta = document.createElement('div');
    meta.className = 'message-meta';
    meta.textContent = `${message.sender} · ${new Date(message.sent_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
    row.appendChild(bubble);
    row.appendChild(meta);
    messageList.appendChild(row);
  });
  messageList.scrollTop = messageList.scrollHeight;
}

async function renderMessagesForActiveChat() {
  if (!activeChatFriend) {
    messageList.innerHTML = '<div class="message-row"><div class="message-bubble">Select a friend to start chatting.</div></div>';
    return;
  }
  try {
    const data = await apiFetch(`/messages?friend=${encodeURIComponent(activeChatFriend.name)}`);
    paintMessages(data.messages);
  } catch (error) {
    messageList.innerHTML = `<div class="message-row"><div class="message-bubble">${error.message}</div></div>`;
  }
}

async function addMessage(content) {
  await apiFetch('/messages', {
    method: 'POST',
    body: {
      content: content.trim(),
      groupId: selectedGroupId,
      recipient: activeChatFriend.name,
    },
  });
  await renderMessagesForActiveChat();
}

function startPolling() {
  stopPolling();
  pollTimer = setInterval(async () => {
    if (!currentUser || !chatScreen.classList.contains('active')) return;
    try {
      await refreshRequests();
      if (activeNavView === 'friends' && activeChatFriend) {
        await renderMessagesForActiveChat();
      }
    } catch (error) {
      // Ignore polling errors silently.
    }
  }, 3000);
}

function stopPolling() {
  if (pollTimer) {
    clearInterval(pollTimer);
    pollTimer = null;
  }
}

async function enterChat(user, message) {
  currentUser = user;
  updateProfilePanel();
  setScreen('chat');
  showStatus(message);
  await loadCommunity();
  startPolling();
  setTimeout(autoSelectDefault, 60);
}

async function restoreSession() {
  const token = getToken();
  if (!token) return;
  try {
    const data = await apiFetch('/auth/me');
    await enterChat(data.user, `Welcome back, ${data.user.username}!`);
  } catch (error) {
    clearToken();
  }
}

function initApp() {
  if (!joinBtn) return;

  async function handleLogin(event) {
    if (event && event.preventDefault) event.preventDefault();
    const username = loginUsername.value.trim();
    const password = loginPassword.value;

    if (username.length < 3) {
      showStatus('Username must be at least 3 characters.', true);
      return;
    }
    if (password.length < 4) {
      showStatus('Password must be at least 4 characters.', true);
      return;
    }

    try {
      let data;
      try {
        data = await apiFetch('/auth/login', { method: 'POST', body: { username, password } });
        saveToken(data.token);
        await enterChat(data.user, `Welcome back, ${data.user.username}!`);
      } catch (loginError) {
        if (loginError.status === 404) {
          data = await apiFetch('/auth/register', { method: 'POST', body: { username, password } });
          saveToken(data.token);
          await enterChat(data.user, 'Account created. You can now chat with other people!');
        } else if (loginError.status === 401) {
          showStatus('Incorrect password.', true);
          if (loginReset) {
            loginReset.style.display = 'block';
            loginReset.dataset.username = username;
          }
        } else {
          showStatus(loginError.message, true);
        }
      }
    } catch (error) {
      showStatus(error.message, true);
    }
  }

  loginForm.addEventListener('submit', handleLogin);
  const loginSubmitBtn = loginForm.querySelector('button[type="submit"]');
  if (loginSubmitBtn) loginSubmitBtn.addEventListener('click', handleLogin);

  if (resetPasswordBtn) {
    resetPasswordBtn.addEventListener('click', async () => {
      const uname = loginReset?.dataset.username || loginUsername.value.trim();
      const password = loginPassword.value;
      if (!uname || password.length < 4) {
        showStatus('Enter a new password with at least 4 characters.', true);
        return;
      }
      if (!confirm(`Reset password for ${uname}?`)) return;
      try {
        const data = await apiFetch('/auth/reset-password', {
          method: 'POST',
          body: { username: uname, password },
        });
        saveToken(data.token);
        await enterChat(data.user, 'Password reset. Signing you in...');
      } catch (error) {
        showStatus(error.message, true);
      }
    });
  }

  if (friendForm) {
    friendForm.addEventListener('submit', async (event) => {
      event.preventDefault();
      const name = friendNameInput.value.trim();
      if (!name) return;
      await sendFriendRequest(name);
      friendNameInput.value = '';
    });
  }

  messageForm.addEventListener('submit', async (event) => {
    event.preventDefault();
    const text = messageInput.value.trim();
    if (!text) return;
    if (!currentUser) {
      showStatus('Please sign in to send messages.', true);
      return;
    }
    if (!activeChatFriend) {
      showStatus('Select a friend before sending a message.', true);
      return;
    }
    try {
      await addMessage(text);
      messageInput.value = '';
    } catch (error) {
      showStatus(error.message, true);
    }
  });

  if (serverForm) {
    serverForm.addEventListener('submit', async (event) => {
      event.preventDefault();
      const name = serverNameInput.value.trim();
      if (!name) return;
      try {
        const data = await apiFetch('/servers', { method: 'POST', body: { name } });
        cachedServers.push(data.server);
        renderServers(cachedServers);
        serverNameInput.value = '';
      } catch (error) {
        showStatus(error.message, true);
      }
    });
  }

  addGroupButton.addEventListener('click', async () => {
    const name = prompt('New group name');
    if (!name) return;
    try {
      const data = await apiFetch('/servers', { method: 'POST', body: { name: name.trim() } });
      cachedServers.push(data.server);
      renderServers(cachedServers);
    } catch (error) {
      alert(error.message);
    }
  });

  if (addFriendBtn) {
    addFriendBtn.addEventListener('click', openAddFriendModal);
  }

  if (cancelAddFriend) {
    cancelAddFriend.addEventListener('click', closeAddFriendModal);
  }

  if (confirmAddFriend) {
    confirmAddFriend.addEventListener('click', async () => {
      if (!addFriendInput) return;
      await sendFriendRequest(addFriendInput.value);
    });
  }

  if (addFriendInput) {
    addFriendInput.addEventListener('input', () => {
      refreshUserSuggestions(addFriendInput.value);
    });
    addFriendInput.addEventListener('keydown', async (event) => {
      if (event.key === 'Enter') {
        event.preventDefault();
        await sendFriendRequest(addFriendInput.value);
      }
    });
  }

  if (addFriendModal) {
    addFriendModal.addEventListener('click', (event) => {
      if (event.target === addFriendModal) closeAddFriendModal();
    });
  }

  if (navMenu) {
    navMenu.querySelectorAll('.menu-item').forEach((item) => {
      item.addEventListener('click', () => {
        const view = item.dataset.nav;
        if (view) switchNavView(view);
      });
    });
  }

  tabButtons.forEach((button) => {
    button.addEventListener('click', () => {
      const tab = button.dataset.tab;
      tabButtons.forEach((btn) => btn.classList.toggle('active', btn === button));
      document.querySelectorAll('.tab-panel').forEach((panel) => {
        panel.classList.toggle('active', panel.id === tab);
      });
    });
  });

  joinBtn.addEventListener('click', () => {
    setScreen('auth');
    showStatus('Create an account or sign in to join the chat.');
  });

  drawerToggle.addEventListener('click', toggleDrawer);
  drawerOverlay.addEventListener('click', closeDrawer);

  document.addEventListener('touchstart', (event) => {
    if (event.touches.length !== 1) return;
    window.drawerTouchStart = event.touches[0].clientX;
  });

  document.addEventListener('touchmove', (event) => {
    if (window.drawerTouchStart == null || event.touches.length !== 1) return;
    const currentX = event.touches[0].clientX;
    const deltaX = currentX - window.drawerTouchStart;

    if (!sideDrawer.classList.contains('open') && window.drawerTouchStart < 40 && deltaX > 80) {
      openDrawer();
      window.drawerTouchStart = null;
    }
    if (sideDrawer.classList.contains('open') && deltaX < -80) {
      closeDrawer();
      window.drawerTouchStart = null;
    }
  });

  document.addEventListener('touchend', () => {
    window.drawerTouchStart = null;
  });

  logoutBtn.addEventListener('click', () => {
    setScreen('landing');
    currentUser = null;
    clearToken();
    stopPolling();
    closeDrawer();
    showStatus('Logged out. Ready to connect.');
  });

  restoreSession();
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initApp);
} else {
  initApp();
}
