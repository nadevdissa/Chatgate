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
const cancelResetBtn = document.getElementById('cancelResetBtn');
const resetPasskey = document.getElementById('resetPasskey');
const resetNewPassword = document.getElementById('resetNewPassword');
const resetConfirmPassword = document.getElementById('resetConfirmPassword');
const savePasskeyCheckbox = document.getElementById('savePasskeyCheckbox');
const passkeyModal = document.getElementById('passkeyModal');
const passkeyDisplay = document.getElementById('passkeyDisplay');
const passkeyModalSave = document.getElementById('passkeyModalSave');
const passkeyModalDone = document.getElementById('passkeyModalDone');
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
const blockedNav = document.getElementById('blockedNav');
const friendsPanel = document.getElementById('friendsPanel');
const requestsPanel = document.getElementById('requestsPanel');
const requestList = document.getElementById('requestList');
const addFriendModal = document.getElementById('addFriendModal');
const addFriendInput = document.getElementById('addFriendInput');
const userSuggestions = document.getElementById('userSuggestions');
const addFriendStatus = document.getElementById('addFriendStatus');
const cancelAddFriend = document.getElementById('cancelAddFriend');
const confirmAddFriend = document.getElementById('confirmAddFriend');
const createGroupModal = document.getElementById('createGroupModal');
const createGroupInput = document.getElementById('createGroupInput');
const createGroupStatus = document.getElementById('createGroupStatus');
const cancelCreateGroup = document.getElementById('cancelCreateGroup');
const confirmCreateGroup = document.getElementById('confirmCreateGroup');
const requestBadge = document.getElementById('requestBadge');
const sidebarUsername = document.getElementById('sidebarUsername');
const sidebarAvatar = document.getElementById('sidebarAvatar');
const activeChatTitle = document.getElementById('activeChatTitle');
const chatStatus = document.getElementById('chatStatus');
const dmHeading = document.getElementById('dmHeading');
const groupMemberSection = document.getElementById('groupMemberSection');
const groupMemberList = document.getElementById('groupMemberList');
const addGroupMemberBtn = document.getElementById('addGroupMemberBtn');
const addGroupMemberModal = document.getElementById('addGroupMemberModal');
const addGroupMemberSelect = document.getElementById('addGroupMemberSelect');
const addGroupMemberStatus = document.getElementById('addGroupMemberStatus');
const cancelAddGroupMember = document.getElementById('cancelAddGroupMember');
const confirmAddGroupMember = document.getElementById('confirmAddGroupMember');
const blockedPanel = document.getElementById('blockedPanel');
const blockedList = document.getElementById('blockedList');
const chatActions = document.getElementById('chatActions');
const removeFriendBtn = document.getElementById('removeFriendBtn');
const blockFriendBtn = document.getElementById('blockFriendBtn');
const deleteServerBtn = document.getElementById('deleteServerBtn');

const STORAGE_TOKEN = 'chatGateToken';
const STORAGE_PASSKEYS = 'chatGatePasskeys';
const STORAGE_DND = 'chatGateDnd';
const API_BASE = '/api';

let pendingPasskeyUsername = '';
let pendingPasskeyValue = '';
let pendingAuthUser = null;
let pendingAuthMessage = '';

let currentUser = null;
let selectedGroupId = null;
let activeChatFriend = null;
let chatMode = 'dm';
let activeNavView = 'friends';
let cachedFriends = [];
let cachedServers = [];
let cachedRequests = [];
let cachedBlocked = [];
let cachedMessages = [];
const POLL_TICK_MS = 200;
const POLL_MESSAGES_MS = 250;
const POLL_MESSAGES_IDLE_MS = 3000;
const STORAGE_MESSAGE_CACHE = 'chatGateMessageCache';
const MAX_STORED_MESSAGES_PER_CHAT = 80;
const POLL_TYPING_MS = 1200;
const POLL_FRIENDS_MS = 15000;
const POLL_REQUESTS_MS = 15000;
const POLL_PRESENCE_MS = 20000;
const POLL_HEARTBEAT_MS = 60000;
const POLL_HIDDEN_MULTIPLIER = 3;
const SEARCH_DEBOUNCE_MS = 220;
const USER_SEARCH_DEBOUNCE_MS = 300;
const MAX_MESSAGE_ROW_CACHE = 120;
const VIRTUAL_MESSAGE_THRESHOLD = 100;
const VIRTUAL_ROW_ESTIMATE = 76;
const VIRTUAL_OVERSCAN = 10;
const MAX_RECORD_SECONDS = 20;
const MAX_VOICE_SECONDS = 60;
const MAX_VIDEO_DATA_URL = 3_200_000;
const MAX_VOICE_DATA_URL = 2_500_000;

let recordStream = null;
let recordRecorder = null;
let recordChunks = [];
let recordInterval = null;
let recordSeconds = 0;
let recordedBlob = null;
let callControls = null;
let voiceRecorder = null;
let voiceChunks = [];
let voiceInterval = null;
let voiceSeconds = 0;
let voiceBlob = null;
let micAccessGranted = false;
let pendingProfileAvatar = null;
let contextMenuMessageId = null;
let contextMenuMessage = null;
let cachedPresence = {};
let dndEnabled = false;
let messageSearchQuery = '';
let editingMessageId = null;
let typingDebounce = null;
let gatebotAiEnabled = false;
let pollTimer = null;
let pollLast = { messages: 0, typing: 0, friends: 0, requests: 0, presence: 0, heartbeat: 0 };
const pollInFlight = {};
let tabHidden = false;
let searchDebounceTimer = null;
let userSearchDebounceTimer = null;
let userSearchAbort = null;
const messageCacheByKey = new Map();
let persistStorageTimer = null;
let messageCachesHydrated = false;
let messageSendCtx = null;
let messageSendBuffer = null;
let messageSendLoadPromise = null;
let messageSendUnlocked = false;
let presenceFingerprint = '';
let renderedChatKey = '';
let renderedMessageIds = [];
const messageRowNodes = new Map();
let paintScheduled = false;
let pendingPaint = null;
let sendInFlight = 0;
let virtualScrollEnabled = false;
let virtualScrollRaf = null;
let messageListDelegated = false;

const QUICK_REACTIONS = ['❤️', '😂', '🔥', '👍', '😮'];

let selectedChannelId = null;
let vibeParticles = [];
let vibeFrame = null;

const GROUP_THEME_META = {
  default: { label: 'Classic', emoji: '💬' },
  neon: { label: 'Neon Nights', emoji: '🌃' },
  sunset: { label: 'Sunset', emoji: '🌅' },
  ocean: { label: 'Ocean', emoji: '🌊' },
  matrix: { label: 'Matrix', emoji: '🟩' },
  galaxy: { label: 'Galaxy', emoji: '🌌' },
};

const CHAT_EMOJIS = [
  '😀', '😂', '🥹', '😍', '😎', '🤩', '😭', '😡', '🤔', '😴',
  '👍', '👎', '👋', '🙏', '💪', '✌️', '🤝', '👀', '💀', '🔥',
  '❤️', '💯', '✨', '🎉', '🎮', '🎵', '☕', '🍕', '🌙', '⭐',
  '🌈', '⚡', '🚀', '💬', '💜', '🖤', '🫶', '😊', '🤣', '🥳',
];

const CHAT_STICKERS = [
  '🔥', '💯', '✨', '🎉', '😎', '🤩', '💀', '👻', '🦄', '🌈',
  '💜', '🖤', '🍕', '🎮', '⚡', '🌙', '☄️', '🫶', '💬', '🚀',
  '🥳', '😭', '🤡', '👑', '🐸', '🦋', '🌸', '💎', '🎯', '🏆',
];

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
  hideResetPanel();
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

function getSavedPasskeys() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_PASSKEYS) || '{}');
  } catch {
    return {};
  }
}

function savePasskeyForUser(username, passkey) {
  if (!username || !passkey) return;
  const map = getSavedPasskeys();
  map[username.toLowerCase()] = passkey;
  localStorage.setItem(STORAGE_PASSKEYS, JSON.stringify(map));
}

function getSavedPasskey(username) {
  if (!username) return '';
  return getSavedPasskeys()[username.toLowerCase()] || '';
}

function hideResetPanel() {
  if (!loginReset) return;
  loginReset.hidden = true;
}

function openResetPanel(username) {
  if (!loginReset) return;
  loginReset.hidden = false;
  loginReset.dataset.username = username;
  if (resetPasskey) {
    resetPasskey.value = getSavedPasskey(username);
  }
  if (resetNewPassword) resetNewPassword.value = '';
  if (resetConfirmPassword) resetConfirmPassword.value = '';
}

function showPasskeyModal(username, passkey) {
  if (!passkeyModal || !passkeyDisplay || !passkey) return;
  pendingPasskeyUsername = username;
  pendingPasskeyValue = passkey;
  passkeyDisplay.textContent = passkey;
  if (passkeyModalSave) passkeyModalSave.checked = true;
  passkeyModal.hidden = false;
}

async function closePasskeyModal(saveChoice) {
  if (!passkeyModal) return;
  if (saveChoice && passkeyModalSave?.checked && pendingPasskeyUsername && pendingPasskeyValue) {
    savePasskeyForUser(pendingPasskeyUsername, pendingPasskeyValue);
  }
  passkeyModal.hidden = true;
  pendingPasskeyUsername = '';
  pendingPasskeyValue = '';
  if (pendingAuthUser) {
    const user = pendingAuthUser;
    const message = pendingAuthMessage;
    pendingAuthUser = null;
    pendingAuthMessage = '';
    await enterChat(user, message);
  }
}

async function completeAuth(data, message) {
  saveToken(data.token);
  hideResetPanel();
  if (data.passkey) {
    pendingAuthUser = data.user;
    pendingAuthMessage = message;
    showPasskeyModal(data.user.username, data.passkey);
    return;
  }
  await enterChat(data.user, message);
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

function setCreateGroupStatus(message, type = '') {
  if (!createGroupStatus) return;
  createGroupStatus.textContent = message;
  createGroupStatus.className = `add-friend-status${type ? ` ${type}` : ''}`;
}

function openCreateGroupModal() {
  if (!createGroupModal) return;
  createGroupModal.hidden = false;
  setCreateGroupStatus('');
  if (createGroupInput) {
    createGroupInput.value = '';
    createGroupInput.focus();
  }
}

function closeCreateGroupModal() {
  if (!createGroupModal) return;
  createGroupModal.hidden = true;
}

async function submitCreateGroup() {
  const name = createGroupInput?.value.trim() || '';
  if (!name) {
    setCreateGroupStatus('Enter a group name first.', 'error');
    return;
  }
  if (name.length < 2) {
    setCreateGroupStatus('Group name must be at least 2 characters.', 'error');
    return;
  }
  try {
    const data = await apiFetch('/servers', { method: 'POST', body: { name } });
    cachedServers.push(data.server);
    closeCreateGroupModal();
    selectGroup(data.server.id);
  } catch (error) {
    setCreateGroupStatus(error.message, 'error');
  }
}

async function refreshUserSuggestions(query) {
  if (!userSuggestions) return;
  const q = query.trim();
  if (q.length < 2) {
    userSuggestions.innerHTML = '';
    return;
  }
  if (userSearchAbort) userSearchAbort.abort();
  userSearchAbort = new AbortController();
  try {
    const data = await apiFetch(`/users/search?q=${encodeURIComponent(q)}`, {
      signal: userSearchAbort.signal,
    });
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
    if (error.name === 'AbortError') return;
    userSuggestions.innerHTML = '';
  }
}

function showChatStatus(message, isError = false) {
  if (!chatStatus) return;
  chatStatus.textContent = message;
  chatStatus.className = `chat-status${isError ? ' error' : message ? ' success' : ''}`;
}

function getUserLabel(user) {
  return user?.displayName || user?.username || 'You';
}

function renderAvatarElement(element, user) {
  if (!element || !user) return;
  element.innerHTML = '';
  if (user.avatar) {
    const img = document.createElement('img');
    img.src = user.avatar;
    img.alt = getUserLabel(user);
    element.appendChild(img);
    return;
  }
  element.textContent = getUserLabel(user).slice(0, 2).toUpperCase();
}

function loadDndPreference() {
  return localStorage.getItem(STORAGE_DND) === '1';
}

function saveDndPreference(enabled) {
  localStorage.setItem(STORAGE_DND, enabled ? '1' : '0');
}

function getDesiredPresenceStatus() {
  return dndEnabled ? 'dnd' : 'online';
}

function updateDndUi() {
  const btn = document.getElementById('profileDndBtn');
  if (btn) {
    btn.classList.toggle('active', dndEnabled);
    btn.setAttribute('aria-pressed', dndEnabled ? 'true' : 'false');
    btn.title = dndEnabled ? 'Do Not Disturb is on' : 'Do Not Disturb';
  }
  updateSelfPresenceDot();
}

function updateSelfPresenceDot(self) {
  const dot = document.getElementById('sidebarSelfPresence');
  if (!dot) return;
  let status = 'online';
  if (dndEnabled) status = 'dnd';
  else if (self?.status === 'idle') status = 'idle';
  else if (self?.status === 'offline') status = 'offline';
  dot.className = `sidebar-self-presence ${status}`;
}

async function toggleDoNotDisturb() {
  dndEnabled = !dndEnabled;
  saveDndPreference(dndEnabled);
  updateDndUi();
  try {
    await apiFetch('/presence', { method: 'POST', body: { status: getDesiredPresenceStatus() } });
  } catch {
    // ignore presence errors
  }
}

function updateProfilePanel() {
  if (!currentUser) return;
  const label = getUserLabel(currentUser);
  currentUserLabel.innerHTML = `Logged in as <strong>${label}</strong>`;
  profileUsername.textContent = label;
  if (sidebarUsername) sidebarUsername.textContent = label;
  renderAvatarElement(sidebarAvatar, currentUser);
  const hint = document.getElementById('sidebarProfileHint');
  if (hint) {
    hint.textContent = dndEnabled
      ? 'Do Not Disturb'
      : currentUser.bio
        ? currentUser.bio.slice(0, 42)
        : 'Edit profile';
  }
  updateSelfPresenceDot();
}

function openProfileModal() {
  const modal = document.getElementById('profileModal');
  const nameInput = document.getElementById('profileDisplayName');
  const bioInput = document.getElementById('profileBio');
  const status = document.getElementById('profileEditStatus');
  if (!modal || !currentUser) return;
  pendingProfileAvatar = currentUser.avatar || '';
  if (nameInput) nameInput.value = currentUser.displayName || currentUser.username;
  if (bioInput) bioInput.value = currentUser.bio || '';
  renderAvatarElement(document.getElementById('profileEditAvatar'), {
    ...currentUser,
    avatar: pendingProfileAvatar,
  });
  if (status) {
    status.textContent = '';
    status.className = 'profile-edit-status';
  }
  updateDndUi();
  modal.hidden = false;
}

function closeProfileModal() {
  const modal = document.getElementById('profileModal');
  if (modal) modal.hidden = true;
  pendingProfileAvatar = null;
}

async function saveProfile() {
  const nameInput = document.getElementById('profileDisplayName');
  const bioInput = document.getElementById('profileBio');
  const status = document.getElementById('profileEditStatus');
  const displayName = nameInput?.value.trim() || '';
  const bio = bioInput?.value.trim() || '';
  if (!displayName || displayName.length < 2) {
    if (status) {
      status.textContent = 'Display name must be at least 2 characters.';
      status.className = 'profile-edit-status error';
    }
    return;
  }
  try {
    const body = { displayName, bio };
    if (pendingProfileAvatar !== null) {
      if (pendingProfileAvatar) body.avatar = pendingProfileAvatar;
      else body.removeAvatar = true;
    }
    const data = await apiFetch('/profile', { method: 'PATCH', body });
    currentUser = data.user;
    updateProfilePanel();
    if (status) {
      status.textContent = 'Profile saved.';
      status.className = 'profile-edit-status success';
    }
    setTimeout(closeProfileModal, 700);
  } catch (error) {
    if (status) {
      status.textContent = error.message;
      status.className = 'profile-edit-status error';
    }
  }
}

function namesMatch(a, b) {
  return String(a || '').toLowerCase() === String(b || '').toLowerCase();
}

function getActiveGroup() {
  return cachedServers.find((server) => server.id === selectedGroupId) || null;
}

function isVibeActive() {
  const group = getActiveGroup();
  if (chatMode === 'group' && group) return Boolean(group.vibeMode);
  return true;
}

function applyGroupTheme() {
  const panel = document.getElementById('friendsPanel');
  const group = getActiveGroup();
  if (!panel) return;
  panel.classList.remove('vibe-active');
  if (chatMode === 'group' && group) {
    panel.dataset.groupTheme = group.theme || 'default';
    if (group.vibeMode) panel.classList.add('vibe-active');
  } else {
    delete panel.dataset.groupTheme;
    panel.classList.add('vibe-active');
  }
}

function updateCoolBar() {
  const themeBtn = document.getElementById('themeGroupBtn');
  const vibeBtn = document.getElementById('vibeToggleBtn');
  const group = getActiveGroup();
  const inGroup = chatMode === 'group' && selectedGroupId;
  const isOwner = group && namesMatch(group.owner, currentUser?.username);
  if (themeBtn) themeBtn.hidden = !isOwner;
  if (vibeBtn) {
    vibeBtn.hidden = !inGroup;
    vibeBtn.classList.toggle('active', Boolean(group?.vibeMode));
    vibeBtn.textContent = group?.vibeMode ? '✨' : '💤';
  }
}

function renderChannels() {
  const bar = document.getElementById('channelBar');
  const list = document.getElementById('channelList');
  const addBtn = document.getElementById('addChannelBtn');
  const group = getActiveGroup();
  if (!bar || !list) return;
  if (chatMode !== 'group' || !group) {
    bar.hidden = true;
    return;
  }
  bar.hidden = false;
  const channels = group.channels?.length
    ? group.channels
    : [{ id: `${group.id}-general`, name: 'general' }];
  if (!selectedChannelId || !channels.some((channel) => channel.id === selectedChannelId)) {
    selectedChannelId = channels[0].id;
  }
  list.innerHTML = '';
  channels.forEach((channel) => {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = `channel-tab${selectedChannelId === channel.id ? ' active' : ''}`;
    button.textContent = `#${channel.name}`;
    button.addEventListener('click', () => selectChannel(channel.id));
    list.appendChild(button);
  });
  if (addBtn) {
    addBtn.hidden = !namesMatch(group.owner, currentUser?.username);
  }
}

function selectChannel(channelId) {
  persistChatCache();
  selectedChannelId = channelId;
  renderChannels();
  renderMessagesForActiveChat();
  kickMessagePoll();
}

async function updateGroupSettings(updates) {
  if (!selectedGroupId) return;
  const data = await apiFetch(`/servers/${selectedGroupId}/settings`, {
    method: 'PATCH',
    body: updates,
  });
  const index = cachedServers.findIndex((server) => server.id === selectedGroupId);
  if (index >= 0) cachedServers[index] = data.server;
  applyGroupTheme();
  updateCoolBar();
}

function openThemeModal() {
  const modal = document.getElementById('themeModal');
  const grid = document.getElementById('themeGrid');
  const group = getActiveGroup();
  if (!modal || !grid || !group) return;
  grid.innerHTML = '';
  Object.entries(GROUP_THEME_META).forEach(([key, meta]) => {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = `theme-option${group.theme === key ? ' active' : ''}`;
    button.innerHTML = `<span class="theme-option-emoji">${meta.emoji}</span><strong>${meta.label}</strong>`;
    button.addEventListener('click', async () => {
      await updateGroupSettings({ theme: key });
      grid.querySelectorAll('.theme-option').forEach((el) => el.classList.remove('active'));
      button.classList.add('active');
      showChatStatus(`Theme set to ${meta.label}.`);
      setTimeout(() => showChatStatus(''), 2000);
    });
    grid.appendChild(button);
  });
  modal.hidden = false;
}

function closeThemeModal() {
  const modal = document.getElementById('themeModal');
  if (modal) modal.hidden = true;
}

async function toggleVibeMode() {
  const group = getActiveGroup();
  if (!group) return;
  const isOwner = namesMatch(group.owner, currentUser?.username);
  const next = !group.vibeMode;
  if (isOwner) {
    await updateGroupSettings({ vibeMode: next });
  } else {
    const index = cachedServers.findIndex((server) => server.id === selectedGroupId);
    if (index >= 0) cachedServers[index] = { ...group, vibeMode: next };
    applyGroupTheme();
    updateCoolBar();
  }
  showChatStatus(next ? '✨ Vibe mode ON' : 'Vibe mode off');
  setTimeout(() => showChatStatus(''), 2000);
  if (next) triggerVibeBurst('✨');
}

async function refreshGateBotStatus() {
  try {
    const data = await apiFetch('/gatebot/status');
    gatebotAiEnabled = Boolean(data.enabled);
    const openGateBotChatBtn = document.getElementById('openGateBotChatBtn');
    if (openGateBotChatBtn) {
      openGateBotChatBtn.title = gatebotAiEnabled
        ? `GateBot AI online (${data.provider || 'AI'} · ${data.model || ''})`
        : 'GateBot — fun commands work; AI needs API key on Vercel';
    }
  } catch {
    gatebotAiEnabled = false;
  }
}

function askGateBot() {
  selectGateBot();
  if (!gatebotAiEnabled) {
    showChatStatus('AI needs API key on Vercel. Fun commands work now — try /help', false);
    setTimeout(() => showChatStatus(''), 4000);
  }
  if (messageInput) {
    messageInput.value = '';
    messageInput.placeholder = 'Ask GateBot anything...';
    messageInput.focus();
  }
}

function initVibeCanvas() {
  const canvas = document.getElementById('vibeCanvas');
  const panel = document.getElementById('friendsPanel');
  if (!canvas || !panel) return;

  const resize = () => {
    canvas.width = panel.clientWidth;
    canvas.height = panel.clientHeight;
  };
  resize();
  window.addEventListener('resize', resize);

  const ctx = canvas.getContext('2d');
  const loop = () => {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    vibeParticles = vibeParticles.filter((particle) => particle.life > 0);
    if (!vibeParticles.length) {
      vibeFrame = null;
      return;
    }
    vibeParticles.forEach((particle) => {
      particle.x += particle.vx;
      particle.y += particle.vy;
      particle.vy += 0.03;
      particle.life -= 1;
      ctx.globalAlpha = Math.max(0, particle.life / 60);
      ctx.font = `${particle.size}px sans-serif`;
      ctx.fillText(particle.emoji, particle.x, particle.y);
    });
    ctx.globalAlpha = 1;
    vibeFrame = requestAnimationFrame(loop);
  };
  window.vibeLoop = loop;
}

function startVibeLoop() {
  if (!window.vibeLoop || vibeFrame) return;
  vibeFrame = requestAnimationFrame(window.vibeLoop);
}

function triggerVibeBurst(emoji = '✨') {
  if (!isVibeActive()) return;
  const canvas = document.getElementById('vibeCanvas');
  if (!canvas) return;
  const count = emoji === '🔥' ? 14 : 10;
  for (let i = 0; i < count; i += 1) {
    vibeParticles.push({
      emoji: emoji === '✨' ? ['✨', '💫', '⭐'][i % 3] : emoji,
      x: canvas.width * (0.3 + Math.random() * 0.4),
      y: canvas.height * (0.45 + Math.random() * 0.2),
      vx: (Math.random() - 0.5) * 4,
      vy: -2 - Math.random() * 3,
      size: 14 + Math.random() * 16,
      life: 50 + Math.floor(Math.random() * 30),
    });
  }
  startVibeLoop();
}

async function addGroupChannel() {
  if (!selectedGroupId) return;
  const name = prompt('New channel name (e.g. gaming)');
  if (!name) return;
  try {
    const data = await apiFetch(`/servers/${selectedGroupId}/channels`, {
      method: 'POST',
      body: { name: name.trim() },
    });
    const index = cachedServers.findIndex((server) => server.id === selectedGroupId);
    if (index >= 0) cachedServers[index] = data.server;
    selectChannel(data.channel.id);
    renderChannels();
    showChatStatus(`Created #${data.channel.name}`);
    setTimeout(() => showChatStatus(''), 2000);
  } catch (error) {
    showChatStatus(error.message, true);
  }
}

function initCoolFeatures() {
  const themeBtn = document.getElementById('themeGroupBtn');
  const vibeBtn = document.getElementById('vibeToggleBtn');
  const addChannelBtn = document.getElementById('addChannelBtn');
  const closeThemeBtn = document.getElementById('closeThemeModalBtn');
  const themeModal = document.getElementById('themeModal');

  if (themeBtn) themeBtn.addEventListener('click', openThemeModal);
  if (vibeBtn) vibeBtn.addEventListener('click', toggleVibeMode);
  const openGateBotChatBtn = document.getElementById('openGateBotChatBtn');
  if (openGateBotChatBtn) openGateBotChatBtn.addEventListener('click', askGateBot);
  if (addChannelBtn) addChannelBtn.addEventListener('click', addGroupChannel);
  if (closeThemeBtn) closeThemeBtn.addEventListener('click', closeThemeModal);
  if (themeModal) {
    themeModal.addEventListener('click', (event) => {
      if (event.target === themeModal) closeThemeModal();
    });
  }
  initVibeCanvas();
}

function canSendMessage() {
  return (
    activeNavView === 'friends' &&
    ((chatMode === 'dm' && activeChatFriend) ||
      (chatMode === 'group' && selectedGroupId) ||
      chatMode === 'gatebot')
  );
}

function updateGateBotSidebarHighlight() {
  const item = document.getElementById('gatebotSidebarItem');
  if (item) item.classList.toggle('active', chatMode === 'gatebot');
}

function selectGateBot() {
  persistChatCache();
  chatMode = 'gatebot';
  activeChatFriend = null;
  selectedGroupId = null;
  selectedChannelId = null;
  document.querySelectorAll('#friendList .chat-list-item').forEach((el) => el.classList.remove('active'));
  renderGroups(cachedServers);
  renderChannels();
  applyGroupTheme();
  updateCoolBar();
  switchNavView('friends');
  updateSidebarMode();
  updateGateBotSidebarHighlight();
  updateActiveChatHeader();
  updateMessageFormVisibility();
  closeDrawer();
  showChatStatus('');
  renderMessagesForActiveChat();
  kickMessagePoll();
}

function updateMessageFormVisibility() {
  const composerWrap = document.getElementById('composerWrap');
  const hidden = !canSendMessage();
  if (messageForm) messageForm.hidden = hidden;
  if (composerWrap) composerWrap.hidden = hidden;
  if (hidden) closeMessagePickers();
}

function updateSidebarMode() {
  const inGroup = chatMode === 'group' && selectedGroupId;
  const group = getActiveGroup();
  const isOwner = group && namesMatch(group.owner, currentUser?.username);
  const gatebotSidebarList = document.getElementById('gatebotSidebarList');
  if (dmHeading) dmHeading.hidden = inGroup;
  if (friendList) friendList.hidden = inGroup;
  if (gatebotSidebarList) gatebotSidebarList.hidden = inGroup;
  if (groupMemberSection) groupMemberSection.hidden = !inGroup;
  if (addGroupMemberBtn) addGroupMemberBtn.hidden = !isOwner;
  if (inGroup) renderGroupMembers();
  updateGateBotSidebarHighlight();
}

function clearActiveChat() {
  activeChatFriend = null;
  chatMode = 'dm';
  cachedMessages = [];
  resetMessageRenderer();
  updateGateBotSidebarHighlight();
  if (messageInput) messageInput.value = '';
  document.querySelectorAll('.chat-list-item, .chat-list li').forEach((el) => {
    el.classList.remove('active');
  });
  updateActiveChatHeader();
  updateMessageFormVisibility();
  if (messageList) {
    messageList.innerHTML =
      '<div class="message-row"><div class="message-bubble">Select a friend from Direct Messages to chat.</div></div>';
  }
}

function updateActiveChatHeader() {
  if (!activeChatTitle) return;
  if (chatMode === 'gatebot') {
    activeChatTitle.textContent = 'GateBot';
  } else if (chatMode === 'group' && selectedGroupId) {
    const group = getActiveGroup();
    const channel = group?.channels?.find((item) => item.id === selectedChannelId);
    activeChatTitle.textContent = channel ? `${group?.name || 'Group'} · #${channel.name}` : group?.name || 'Group';
  } else if (activeChatFriend) {
    activeChatTitle.textContent = activeChatFriend.name;
  } else {
    activeChatTitle.textContent = 'Friends';
  }
  const callFriendBtn = document.getElementById('callFriendBtn');
  if (callFriendBtn) callFriendBtn.hidden = chatMode !== 'dm' || !activeChatFriend;
  if (chatActions) chatActions.hidden = chatMode !== 'dm' || !activeChatFriend;
  if (messageInput) {
    messageInput.placeholder =
      chatMode === 'gatebot' ? 'Ask GateBot anything, or /help' : 'Message...';
  }
  if (addFriendBtn) {
    addFriendBtn.hidden =
      chatMode === 'group' || chatMode === 'gatebot' || Boolean(activeChatFriend && activeNavView === 'friends');
  }
  const chatActionBar = document.getElementById('chatActionBar');
  if (chatActionBar) {
    chatActionBar.hidden = chatMode !== 'dm' || !activeChatFriend || activeNavView !== 'friends';
  }
  updateMessageFormVisibility();
  callControls?.updateCallButton();
}

function updateServerActions() {
  if (!deleteServerBtn) return;
  const currentServer = getActiveGroup();
  const isOwner = currentServer && namesMatch(currentServer.owner, currentUser?.username);
  deleteServerBtn.hidden = !(chatMode === 'group' && isOwner && activeNavView === 'friends');
}

function updateRequestBadge() {
  if (!requestBadge) return;
  const count = cachedRequests.length;
  if (count > 0) {
    requestBadge.hidden = false;
    requestBadge.textContent = String(count);
  } else {
    requestBadge.hidden = true;
  }
}

function selectFriend(friend) {
  persistChatCache();
  chatMode = 'dm';
  selectedChannelId = null;
  activeChatFriend = friend;
  updateGateBotSidebarHighlight();
  renderChannels();
  applyGroupTheme();
  updateCoolBar();
  document.querySelectorAll('#friendList .chat-list-item').forEach((el) => {
    el.classList.toggle('active', el.dataset.id === String(friend.id));
  });
  switchNavView('friends');
  updateSidebarMode();
  updateActiveChatHeader();
  closeDrawer();
  showChatStatus('');
  updateMessageFormVisibility();
  renderMessagesForActiveChat();
  kickMessagePoll();
}

async function switchNavView(view, { fromNav = false } = {}) {
  activeNavView = view;
  if (view === 'friends' && fromNav) {
    chatMode = 'dm';
    selectedGroupId = null;
    selectedChannelId = null;
    renderGroups(cachedServers);
    renderChannels();
    applyGroupTheme();
    updateCoolBar();
  }
  if (navMenu) {
    navMenu.querySelectorAll('.menu-item').forEach((item) => {
      item.classList.toggle('active', item.dataset.nav === view);
    });
  }
  if (friendsNav) friendsNav.hidden = view !== 'friends';
  if (requestsNav) requestsNav.hidden = view !== 'requests';
  if (blockedNav) blockedNav.hidden = view !== 'blocked';
  if (friendsPanel) friendsPanel.hidden = view !== 'friends';
  if (requestsPanel) requestsPanel.hidden = view !== 'requests';
  if (blockedPanel) blockedPanel.hidden = view !== 'blocked';
  if (view === 'requests') {
    await refreshRequests();
    renderFriendRequests();
    closeDrawer();
  } else if (view === 'blocked') {
    await refreshBlocked();
    renderBlockedUsers();
    closeDrawer();
  } else {
    updateActiveChatHeader();
    updateServerActions();
    updateSidebarMode();
    if (chatMode === 'gatebot') {
      if (cachedMessages.length) flushPaintMessages(cachedMessages, { force: true, instant: true });
      else await renderMessagesForActiveChat({ showLoading: true });
    } else if (chatMode === 'group' && selectedGroupId) {
      if (cachedMessages.length) flushPaintMessages(cachedMessages, { force: true, instant: true });
      else await renderMessagesForActiveChat({ showLoading: true });
    } else if (activeChatFriend && cachedMessages.length) {
      flushPaintMessages(cachedMessages, { force: true, instant: true });
    } else {
      await renderMessagesForActiveChat({ showLoading: true });
    }
    kickMessagePoll();
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
        <button class="btn secondary small danger block-request" type="button">Block</button>
      </div>
    `;
    li.querySelector('.accept-request').addEventListener('click', () => acceptFriendRequest(request.id));
    li.querySelector('.decline-request').addEventListener('click', () => declineFriendRequest(request.id));
    li.querySelector('.block-request').addEventListener('click', () => blockUser(request.from, true));
    requestList.appendChild(li);
  });
}

async function refreshRequests() {
  const data = await apiFetch('/requests');
  cachedRequests = data.requests;
  updateRequestBadge();
  if (activeNavView === 'requests') renderFriendRequests();
}

function friendsChanged(previous, next) {
  if (previous.length !== next.length) return true;
  const prevNames = previous.map((friend) => friend.name).sort().join('\0');
  const nextNames = next.map((friend) => friend.name).sort().join('\0');
  return prevNames !== nextNames;
}

async function refreshFriends() {
  const data = await apiFetch('/friends');
  const nextFriends = data.friends;
  if (!friendsChanged(cachedFriends, nextFriends)) return;

  const previousNames = new Set(cachedFriends.map((friend) => friend.name));
  const addedFriends = nextFriends.filter((friend) => !previousNames.has(friend.name));

  cachedFriends = nextFriends;
  renderFriends(cachedFriends);

  if (activeChatFriend) {
    const stillActive = nextFriends.find((friend) => friend.name === activeChatFriend.name);
    if (stillActive) {
      activeChatFriend = stillActive;
    } else {
      clearActiveChat();
    }
  }

  if (addedFriends.length && activeNavView === 'friends') {
    const names = addedFriends.map((friend) => friend.name).join(', ');
    showChatStatus(`You are now friends with ${names}.`);
  }
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
    await switchNavView('friends');
    const acceptedFriend = cachedFriends.find((friend) => friend.name === data.request.from);
    if (acceptedFriend) selectFriend(acceptedFriend);
    showChatStatus('');
  } catch (error) {
    showChatStatus(error.message, true);
  }
}

async function refreshBlocked() {
  const data = await apiFetch('/users/blocked');
  cachedBlocked = data.blocked;
  if (activeNavView === 'blocked') renderBlockedUsers();
}

function renderBlockedUsers() {
  if (!blockedList) return;
  blockedList.innerHTML = '';
  if (!cachedBlocked.length) {
    blockedList.innerHTML = '<li class="request-empty">No blocked users.</li>';
    return;
  }
  cachedBlocked.forEach((entry) => {
    const li = document.createElement('li');
    li.className = 'request-item';
    li.innerHTML = `
      <div class="request-avatar">${entry.username.slice(0, 2).toUpperCase()}</div>
      <div class="request-details">
        <strong>${entry.username}</strong>
        <span>Blocked user</span>
      </div>
      <div class="request-actions">
        <button class="btn secondary small unblock-user" type="button">Unblock</button>
      </div>
    `;
    li.querySelector('.unblock-user').addEventListener('click', () => unblockUser(entry.username));
    blockedList.appendChild(li);
  });
}

async function removeFriend(username) {
  if (!username) return;
  if (!confirm(`Remove ${username} from your friends?`)) return;
  try {
    const data = await apiFetch('/friends/remove', { method: 'POST', body: { username } });
    cachedFriends = data.friends;
    if (activeChatFriend && activeChatFriend.name.toLowerCase() === username.toLowerCase()) {
      clearActiveChat();
    }
    renderFriends(cachedFriends);
    showChatStatus(`Removed ${data.removed} from friends.`);
    setTimeout(() => showChatStatus(''), 3000);
  } catch (error) {
    showChatStatus(error.message, true);
  }
}

async function blockUser(username, fromRequest = false) {
  if (!username) return;
  const action = fromRequest ? `Block ${username}?` : `Block ${username}? They cannot message you or send requests.`;
  if (!confirm(action)) return;
  try {
    await apiFetch('/users/block', { method: 'POST', body: { username } });
    if (activeChatFriend && activeChatFriend.name.toLowerCase() === username.toLowerCase()) {
      clearActiveChat();
    }
    cachedFriends = (await apiFetch('/friends')).friends;
    await refreshRequests();
    await refreshBlocked();
    renderFriends(cachedFriends);
    if (activeNavView === 'requests') renderFriendRequests();
    showChatStatus(`Blocked ${username}.`);
    setTimeout(() => showChatStatus(''), 3000);
  } catch (error) {
    showChatStatus(error.message, true);
  }
}

async function unblockUser(username) {
  try {
    await apiFetch('/users/unblock', { method: 'POST', body: { username } });
    await refreshBlocked();
    showChatStatus(`Unblocked ${username}.`);
  } catch (error) {
    showChatStatus(error.message, true);
  }
}

async function deleteCurrentServer() {
  if (!selectedGroupId) return;
  const server = getActiveGroup();
  if (!server) return;
  if (!confirm(`Delete group "${server.name}"? All group messages will be removed.`)) return;
  try {
    const data = await apiFetch(`/servers/${selectedGroupId}`, { method: 'DELETE' });
    cachedServers = data.servers;
    selectedGroupId = null;
    selectedChannelId = null;
    chatMode = 'dm';
    cachedMessages = [];
    renderServers(cachedServers);
    renderChannels();
    applyGroupTheme();
    updateCoolBar();
    updateSidebarMode();
    updateActiveChatHeader();
    updateServerActions();
    updateMessageFormVisibility();
    if (activeChatFriend) {
      await renderMessagesForActiveChat({ showLoading: false });
    } else if (messageList) {
      messageList.innerHTML =
        '<div class="message-row"><div class="message-bubble">Select a friend or group to start chatting.</div></div>';
    }
    showChatStatus(`Deleted group ${server.name}.`);
  } catch (error) {
    showChatStatus(error.message, true);
  }
}

async function declineFriendRequest(requestId) {
  try {
    await apiFetch(`/requests/${requestId}/decline`, { method: 'POST' });
    await refreshRequests();
    renderFriendRequests();
  } catch (error) {
    showChatStatus(error.message, true);
  }
}

function formatLastSeen(value) {
  if (!value) return 'a while ago';
  const diff = Date.now() - new Date(value).getTime();
  if (diff < 60_000) return 'just now';
  if (diff < 3_600_000) return `${Math.max(1, Math.floor(diff / 60_000))}m ago`;
  if (diff < 86_400_000) return `${Math.max(1, Math.floor(diff / 3_600_000))}h ago`;
  return new Date(value).toLocaleDateString();
}

function getFriendPresence(name) {
  return cachedPresence[String(name || '').toLowerCase()] || null;
}

function presenceSubtitle(name) {
  const presence = getFriendPresence(name);
  if (!presence) return 'Tap to chat';
  if (presence.status === 'online') return 'Online';
  if (presence.status === 'idle') return 'Idle';
  if (presence.status === 'dnd') return 'Do Not Disturb';
  if (presence.lastSeen) return `Last seen ${formatLastSeen(presence.lastSeen)}`;
  return 'Offline';
}

function presenceStatusClass(name) {
  const presence = getFriendPresence(name);
  return presence?.status || 'offline';
}

function getFilteredFriends(friends) {
  const query = messageSearchQuery.trim().toLowerCase();
  if (!query) return friends;
  return friends.filter((friend) => friend.name.toLowerCase().includes(query));
}

function updateFriendsSearchFilter() {
  if (!friendList) return;
  const query = messageSearchQuery.trim().toLowerCase();
  const items = friendList.querySelectorAll('.chat-list-item[data-friend-name]');
  if (!items.length) {
    renderFriends(cachedFriends);
    return;
  }
  let visibleCount = 0;
  items.forEach((item) => {
    const name = item.dataset.friendName || '';
    const show = !query || name.toLowerCase().includes(query);
    item.hidden = !show;
    if (show) visibleCount += 1;
  });
  const empty = friendList.querySelector('.chat-list-empty');
  if (empty) empty.hidden = visibleCount > 0;
}

function renderFriends(friends) {
  friendList.innerHTML = '';
  const visible = getFilteredFriends(friends);
  if (!visible.length) {
    friendList.innerHTML = messageSearchQuery.trim()
      ? '<li class="chat-list-empty">No friends match your search.</li>'
      : '<li class="chat-list-empty">No chats yet. Add a friend to start talking.</li>';
    return;
  }
  visible.forEach((friend) => {
    const li = document.createElement('li');
    li.className = 'chat-list-item';
    li.dataset.friendName = friend.name;
    if (activeChatFriend && activeChatFriend.id === friend.id) {
      li.classList.add('active');
    }
    const statusClass = presenceStatusClass(friend.name);
    li.innerHTML = `
      <button class="chat-row-main" type="button">
        <div class="chat-avatar-wrap">
          <div class="chat-avatar">${friend.name.slice(0, 2).toUpperCase()}</div>
          <span class="presence-dot ${statusClass}" aria-hidden="true"></span>
        </div>
        <div class="chat-item-details">
          <strong>${friend.name}</strong>
          <span>${presenceSubtitle(friend.name)}</span>
        </div>
      </button>
      <button class="friend-remove-btn" type="button">Remove</button>
    `;
    li.dataset.id = friend.id;
    li.querySelector('.chat-row-main').addEventListener('click', () => selectFriend(friend));
    li.querySelector('.friend-remove-btn').addEventListener('click', (event) => {
      event.stopPropagation();
      removeFriend(friend.name);
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
    const wrap = document.createElement('div');
    wrap.className = 'group-item-wrap';

    const badge = document.createElement('button');
    badge.type = 'button';
    badge.className = `group-item${selectedGroupId === server.id ? ' selected' : ''}`;
    badge.textContent = server.name.slice(0, 2).toUpperCase();
    badge.title = server.name;
    badge.dataset.id = server.id;
    badge.addEventListener('click', () => selectGroup(server.id));

    wrap.appendChild(badge);

    if (selectedGroupId === server.id && namesMatch(server.owner, currentUser?.username)) {
      const deleteBtn = document.createElement('button');
      deleteBtn.type = 'button';
      deleteBtn.className = 'group-delete-btn';
      deleteBtn.title = `Delete ${server.name}`;
      deleteBtn.setAttribute('aria-label', `Delete ${server.name}`);
      deleteBtn.textContent = '×';
      deleteBtn.addEventListener('click', (event) => {
        event.stopPropagation();
        deleteCurrentServer();
      });
      wrap.appendChild(deleteBtn);
    }

    groupIconList.appendChild(wrap);
  });
}

async function loadCommunity() {
  const data = await apiFetch('/community');
  cachedFriends = data.friends;
  cachedServers = data.servers;
  cachedRequests = data.requests;
  cachedBlocked = data.blocked;
  renderFriends(cachedFriends);
  renderServers(cachedServers);
  updateRequestBadge();
}

function autoSelectDefault() {
  if (cachedFriends.length && !activeChatFriend && chatMode !== 'group') {
    selectFriend(cachedFriends[0]);
  }
}

function renderGroupMembers() {
  if (!groupMemberList) return;
  const group = getActiveGroup();
  groupMemberList.innerHTML = '';
  const members = group?.members?.length ? group.members : group?.owner ? [group.owner] : [];
  if (!members.length) {
    groupMemberList.innerHTML = '<li class="chat-list-empty">No members yet. Add a friend.</li>';
    return;
  }
  members.forEach((name) => {
    const li = document.createElement('li');
    li.className = 'chat-list-item group-member-item';
    const label = namesMatch(name, currentUser?.username) ? `${name} (you)` : name;
    li.innerHTML = `
      <div class="chat-row-main">
        <div class="chat-avatar">${name.slice(0, 2).toUpperCase()}</div>
        <div class="chat-item-details">
          <strong>${label}</strong>
          <span>${namesMatch(name, group?.owner) ? 'Owner' : 'Member'}</span>
        </div>
      </div>
    `;
    groupMemberList.appendChild(li);
  });
}

function selectGroup(groupId) {
  persistChatCache();
  selectedGroupId = groupId;
  chatMode = 'group';
  activeChatFriend = null;
  const group = cachedServers.find((server) => server.id === groupId);
  selectedChannelId = group?.channels?.[0]?.id || `${groupId}-general`;
  document.querySelectorAll('#friendList .chat-list-item').forEach((el) => el.classList.remove('active'));
  renderGroups(cachedServers);
  renderChannels();
  applyGroupTheme();
  updateCoolBar();
  switchNavView('friends');
  updateSidebarMode();
  updateActiveChatHeader();
  updateServerActions();
  updateMessageFormVisibility();
  closeDrawer();
  showChatStatus('');
  renderMessagesForActiveChat();
  kickMessagePoll();
}

function friendsAvailableForGroup() {
  const group = getActiveGroup();
  const members = new Set((group?.members || []).map((name) => name.toLowerCase()));
  return cachedFriends.filter((friend) => !members.has(friend.name.toLowerCase()));
}

function openAddGroupMemberModal() {
  if (!addGroupMemberModal || !addGroupMemberSelect) return;
  const available = friendsAvailableForGroup();
  addGroupMemberSelect.innerHTML = '';
  if (!available.length) {
    addGroupMemberSelect.innerHTML = '<option value="">No friends left to add</option>';
    if (confirmAddGroupMember) confirmAddGroupMember.disabled = true;
  } else {
    available.forEach((friend) => {
      const option = document.createElement('option');
      option.value = friend.name;
      option.textContent = friend.name;
      addGroupMemberSelect.appendChild(option);
    });
    if (confirmAddGroupMember) confirmAddGroupMember.disabled = false;
  }
  if (addGroupMemberStatus) {
    addGroupMemberStatus.textContent = '';
    addGroupMemberStatus.className = 'add-friend-status';
  }
  addGroupMemberModal.hidden = false;
}

function closeAddGroupMemberModal() {
  if (addGroupMemberModal) addGroupMemberModal.hidden = true;
}

async function addFriendToGroup(username) {
  if (!selectedGroupId || !username) return;
  try {
    const data = await apiFetch(`/servers/${selectedGroupId}/members`, {
      method: 'POST',
      body: { username },
    });
    const index = cachedServers.findIndex((server) => server.id === selectedGroupId);
    if (index >= 0) cachedServers[index] = data.server;
    renderGroups(cachedServers);
    renderGroupMembers();
    closeAddGroupMemberModal();
    showChatStatus(`Added ${username} to the group.`);
    setTimeout(() => showChatStatus(''), 2500);
  } catch (error) {
    if (addGroupMemberStatus) {
      addGroupMemberStatus.textContent = error.message;
      addGroupMemberStatus.className = 'add-friend-status error';
    } else {
      showChatStatus(error.message, true);
    }
  }
}

function getMessagesForDisplay(messages) {
  const query = messageSearchQuery.trim().toLowerCase();
  if (!query) return messages;
  return messages.filter((message) => {
    if (message.content?.toLowerCase().includes(query)) return true;
    if (message.sender?.toLowerCase().includes(query)) return true;
    return false;
  });
}

function buildReactionsRow(message) {
  const reactions = message.reactions || {};
  const entries = Object.entries(reactions).filter(([, users]) => users?.length);
  if (!entries.length) return null;
  const row = document.createElement('div');
  row.className = 'message-reactions';
  entries.forEach(([emoji, users]) => {
    const chip = document.createElement('button');
    chip.type = 'button';
    chip.className = `reaction-chip${
      users.some((name) => namesMatch(name, currentUser?.username)) ? ' mine' : ''
    }`;
    chip.textContent = `${emoji} ${users.length}`;
    chip.title = users.join(', ');
    chip.addEventListener('click', () => toggleMessageReaction(message.id, emoji));
    row.appendChild(chip);
  });
  return row;
}

async function toggleMessageReaction(messageId, emoji) {
  if (!messageId || !emoji) return;
  try {
    const data = await apiFetch(`/messages/${messageId}/reactions`, {
      method: 'POST',
      body: { emoji },
    });
    cachedMessages = cachedMessages.map((message) =>
      message.id === messageId ? data.message : message
    );
    schedulePaintMessages(cachedMessages);
    triggerVibeBurst(emoji);
  } catch (error) {
    showChatStatus(error.message, true);
  }
}

function dedupeMessages(messages) {
  const unique = [];
  const seen = new Set();
  messages.forEach((message) => {
    if (seen.has(message.id)) return;
    seen.add(message.id);
    unique.push(message);
  });
  return unique;
}

function getChatCacheKey() {
  if (chatMode === 'gatebot') return 'gatebot';
  if (chatMode === 'group' && selectedGroupId) {
    return `group:${selectedGroupId}:${selectedChannelId || ''}`;
  }
  if (activeChatFriend) return `dm:${activeChatFriend.id}`;
  return null;
}

function stripMediaForStorage(message) {
  if (!message || !['image', 'video', 'voice'].includes(message.type)) return message;
  const { image, video, audio, ...rest } = message;
  return rest;
}

function loadStoredMessageCaches() {
  if (messageCachesHydrated) return;
  messageCachesHydrated = true;
  try {
    const raw = localStorage.getItem(STORAGE_MESSAGE_CACHE);
    if (!raw) return;
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object') return;
    Object.entries(parsed).forEach(([key, messages]) => {
      if (Array.isArray(messages) && messages.length) {
        messageCacheByKey.set(key, messages);
      }
    });
  } catch {
    // ignore corrupt cache
  }
}

function flushChatCacheToStorage() {
  try {
    const key = getChatCacheKey();
    if (!key || messageSearchQuery.trim()) return;
    const store = JSON.parse(localStorage.getItem(STORAGE_MESSAGE_CACHE) || '{}');
    store[key] = cachedMessages.slice(-MAX_STORED_MESSAGES_PER_CHAT).map(stripMediaForStorage);
    const keys = Object.keys(store);
    if (keys.length > 40) {
      keys.slice(0, keys.length - 40).forEach((oldKey) => delete store[oldKey]);
    }
    localStorage.setItem(STORAGE_MESSAGE_CACHE, JSON.stringify(store));
  } catch {
    // ignore quota errors
  }
}

function persistChatCache() {
  const key = getChatCacheKey();
  if (key && !messageSearchQuery.trim()) {
    messageCacheByKey.set(key, cachedMessages);
  }
  if (persistStorageTimer) clearTimeout(persistStorageTimer);
  persistStorageTimer = setTimeout(flushChatCacheToStorage, 350);
}

function getChatRenderKey() {
  if (messageSearchQuery.trim()) {
    return `search:${messageSearchQuery.trim().toLowerCase()}`;
  }
  return getChatCacheKey() || 'none';
}

function pruneMessageRowNodes(keepIds) {
  if (messageRowNodes.size <= MAX_MESSAGE_ROW_CACHE) return;
  messageRowNodes.forEach((row, id) => {
    if (!keepIds.has(id)) {
      if (row.parentNode) row.remove();
      messageRowNodes.delete(id);
    }
  });
}

function messageDisplaySignature(message) {
  return [
    message.id,
    message.content,
    message.type,
    message.pending ? 1 : 0,
    message.edited_at || '',
    JSON.stringify(message.reactions || {}),
    message.image ? 1 : 0,
    message.video ? 1 : 0,
    message.audio ? 1 : 0,
  ].join('|');
}

function findMessageById(messageId) {
  return cachedMessages.find((message) => message.id === messageId) || null;
}

function isMessagesNearBottom() {
  if (!messageList) return true;
  return messageList.scrollHeight - messageList.scrollTop - messageList.clientHeight < 140;
}

function scrollMessagesToBottom() {
  if (!messageList) return;
  messageList.scrollTop = messageList.scrollHeight;
}

function resetMessageRenderer() {
  if (!messageList) return;
  messageList.innerHTML = '';
  messageRowNodes.clear();
  renderedMessageIds = [];
  renderedChatKey = '';
  virtualScrollEnabled = false;
}

function updateVirtualWindow(displayMessages) {
  if (!messageList || !virtualScrollEnabled) return;
  const total = displayMessages.length;
  const scrollTop = Math.max(0, messageList.scrollTop);
  const viewport = messageList.clientHeight || 0;
  const start = Math.max(0, Math.floor(scrollTop / VIRTUAL_ROW_ESTIMATE) - VIRTUAL_OVERSCAN);
  const visibleCount = Math.ceil(viewport / VIRTUAL_ROW_ESTIMATE) + VIRTUAL_OVERSCAN * 2;
  const end = Math.min(total, start + visibleCount);
  const slice = displayMessages.slice(start, end);
  const sliceIds = new Set(slice.map((message) => message.id));

  const topSpacerId = 'virtual-top-spacer';
  const bottomSpacerId = 'virtual-bottom-spacer';
  let topSpacer = messageList.querySelector(`#${topSpacerId}`);
  let bottomSpacer = messageList.querySelector(`#${bottomSpacerId}`);
  if (!topSpacer) {
    topSpacer = document.createElement('div');
    topSpacer.id = topSpacerId;
    topSpacer.className = 'virtual-spacer';
    messageList.prepend(topSpacer);
  }
  if (!bottomSpacer) {
    bottomSpacer = document.createElement('div');
    bottomSpacer.id = bottomSpacerId;
    bottomSpacer.className = 'virtual-spacer';
    messageList.appendChild(bottomSpacer);
  }
  topSpacer.style.height = `${start * VIRTUAL_ROW_ESTIMATE}px`;
  bottomSpacer.style.height = `${Math.max(0, total - end) * VIRTUAL_ROW_ESTIMATE}px`;

  messageList.querySelectorAll('.message-row[data-message-id]').forEach((row) => {
    if (!sliceIds.has(row.dataset.messageId)) row.remove();
  });

  let anchor = bottomSpacer;
  for (let index = slice.length - 1; index >= 0; index -= 1) {
    const message = slice[index];
    const signature = messageDisplaySignature(message);
    let row = messageRowNodes.get(message.id);
    if (!row || row.dataset.sig !== signature) {
      row = createMessageRow(message);
      messageRowNodes.set(message.id, row);
    }
    if (row.parentNode !== messageList) {
      messageList.insertBefore(row, anchor);
    } else if (row.nextElementSibling !== anchor) {
      messageList.insertBefore(row, anchor);
    }
    anchor = row;
  }

  pruneMessageRowNodes(sliceIds);
  renderedMessageIds = displayMessages.map((message) => message.id);
}

function scheduleVirtualScrollUpdate(displayMessages) {
  if (!virtualScrollEnabled) return;
  if (virtualScrollRaf) cancelAnimationFrame(virtualScrollRaf);
  virtualScrollRaf = requestAnimationFrame(() => {
    virtualScrollRaf = null;
    updateVirtualWindow(displayMessages);
  });
}

function createMessageRow(message) {
  const isBot = namesMatch(message.sender, 'GateBot') || message.isBot;
  const isSelf = !isBot && namesMatch(message.sender, currentUser?.username);
  const row = document.createElement('div');
  row.className = `message-row${isSelf ? ' self' : ''}${isBot ? ' bot-message' : ''}`;
  if (message.type === 'sticker') row.classList.add('sticker-row');
  if (message.type === 'image') row.classList.add('image-row');
  if (message.type === 'video') row.classList.add('video-row');
  if (message.type === 'voice') row.classList.add('voice-row');
  if (message.pending) row.classList.add('pending');
  if (messageSearchQuery.trim()) row.classList.add('search-hit');
  row.dataset.messageId = message.id;
  row.dataset.sig = messageDisplaySignature(message);
  const bubble = buildMessageBubble(message);
  const reactionsRow = buildReactionsRow(message);
  const meta = document.createElement('div');
  meta.className = 'message-meta';
  const time = new Date(message.sent_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  meta.textContent = `${message.sender} · ${time}${message.edited_at ? ' · edited' : ''}`;
  row.appendChild(bubble);
  if (reactionsRow) row.appendChild(reactionsRow);
  const footer = document.createElement('div');
  footer.className = 'message-footer';
  footer.appendChild(meta);
  row.appendChild(footer);
  row.classList.add('message-interactive');
  if (isSelf) row.title = 'Right-click to edit or delete';
  return row;
}

function buildMessageBubble(message) {
  const bubble = document.createElement('div');
  if (message.type === 'image' && message.image) {
    bubble.className = 'message-bubble image-bubble';
    const img = document.createElement('img');
    img.src = message.image;
    img.alt = message.content || 'Shared image';
    img.className = 'message-image';
    img.loading = 'lazy';
    img.decoding = 'async';
    bubble.appendChild(img);
    return bubble;
  }
  if (message.type === 'voice' && message.audio) {
    bubble.className = 'message-bubble voice-bubble';
    const audio = document.createElement('audio');
    audio.src = message.audio;
    audio.className = 'message-audio';
    audio.controls = true;
    audio.preload = 'metadata';
    bubble.appendChild(audio);
    return bubble;
  }
  if (message.type === 'video' && message.video) {
    bubble.className = 'message-bubble video-bubble';
    const video = document.createElement('video');
    video.src = message.video;
    video.className = 'message-video';
    video.controls = true;
    video.playsInline = true;
    video.preload = 'metadata';
    bubble.appendChild(video);
    return bubble;
  }
  if (message.type === 'sticker') {
    bubble.className = 'message-bubble sticker-bubble';
    bubble.textContent = message.content;
    return bubble;
  }
  bubble.className = 'message-bubble';
  bubble.textContent = message.content;
  return bubble;
}

function paintMessages(messages, { force = false, instant = false } = {}) {
  if (!messageList) return;

  const chatKey = getChatRenderKey();
  const displayMessages = getMessagesForDisplay(dedupeMessages(messages));
  const shouldForce = force || chatKey !== renderedChatKey;

  if (!displayMessages.length) {
    resetMessageRenderer();
    renderedChatKey = chatKey;
    messageList.innerHTML = messageSearchQuery.trim()
      ? '<div class="message-row"><div class="message-bubble">No messages match your search.</div></div>'
      : '<div class="message-row"><div class="message-bubble">No messages in this chat yet.</div></div>';
    return;
  }

  const wasNearBottom = isMessagesNearBottom();
  virtualScrollEnabled =
    !messageSearchQuery.trim() && displayMessages.length >= VIRTUAL_MESSAGE_THRESHOLD;

  if (shouldForce) {
    messageRowNodes.clear();
    renderedMessageIds = [];
    renderedChatKey = chatKey;
    if (virtualScrollEnabled) {
      updateVirtualWindow(displayMessages);
    } else {
      const fragment = document.createDocumentFragment();
      displayMessages.forEach((message) => {
        const row = createMessageRow(message);
        messageRowNodes.set(message.id, row);
        fragment.appendChild(row);
      });
      messageList.innerHTML = '';
      messageList.appendChild(fragment);
      renderedMessageIds = displayMessages.map((message) => message.id);
    }
    if (wasNearBottom || shouldForce) scrollMessagesToBottom();
    return;
  }

  if (virtualScrollEnabled) {
    updateVirtualWindow(displayMessages);
    if (wasNearBottom || instant) scrollMessagesToBottom();
    return;
  }

  const nextIds = displayMessages.map((message) => message.id);
  const nextIdSet = new Set(nextIds);

  renderedMessageIds.forEach((id) => {
    if (!nextIdSet.has(id)) {
      messageRowNodes.get(id)?.remove();
      messageRowNodes.delete(id);
    }
  });

  displayMessages.forEach((message, index) => {
    const signature = messageDisplaySignature(message);
    let row = messageRowNodes.get(message.id);
    if (!row) {
      row = createMessageRow(message);
      messageRowNodes.set(message.id, row);
      const nextMessage = displayMessages[index + 1];
      const nextRow = nextMessage ? messageRowNodes.get(nextMessage.id) : null;
      if (nextRow && nextRow.parentNode === messageList) {
        messageList.insertBefore(row, nextRow);
      } else {
        messageList.appendChild(row);
      }
      return;
    }
    if (row.dataset.sig !== signature) {
      const nextRow = createMessageRow(message);
      row.replaceWith(nextRow);
      messageRowNodes.set(message.id, nextRow);
    }
  });

  renderedMessageIds = nextIds;
  if (wasNearBottom || instant) scrollMessagesToBottom();
}

function flushPaintMessages(messages, options = {}) {
  paintScheduled = false;
  pendingPaint = null;
  paintMessages(messages, options);
}

function schedulePaintMessages(messages, options = {}) {
  if (options.instant) {
    flushPaintMessages(messages, options);
    return;
  }
  pendingPaint = { messages, options };
  if (paintScheduled) return;
  paintScheduled = true;
  requestAnimationFrame(() => {
    paintScheduled = false;
    const job = pendingPaint;
    pendingPaint = null;
    if (job) paintMessages(job.messages, job.options);
  });
}

function initMessageListDelegation() {
  if (!messageList || messageListDelegated) return;
  messageListDelegated = true;
  messageList.addEventListener('contextmenu', (event) => {
    const row = event.target.closest('.message-row[data-message-id]');
    if (!row) return;
    const message = findMessageById(row.dataset.messageId);
    if (message) openMessageContextMenu(event, message);
  });
  messageList.addEventListener('scroll', () => {
    if (!virtualScrollEnabled) return;
    scheduleVirtualScrollUpdate(getMessagesForDisplay(dedupeMessages(cachedMessages)));
  }, { passive: true });
}

function closeMessageContextMenu() {
  const menu = document.getElementById('messageContextMenu');
  contextMenuMessageId = null;
  contextMenuMessage = null;
  if (menu) menu.hidden = true;
}

function openMessageContextMenu(event, message) {
  event.preventDefault();
  event.stopPropagation();
  const menu = document.getElementById('messageContextMenu');
  const reactionRow = document.getElementById('contextReactionRow');
  const actionSection = document.getElementById('contextActionSection');
  const editBtn = document.getElementById('contextEditMessageBtn');
  const deleteBtn = document.getElementById('contextDeleteMessageBtn');
  if (!menu || !reactionRow) return;
  contextMenuMessage = message;
  contextMenuMessageId = message.id;
  reactionRow.innerHTML = '';
  QUICK_REACTIONS.forEach((emoji) => {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'context-reaction-btn';
    button.textContent = emoji;
    button.addEventListener('click', async () => {
      closeMessageContextMenu();
      await toggleMessageReaction(message.id, emoji);
    });
    reactionRow.appendChild(button);
  });
  const isSelf = namesMatch(message.sender, currentUser?.username);
  const canEdit = isSelf && (!message.type || message.type === 'text') && !message.pending;
  if (actionSection) actionSection.hidden = !isSelf;
  if (editBtn) editBtn.hidden = !canEdit;
  if (deleteBtn) deleteBtn.hidden = !isSelf;
  menu.hidden = false;
  const menuWidth = 220;
  const menuHeight = isSelf ? 150 : 90;
  const maxLeft = window.innerWidth - menuWidth - 8;
  const maxTop = window.innerHeight - menuHeight - 8;
  menu.style.left = `${Math.max(8, Math.min(event.clientX, maxLeft))}px`;
  menu.style.top = `${Math.max(8, Math.min(event.clientY, maxTop))}px`;
}

function openEditMessageModal(message) {
  const modal = document.getElementById('editMessageModal');
  const input = document.getElementById('editMessageInput');
  const status = document.getElementById('editMessageStatus');
  if (!modal || !input) return;
  editingMessageId = message.id;
  input.value = message.content || '';
  if (status) {
    status.textContent = '';
    status.className = 'edit-message-status';
  }
  modal.hidden = false;
  input.focus();
}

function closeEditMessageModal() {
  const modal = document.getElementById('editMessageModal');
  editingMessageId = null;
  if (modal) modal.hidden = true;
}

async function saveEditedMessage() {
  const input = document.getElementById('editMessageInput');
  const status = document.getElementById('editMessageStatus');
  if (!editingMessageId || !input) return;
  const content = input.value.trim();
  if (!content) {
    if (status) {
      status.textContent = 'Message cannot be empty.';
      status.className = 'edit-message-status error';
    }
    return;
  }
  try {
    const data = await apiFetch(`/messages/${editingMessageId}`, {
      method: 'PATCH',
      body: { content },
    });
    cachedMessages = cachedMessages.map((message) =>
      message.id === editingMessageId ? data.message : message
    );
    schedulePaintMessages(cachedMessages);
    closeEditMessageModal();
    showChatStatus('Message updated.');
    setTimeout(() => showChatStatus(''), 2000);
  } catch (error) {
    if (status) {
      status.textContent = error.message;
      status.className = 'edit-message-status error';
    } else {
      showChatStatus(error.message, true);
    }
  }
}

function initMessageContextMenu() {
  const menu = document.getElementById('messageContextMenu');
  const deleteBtn = document.getElementById('contextDeleteMessageBtn');
  const editBtn = document.getElementById('contextEditMessageBtn');
  if (!menu || !deleteBtn) return;

  deleteBtn.addEventListener('click', async () => {
    const messageId = contextMenuMessageId;
    closeMessageContextMenu();
    if (messageId) await deleteMessage(messageId);
  });

  if (editBtn) {
    editBtn.addEventListener('click', () => {
      const message = contextMenuMessage;
      closeMessageContextMenu();
      if (message) openEditMessageModal(message);
    });
  }

  document.addEventListener('click', (event) => {
    if (menu.hidden) return;
    if (!menu.contains(event.target)) closeMessageContextMenu();
  });

  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') closeMessageContextMenu();
  });

  window.addEventListener('scroll', closeMessageContextMenu, true);
  if (messageList) {
    messageList.addEventListener('scroll', closeMessageContextMenu);
  }
}

async function deleteMessage(messageId) {
  if (!messageId || !confirm('Delete this message?')) return;
  closeMessageContextMenu();
  if (String(messageId).startsWith('pending-')) {
    cachedMessages = cachedMessages.filter((message) => message.id !== messageId);
    schedulePaintMessages(cachedMessages);
    return;
  }
  try {
    await apiFetch(`/messages/${messageId}`, { method: 'DELETE' });
    cachedMessages = cachedMessages.filter((message) => message.id !== messageId);
    schedulePaintMessages(cachedMessages);
    showChatStatus('Message deleted.');
    setTimeout(() => showChatStatus(''), 2000);
  } catch (error) {
    showChatStatus(error.message, true);
  }
}

function showMessagesLoading(loading) {
  if (!messageList) return;
  messageList.classList.toggle('is-loading', loading);
}

function isPendingMessageId(id) {
  const value = String(id || '');
  return value.startsWith('pending-') || value.startsWith('bot-thinking-');
}

function messagesMatchForReconcile(a, b) {
  if (!a || !b) return false;
  if (!namesMatch(a.sender, b.sender)) return false;
  const typeA = a.type || 'text';
  const typeB = b.type || 'text';
  if (typeA !== typeB) return false;
  if (typeA === 'text') {
    return String(a.content || '').trim() === String(b.content || '').trim();
  }
  return String(a.content || '') === String(b.content || '');
}

function removePendingDuplicates(messages) {
  const confirmed = messages.filter((message) => !isPendingMessageId(message.id));
  return messages.filter((message) => {
    if (!isPendingMessageId(message.id)) return true;
    const messageTime = new Date(message.sent_at).getTime();
    const hasMatch = confirmed.some((other) => {
      if (!messagesMatchForReconcile(message, other)) return false;
      const otherTime = new Date(other.sent_at).getTime();
      return Math.abs(otherTime - messageTime) < 120_000;
    });
    return !hasMatch;
  });
}

function mergeMessages(existing, incoming) {
  if (!incoming.length) return existing;
  if (!existing.length) {
    return removePendingDuplicates(
      incoming.slice().sort((a, b) => new Date(a.sent_at).getTime() - new Date(b.sent_at).getTime())
    );
  }

  const existingIds = new Set(existing.map((message) => message.id));
  const onlyAppends = incoming.every((message) => !existingIds.has(message.id));
  if (onlyAppends && existing.length) {
    const lastTime = new Date(existing[existing.length - 1].sent_at).getTime();
    const allNewer = incoming.every(
      (message) => new Date(message.sent_at).getTime() >= lastTime
    );
    if (allNewer) return removePendingDuplicates(existing.concat(incoming));
  }

  const map = new Map();
  existing.forEach((message) => map.set(message.id, message));
  incoming.forEach((message) => map.set(message.id, message));
  return removePendingDuplicates(
    Array.from(map.values()).sort(
      (a, b) => new Date(a.sent_at).getTime() - new Date(b.sent_at).getTime()
    )
  );
}

function getLastSyncedMessage() {
  for (let index = cachedMessages.length - 1; index >= 0; index -= 1) {
    const message = cachedMessages[index];
    if (!message.pending && !isPendingMessageId(message.id)) {
      return message;
    }
  }
  return null;
}

function activeMessagesUrl(lastMessage) {
  const synced = lastMessage || getLastSyncedMessage();
  const lite = '&lite=1';
  if (chatMode === 'gatebot') {
    const base = `/messages?gatebot=1${lite}`;
    return synced ? `${base}&after=${encodeURIComponent(synced.sent_at)}` : base;
  }
  if (chatMode === 'group' && selectedGroupId) {
    let base = `/messages?groupId=${encodeURIComponent(selectedGroupId)}${lite}`;
    if (selectedChannelId) base += `&channelId=${encodeURIComponent(selectedChannelId)}`;
    return synced ? `${base}&after=${encodeURIComponent(synced.sent_at)}` : base;
  }
  if (activeChatFriend) {
    const base = `/messages?friend=${encodeURIComponent(activeChatFriend.name)}${lite}`;
    return synced ? `${base}&after=${encodeURIComponent(synced.sent_at)}` : base;
  }
  return null;
}

function kickMessagePoll() {
  pollLast.messages = 0;
  pollNewMessages();
}

function getMessagesFetchPath() {
  const lite = 'lite=1';
  const limit = 'limit=120';
  if (chatMode === 'gatebot') return `/messages?gatebot=1&${lite}&${limit}`;
  if (chatMode === 'group' && selectedGroupId) {
    let url = `/messages?groupId=${encodeURIComponent(selectedGroupId)}&${lite}&${limit}`;
    if (selectedChannelId) url += `&channelId=${encodeURIComponent(selectedChannelId)}`;
    return url;
  }
  if (activeChatFriend) {
    return `/messages?friend=${encodeURIComponent(activeChatFriend.name)}&${lite}&${limit}`;
  }
  return null;
}

async function renderMessagesForActiveChat({ showLoading = true } = {}) {
  loadStoredMessageCaches();
  const cacheKey = getChatCacheKey();
  const cached = cacheKey ? messageCacheByKey.get(cacheKey) : null;
  const hasInstantCache = Boolean(cached?.length);

  if (hasInstantCache) {
    cachedMessages = cached;
    resetMessageRenderer();
    paintMessages(cachedMessages, { force: true, instant: true });
  }

  const fetchPath = getMessagesFetchPath();
  if (!fetchPath) {
    if (!activeChatFriend && chatMode !== 'gatebot' && !(chatMode === 'group' && selectedGroupId)) {
      cachedMessages = [];
      resetMessageRenderer();
      messageList.innerHTML =
        '<div class="message-row"><div class="message-bubble">Select a friend or group to start chatting.</div></div>';
    }
    return;
  }

  if (showLoading && !hasInstantCache) showMessagesLoading(true);
  try {
    const data = await apiFetch(fetchPath);
    if (hasInstantCache) {
      cachedMessages = mergeMessages(cachedMessages, data.messages);
      paintMessages(cachedMessages, { instant: true });
    } else {
      cachedMessages = data.messages;
      resetMessageRenderer();
      paintMessages(cachedMessages, { force: true, instant: true });
    }
    persistChatCache();
  } catch (error) {
    if (!hasInstantCache) {
      messageList.innerHTML = `<div class="message-row"><div class="message-bubble">${error.message}</div></div>`;
    }
  } finally {
    showMessagesLoading(false);
  }
}

async function pollNewMessages() {
  if (activeNavView !== 'friends') return;
  const url = activeMessagesUrl();
  if (!url) return;
  try {
    const lastMessage = getLastSyncedMessage();
    const data = await apiFetch(url);
    if (!lastMessage) {
      if (data.messages.length !== cachedMessages.length) {
        cachedMessages = data.messages;
        flushPaintMessages(cachedMessages, { force: true, instant: true });
        persistChatCache();
      }
      return;
    }
    if (data.messages.length) {
      const beforeCount = cachedMessages.length;
      cachedMessages = mergeMessages(cachedMessages, data.messages);
      let changed = cachedMessages.length !== beforeCount;
      if (!changed && data.messages.length) {
        const byId = new Map(cachedMessages.map((message) => [message.id, message]));
        changed = data.messages.some((incoming) => {
          const existing = byId.get(incoming.id);
          return !existing || messageDisplaySignature(existing) !== messageDisplaySignature(incoming);
        });
      }
      if (changed) {
        flushPaintMessages(cachedMessages, { instant: true });
        persistChatCache();
      }
    }
  } catch {
    // ignore polling errors
  }
}

function getMessageSendUrl() {
  return new URL('discord-notification.mp3', window.location.href).href;
}

function getMessageSendHtmlPlayer() {
  const player = document.getElementById('messageSendPlayer');
  if (player && !player.getAttribute('src')) {
    player.src = getMessageSendUrl();
  }
  return player;
}

function ensureMessageSendContext() {
  const AudioContext = window.AudioContext || window.webkitAudioContext;
  if (!AudioContext) return null;
  if (!messageSendCtx) messageSendCtx = new AudioContext();
  return messageSendCtx;
}

function loadMessageSendSound() {
  if (messageSendBuffer) return Promise.resolve(messageSendBuffer);
  if (messageSendLoadPromise) return messageSendLoadPromise;
  messageSendLoadPromise = (async () => {
    const ctx = ensureMessageSendContext();
    if (!ctx) return null;
    const response = await fetch(getMessageSendUrl());
    if (!response.ok) throw new Error('Message sound failed to load.');
    const arrayBuffer = await response.arrayBuffer();
    messageSendBuffer = await ctx.decodeAudioData(arrayBuffer);
    return messageSendBuffer;
  })().catch(() => {
    messageSendLoadPromise = null;
    return null;
  });
  return messageSendLoadPromise;
}

function unlockMessageSendAudio() {
  const ctx = ensureMessageSendContext();
  if (ctx?.state === 'suspended') {
    ctx.resume().catch(() => {});
  }
  const player = getMessageSendHtmlPlayer();
  if (player && !messageSendUnlocked) {
    const previousVolume = player.volume;
    player.volume = 0.001;
    player.play()
      .then(() => {
        player.pause();
        player.currentTime = 0;
        player.volume = previousVolume || 0.7;
        messageSendUnlocked = true;
      })
      .catch(() => {
        player.volume = previousVolume || 0.7;
      });
  }
  void loadMessageSendSound();
}

function playMessageTickHtml() {
  const player = getMessageSendHtmlPlayer();
  if (!player) return false;
  player.volume = 0.7;
  player.currentTime = 0;
  const playAttempt = player.play();
  if (playAttempt?.catch) playAttempt.catch(() => {});
  return true;
}

function playMessageTickBuffer() {
  const ctx = ensureMessageSendContext();
  if (!ctx || !messageSendBuffer) return false;
  if (ctx.state === 'suspended') ctx.resume().catch(() => {});
  const source = ctx.createBufferSource();
  const gain = ctx.createGain();
  source.buffer = messageSendBuffer;
  gain.gain.value = 0.72;
  source.connect(gain);
  gain.connect(ctx.destination);
  source.start(0);
  return true;
}

function playMessageTick() {
  unlockMessageSendAudio();
  if (playMessageTickBuffer()) return;
  if (messageSendBuffer) {
    playMessageTickBuffer();
    return;
  }
  void loadMessageSendSound().then((buffer) => {
    if (buffer) playMessageTickBuffer();
    else playMessageTickHtml();
  });
  playMessageTickHtml();
}

function initMessageTickAudio() {
  const unlock = () => unlockMessageSendAudio();
  ['pointerdown', 'click', 'keydown', 'touchstart'].forEach((eventName) => {
    document.addEventListener(eventName, unlock, { passive: true });
  });
  const sendBtn = document.getElementById('sendMessageBtn');
  if (sendBtn) {
    sendBtn.addEventListener('pointerdown', () => {
      unlockMessageSendAudio();
    });
  }
}

function setMessageSending(sending) {
  sendInFlight = Math.max(0, sendInFlight + (sending ? 1 : -1));
  const btn = document.getElementById('sendMessageBtn');
  const busy = sendInFlight > 0;
  if (btn) {
    btn.classList.toggle('sending', busy);
    btn.textContent = busy ? 'Sending...' : 'Send';
  }
  if (messageForm) messageForm.classList.toggle('is-sending', busy);
}

async function sendChatMessage(payload) {
  if (!canSendMessage()) {
    showChatStatus('Select a friend or group first.', true);
    return;
  }
  const tempId = `pending-${Date.now()}`;
  const optimistic = {
    id: tempId,
    sender: currentUser.username,
    recipient: chatMode === 'dm' ? activeChatFriend.name : chatMode === 'gatebot' ? 'GateBot' : null,
    groupId: chatMode === 'group' ? selectedGroupId : null,
    gatebot: chatMode === 'gatebot',
    sent_at: new Date().toISOString(),
    ...payload,
  };
  cachedMessages = mergeMessages(cachedMessages, [optimistic]);
  const thinkingId = chatMode === 'gatebot' ? `bot-thinking-${Date.now()}` : null;
  if (thinkingId) {
    cachedMessages = mergeMessages(cachedMessages, [
      {
        id: thinkingId,
        sender: 'GateBot',
        content: '🤖 Thinking...',
        type: 'text',
        isBot: true,
        pending: true,
        sent_at: new Date().toISOString(),
      },
    ]);
  }
  flushPaintMessages(cachedMessages, { instant: true });
  persistChatCache();
  playMessageTick();
  const isHeavySend = payload.type && payload.type !== 'text';
  if (isHeavySend) setMessageSending(true);
  if (thinkingId) showChatStatus('GateBot is thinking...');

  const body =
    chatMode === 'gatebot'
      ? { gatebot: true, ...payload }
      : chatMode === 'group'
        ? { groupId: selectedGroupId, channelId: selectedChannelId, ...payload }
        : { recipient: activeChatFriend.name, ...payload };

  const completeSend = async () => {
    try {
      const data = await apiFetch('/messages', {
        method: 'POST',
        body,
      });
      const incoming = [data.message];
      if (data.botMessage) incoming.push(data.botMessage);
      cachedMessages = removePendingDuplicates(
        cachedMessages.filter((message) => message.id !== tempId && message.id !== thinkingId)
      );
      cachedMessages = mergeMessages(cachedMessages, incoming);
      flushPaintMessages(cachedMessages, { instant: true });
      persistChatCache();
      kickMessagePoll();
      triggerVibeBurst(payload.type === 'sticker' ? payload.content : '✨');
      if (thinkingId) showChatStatus('');
    } catch (error) {
      cachedMessages = cachedMessages.filter(
        (message) => message.id !== tempId && message.id !== thinkingId
      );
      flushPaintMessages(cachedMessages, { instant: true });
      throw error;
    } finally {
      if (isHeavySend) setMessageSending(false);
    }
  };

  completeSend().catch((error) => {
    showChatStatus(error.message, true);
  });
}

async function addMessage(content) {
  await sendChatMessage({ content: content.trim(), type: 'text' });
}

function closeMessagePickers() {
  const emojiPicker = document.getElementById('emojiPicker');
  const stickerPicker = document.getElementById('stickerPicker');
  if (emojiPicker) emojiPicker.hidden = true;
  if (stickerPicker) stickerPicker.hidden = true;
  closeMediaSheet();
}

function closeMediaSheet() {
  const sheet = document.getElementById('mediaSheet');
  if (sheet) sheet.hidden = true;
}

function toggleMediaSheet() {
  const sheet = document.getElementById('mediaSheet');
  if (!sheet) return;
  closeMessagePickers();
  sheet.hidden = !sheet.hidden;
}

function blobToDataUrl(blob) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(new Error('Could not read video.'));
    reader.readAsDataURL(blob);
  });
}

function togglePicker(id) {
  const picker = document.getElementById(id);
  if (!picker) return;
  const willOpen = picker.hidden;
  closeMessagePickers();
  picker.hidden = !willOpen;
}

function insertEmoji(emoji) {
  if (!messageInput) return;
  const start = messageInput.selectionStart ?? messageInput.value.length;
  const end = messageInput.selectionEnd ?? messageInput.value.length;
  messageInput.value = `${messageInput.value.slice(0, start)}${emoji}${messageInput.value.slice(end)}`;
  messageInput.focus();
  messageInput.selectionStart = messageInput.selectionEnd = start + emoji.length;
  closeMessagePickers();
}

async function sendSticker(sticker) {
  if (!currentUser || !canSendMessage()) return;
  try {
    closeMessagePickers();
    await sendChatMessage({ content: sticker, type: 'sticker' });
    showChatStatus('');
  } catch (error) {
    showChatStatus(error.message, true);
  }
}

function readFileAsDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(new Error('Could not read image.'));
    reader.readAsDataURL(file);
  });
}

function compressImage(file, maxWidth = 680, quality = 0.76) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      URL.revokeObjectURL(url);
      const scale = Math.min(1, maxWidth / img.width);
      const width = Math.round(img.width * scale);
      const height = Math.round(img.height * scale);
      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(img, 0, 0, width, height);
      resolve(canvas.toDataURL('image/jpeg', quality));
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('Invalid image file.'));
    };
    img.src = url;
  });
}

async function handleImageFile(file) {
  if (!file || !file.type.startsWith('image/')) return;
  if (!currentUser || !canSendMessage()) {
    showChatStatus('Select a friend or group first.', true);
    return;
  }
  if (file.size > 8_000_000) {
    showChatStatus('Image is too large. Try a photo under 8MB.', true);
    return;
  }
  try {
    const image = await compressImage(file);
    await sendChatMessage({ type: 'image', image, content: '📷 Photo' });
    showChatStatus('');
    closeMessagePickers();
  } catch (error) {
    showChatStatus(error.message, true);
  }
}

async function handleVideoFile(file) {
  if (!file || !file.type.startsWith('video/')) return;
  if (!currentUser || !canSendMessage()) {
    showChatStatus('Select a friend or group first.', true);
    return;
  }
  if (file.size > 10_000_000) {
    showChatStatus('Video is too large. Try a shorter recording.', true);
    return;
  }
  try {
    const video = await blobToDataUrl(file);
    if (video.length > MAX_VIDEO_DATA_URL) {
      showChatStatus('Video is too large. Record a shorter clip.', true);
      return;
    }
    await sendChatMessage({ type: 'video', video, content: '🎥 Video' });
    showChatStatus('');
    closeMessagePickers();
  } catch (error) {
    showChatStatus(error.message, true);
  }
}

function resetVoiceNoteUi() {
  const timer = document.getElementById('voiceNoteTimer');
  const playback = document.getElementById('voiceNotePlayback');
  const startBtn = document.getElementById('startVoiceBtn');
  const stopBtn = document.getElementById('stopVoiceBtn');
  const sendBtn = document.getElementById('sendVoiceBtn');
  if (voiceInterval) {
    clearInterval(voiceInterval);
    voiceInterval = null;
  }
  voiceRecorder = null;
  voiceChunks = [];
  voiceSeconds = 0;
  voiceBlob = null;
  if (playback) {
    playback.pause();
    playback.removeAttribute('src');
    playback.hidden = true;
  }
  if (timer) timer.textContent = 'Tap Record — max 60 sec';
  if (startBtn) startBtn.hidden = false;
  if (stopBtn) stopBtn.hidden = true;
  if (sendBtn) sendBtn.hidden = true;
}

function micErrorMessage(error) {
  const name = error?.name || '';
  if (name === 'NotAllowedError' || name === 'PermissionDeniedError' || name === 'SecurityError') {
    return 'Microphone blocked. Allow mic access in your browser settings, then try again.';
  }
  if (name === 'NotFoundError' || name === 'DevicesNotFoundError') {
    return 'No microphone found on this device.';
  }
  return 'Could not access microphone. Check your device settings.';
}

function closeMicPermissionModal() {
  const modal = document.getElementById('micPermissionModal');
  const status = document.getElementById('micPermissionStatus');
  if (status) {
    status.textContent = '';
    status.className = 'mic-permission-status';
  }
  if (modal) modal.hidden = true;
}

function openMicPermissionModal() {
  const modal = document.getElementById('micPermissionModal');
  const status = document.getElementById('micPermissionStatus');
  if (status) {
    status.textContent = '';
    status.className = 'mic-permission-status';
  }
  if (modal) modal.hidden = false;
}

async function hasMicPermission() {
  if (micAccessGranted) return true;
  try {
    if (navigator.permissions?.query) {
      const result = await navigator.permissions.query({ name: 'microphone' });
      if (result.state === 'granted') {
        micAccessGranted = true;
        return true;
      }
    }
  } catch {
    // Permissions API not available on this browser.
  }
  return false;
}

async function requestMicPermission() {
  const status = document.getElementById('micPermissionStatus');
  if (!navigator.mediaDevices?.getUserMedia) {
    if (status) {
      status.textContent = 'Voice messages are not supported on this device.';
      status.className = 'mic-permission-status error';
    }
    return false;
  }
  try {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    stream.getTracks().forEach((track) => track.stop());
    micAccessGranted = true;
    closeMicPermissionModal();
    return true;
  } catch (error) {
    if (status) {
      status.textContent = micErrorMessage(error);
      status.className = 'mic-permission-status error';
    }
    return false;
  }
}

function showVoiceNoteModal() {
  const modal = document.getElementById('voiceNoteModal');
  resetVoiceNoteUi();
  if (modal) modal.hidden = false;
}

function closeVoiceNoteModal() {
  const modal = document.getElementById('voiceNoteModal');
  if (voiceRecorder && voiceRecorder.state !== 'inactive') {
    voiceRecorder.stop();
  }
  resetVoiceNoteUi();
  if (modal) modal.hidden = true;
}

async function openVoiceNoteModal() {
  closeMessagePickers();
  closeMediaSheet();
  if (!currentUser || !canSendMessage()) {
    showChatStatus('Select a friend or group first.', true);
    return;
  }
  if (!navigator.mediaDevices?.getUserMedia || !window.MediaRecorder) {
    showChatStatus('Voice messages are not supported on this device.', true);
    return;
  }
  if (await hasMicPermission()) {
    showVoiceNoteModal();
    return;
  }
  openMicPermissionModal();
}

async function allowMicAndOpenVoiceModal() {
  const granted = await requestMicPermission();
  if (granted) showVoiceNoteModal();
}

async function startVoiceRecording() {
  const timer = document.getElementById('voiceNoteTimer');
  const startBtn = document.getElementById('startVoiceBtn');
  const stopBtn = document.getElementById('stopVoiceBtn');
  const sendBtn = document.getElementById('sendVoiceBtn');
  const playback = document.getElementById('voiceNotePlayback');
  try {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    const mimeType = MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
      ? 'audio/webm;codecs=opus'
      : 'audio/webm';
    voiceChunks = [];
    voiceBlob = null;
    voiceRecorder = new MediaRecorder(stream, { mimeType });
    voiceRecorder.ondataavailable = (event) => {
      if (event.data.size) voiceChunks.push(event.data);
    };
    voiceRecorder.onstop = () => {
      stream.getTracks().forEach((track) => track.stop());
      voiceBlob = new Blob(voiceChunks, { type: mimeType });
      if (playback && voiceBlob) {
        playback.src = URL.createObjectURL(voiceBlob);
        playback.hidden = false;
      }
      if (sendBtn) sendBtn.hidden = false;
      if (timer) timer.textContent = 'Preview your voice message, then send';
    };
    voiceRecorder.start(250);
    voiceSeconds = 0;
    if (startBtn) startBtn.hidden = true;
    if (stopBtn) stopBtn.hidden = false;
    if (sendBtn) sendBtn.hidden = true;
    voiceInterval = setInterval(() => {
      voiceSeconds += 1;
      if (timer) timer.textContent = `Recording ${voiceSeconds}s / ${MAX_VOICE_SECONDS}s`;
      if (voiceSeconds >= MAX_VOICE_SECONDS) stopVoiceRecording();
    }, 1000);
  } catch (error) {
    micAccessGranted = false;
    showChatStatus(micErrorMessage(error), true);
    closeVoiceNoteModal();
    openMicPermissionModal();
  }
}

function stopVoiceRecording() {
  if (voiceRecorder && voiceRecorder.state !== 'inactive') {
    voiceRecorder.stop();
  }
  if (voiceInterval) {
    clearInterval(voiceInterval);
    voiceInterval = null;
  }
  const stopBtn = document.getElementById('stopVoiceBtn');
  if (stopBtn) stopBtn.hidden = true;
}

async function sendVoiceNote() {
  if (!voiceBlob) return;
  try {
    const audio = await blobToDataUrl(voiceBlob);
    if (audio.length > MAX_VOICE_DATA_URL) {
      showChatStatus('Voice message too long. Record a shorter clip.', true);
      return;
    }
    closeVoiceNoteModal();
    await sendChatMessage({ type: 'voice', audio, content: '🎤 Voice message' });
    showChatStatus('');
  } catch (error) {
    showChatStatus(error.message, true);
  }
}

function stopRecordStream() {
  if (recordStream) {
    recordStream.getTracks().forEach((track) => track.stop());
    recordStream = null;
  }
}

function resetRecordUi() {
  const preview = document.getElementById('recordPreview');
  const playback = document.getElementById('recordPlayback');
  const timer = document.getElementById('recordTimer');
  const startBtn = document.getElementById('startRecordBtn');
  const stopBtn = document.getElementById('stopRecordBtn');
  const sendBtn = document.getElementById('sendRecordBtn');
  if (recordInterval) {
    clearInterval(recordInterval);
    recordInterval = null;
  }
  recordRecorder = null;
  recordChunks = [];
  recordSeconds = 0;
  recordedBlob = null;
  if (preview) {
    preview.srcObject = null;
    preview.hidden = false;
  }
  if (playback) {
    playback.pause();
    playback.removeAttribute('src');
    playback.hidden = true;
  }
  if (timer) timer.textContent = 'Tap Record — max 20 sec';
  if (startBtn) startBtn.hidden = false;
  if (stopBtn) stopBtn.hidden = true;
  if (sendBtn) sendBtn.hidden = true;
}

function closeRecordModal() {
  const modal = document.getElementById('recordModal');
  if (recordRecorder && recordRecorder.state !== 'inactive') {
    recordRecorder.stop();
  }
  stopRecordStream();
  resetRecordUi();
  if (modal) modal.hidden = true;
}

async function openRecordModal() {
  closeMediaSheet();
  if (!currentUser || !canSendMessage()) {
    showChatStatus('Select a friend or group first.', true);
    return;
  }
  if (!navigator.mediaDevices?.getUserMedia) {
    showChatStatus('Video recording is not supported on this device.', true);
    return;
  }
  const modal = document.getElementById('recordModal');
  const preview = document.getElementById('recordPreview');
  resetRecordUi();
  try {
    recordStream = await navigator.mediaDevices.getUserMedia({
      video: { facingMode: { ideal: 'environment' } },
      audio: true,
    });
    if (preview) preview.srcObject = recordStream;
    if (modal) modal.hidden = false;
  } catch {
    showChatStatus('Allow camera and microphone to record video.', true);
    closeRecordModal();
  }
}

function startRecording() {
  if (!recordStream) return;
  const timer = document.getElementById('recordTimer');
  const startBtn = document.getElementById('startRecordBtn');
  const stopBtn = document.getElementById('stopRecordBtn');
  const sendBtn = document.getElementById('sendRecordBtn');
  const playback = document.getElementById('recordPlayback');
  const preview = document.getElementById('recordPreview');
  recordChunks = [];
  recordedBlob = null;
  const mimeType = MediaRecorder.isTypeSupported('video/webm;codecs=vp8,opus')
    ? 'video/webm;codecs=vp8,opus'
    : 'video/webm';
  recordRecorder = new MediaRecorder(recordStream, {
    mimeType,
    videoBitsPerSecond: 550_000,
  });
  recordRecorder.ondataavailable = (event) => {
    if (event.data.size) recordChunks.push(event.data);
  };
  recordRecorder.onstop = () => {
    recordedBlob = new Blob(recordChunks, { type: mimeType });
    if (playback && recordedBlob) {
      playback.src = URL.createObjectURL(recordedBlob);
      playback.hidden = false;
      if (preview) preview.hidden = true;
    }
    if (sendBtn) sendBtn.hidden = false;
    if (timer) timer.textContent = 'Preview your video, then send';
  };
  recordRecorder.start(300);
  recordSeconds = 0;
  if (startBtn) startBtn.hidden = true;
  if (stopBtn) stopBtn.hidden = false;
  if (sendBtn) sendBtn.hidden = true;
  recordInterval = setInterval(() => {
    recordSeconds += 1;
    if (timer) timer.textContent = `Recording ${recordSeconds}s / ${MAX_RECORD_SECONDS}s`;
    if (recordSeconds >= MAX_RECORD_SECONDS) {
      stopRecording();
    }
  }, 1000);
}

function stopRecording() {
  if (recordRecorder && recordRecorder.state !== 'inactive') {
    recordRecorder.stop();
  }
  if (recordInterval) {
    clearInterval(recordInterval);
    recordInterval = null;
  }
  const stopBtn = document.getElementById('stopRecordBtn');
  if (stopBtn) stopBtn.hidden = true;
}

async function sendRecording() {
  if (!recordedBlob) return;
  try {
    const video = await blobToDataUrl(recordedBlob);
    if (video.length > MAX_VIDEO_DATA_URL) {
      showChatStatus('Video too long. Record a shorter clip.', true);
      return;
    }
    closeRecordModal();
    await sendChatMessage({ type: 'video', video, content: '🎥 Video' });
    showChatStatus('');
  } catch (error) {
    showChatStatus(error.message, true);
  }
}

function initMessageComposer() {
  const emojiGrid = document.getElementById('emojiGrid');
  const stickerGrid = document.getElementById('stickerGrid');
  const emojiBtn = document.getElementById('emojiBtn');
  const stickerBtn = document.getElementById('stickerBtn');
  if (emojiGrid) {
    CHAT_EMOJIS.forEach((emoji) => {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'picker-item';
      button.textContent = emoji;
      button.addEventListener('click', () => insertEmoji(emoji));
      emojiGrid.appendChild(button);
    });
  }

  if (stickerGrid) {
    CHAT_STICKERS.forEach((sticker) => {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'picker-item sticker-item';
      button.textContent = sticker;
      button.addEventListener('click', () => sendSticker(sticker));
      stickerGrid.appendChild(button);
    });
  }

  if (emojiBtn) emojiBtn.addEventListener('click', () => togglePicker('emojiPicker'));
  if (stickerBtn) stickerBtn.addEventListener('click', () => togglePicker('stickerPicker'));

  const voiceBtn = document.getElementById('voiceBtn');
  const mediaBtn = document.getElementById('mediaBtn');
  const cameraPhotoInput = document.getElementById('cameraPhotoInput');
  const galleryImageInput = document.getElementById('galleryImageInput');
  const galleryVideoInput = document.getElementById('galleryVideoInput');
  const mediaSheet = document.getElementById('mediaSheet');

  if (voiceBtn) voiceBtn.addEventListener('click', openVoiceNoteModal);

  const startVoiceBtn = document.getElementById('startVoiceBtn');
  const stopVoiceBtn = document.getElementById('stopVoiceBtn');
  const sendVoiceBtn = document.getElementById('sendVoiceBtn');
  const cancelVoiceBtn = document.getElementById('cancelVoiceBtn');
  const voiceNoteModal = document.getElementById('voiceNoteModal');
  if (startVoiceBtn) startVoiceBtn.addEventListener('click', startVoiceRecording);
  if (stopVoiceBtn) stopVoiceBtn.addEventListener('click', stopVoiceRecording);
  if (sendVoiceBtn) sendVoiceBtn.addEventListener('click', sendVoiceNote);
  if (cancelVoiceBtn) cancelVoiceBtn.addEventListener('click', closeVoiceNoteModal);
  if (voiceNoteModal) {
    voiceNoteModal.addEventListener('click', (event) => {
      if (event.target === voiceNoteModal) closeVoiceNoteModal();
    });
  }

  const micPermissionModal = document.getElementById('micPermissionModal');
  const allowMicPermissionBtn = document.getElementById('allowMicPermissionBtn');
  const cancelMicPermissionBtn = document.getElementById('cancelMicPermissionBtn');
  if (allowMicPermissionBtn) {
    allowMicPermissionBtn.addEventListener('click', allowMicAndOpenVoiceModal);
  }
  if (cancelMicPermissionBtn) {
    cancelMicPermissionBtn.addEventListener('click', closeMicPermissionModal);
  }
  if (micPermissionModal) {
    micPermissionModal.addEventListener('click', (event) => {
      if (event.target === micPermissionModal) closeMicPermissionModal();
    });
  }

  if (mediaBtn) {
    mediaBtn.addEventListener('click', () => toggleMediaSheet());
  }

  if (mediaSheet) {
    mediaSheet.querySelectorAll('[data-media]').forEach((button) => {
      button.addEventListener('click', () => {
        const action = button.dataset.media;
        closeMediaSheet();
        if (action === 'camera-photo' && cameraPhotoInput) cameraPhotoInput.click();
        if (action === 'gallery-photo' && galleryImageInput) galleryImageInput.click();
        if (action === 'record-video') openRecordModal();
        if (action === 'gallery-video' && galleryVideoInput) galleryVideoInput.click();
      });
    });
  }

  if (cameraPhotoInput) {
    cameraPhotoInput.addEventListener('change', async () => {
      const file = cameraPhotoInput.files?.[0];
      cameraPhotoInput.value = '';
      if (file) await handleImageFile(file);
    });
  }

  if (galleryImageInput) {
    galleryImageInput.addEventListener('change', async () => {
      const file = galleryImageInput.files?.[0];
      galleryImageInput.value = '';
      if (file) await handleImageFile(file);
    });
  }

  if (galleryVideoInput) {
    galleryVideoInput.addEventListener('change', async () => {
      const file = galleryVideoInput.files?.[0];
      galleryVideoInput.value = '';
      if (file) await handleVideoFile(file);
    });
  }

  const startRecordBtn = document.getElementById('startRecordBtn');
  const stopRecordBtn = document.getElementById('stopRecordBtn');
  const sendRecordBtn = document.getElementById('sendRecordBtn');
  const cancelRecordBtn = document.getElementById('cancelRecordBtn');
  const recordModal = document.getElementById('recordModal');

  if (startRecordBtn) startRecordBtn.addEventListener('click', startRecording);
  if (stopRecordBtn) stopRecordBtn.addEventListener('click', stopRecording);
  if (sendRecordBtn) sendRecordBtn.addEventListener('click', sendRecording);
  if (cancelRecordBtn) cancelRecordBtn.addEventListener('click', closeRecordModal);
  if (recordModal) {
    recordModal.addEventListener('click', (event) => {
      if (event.target === recordModal) closeRecordModal();
    });
  }

  if (messageInput) {
    messageInput.addEventListener('input', notifyTyping);
    messageInput.addEventListener('paste', async (event) => {
      const item = Array.from(event.clipboardData?.items || []).find((entry) =>
        entry.type.startsWith('image/')
      );
      if (!item) return;
      event.preventDefault();
      const file = item.getAsFile();
      if (file) await handleImageFile(file);
    });
  }

  document.addEventListener('click', (event) => {
    if (!event.target.closest('.composer-wrap')) closeMessagePickers();
    if (!event.target.closest('#mediaBtn') && !event.target.closest('#mediaSheet')) {
      closeMediaSheet();
    }
  });
}

async function sendPresenceHeartbeat() {
  try {
    await apiFetch('/presence', { method: 'POST', body: { status: getDesiredPresenceStatus() } });
  } catch {
    // ignore presence errors
  }
}

function buildPresenceFingerprint(friendsPresence) {
  return (friendsPresence || [])
    .map((entry) => `${entry.username}:${entry.status}:${entry.lastSeen || ''}`)
    .sort()
    .join('|');
}

function patchFriendsPresence() {
  if (!friendList) return;
  friendList.querySelectorAll('.chat-list-item').forEach((item) => {
    const name = item.querySelector('.chat-item-details strong')?.textContent?.trim();
    if (!name) return;
    const dot = item.querySelector('.presence-dot');
    const subtitle = item.querySelector('.chat-item-details span');
    const statusClass = presenceStatusClass(name);
    if (dot) dot.className = `presence-dot ${statusClass}`;
    if (subtitle) subtitle.textContent = presenceSubtitle(name);
  });
}

async function refreshPresence() {
  try {
    const data = await apiFetch('/presence');
    if (data.self?.status === 'dnd' && !dndEnabled) {
      dndEnabled = true;
      saveDndPreference(true);
      updateDndUi();
      updateProfilePanel();
    }
    updateSelfPresenceDot(data.self);
    const nextFingerprint = buildPresenceFingerprint(data.friends);
    if (nextFingerprint === presenceFingerprint) return;
    presenceFingerprint = nextFingerprint;
    cachedPresence = {};
    (data.friends || []).forEach((entry) => {
      cachedPresence[String(entry.username || '').toLowerCase()] = entry;
    });
    patchFriendsPresence();
  } catch {
    // ignore presence errors
  }
}

function notifyTyping() {
  if (!canSendMessage()) return;
  if (typingDebounce) clearTimeout(typingDebounce);
  typingDebounce = setTimeout(async () => {
    try {
      const body =
        chatMode === 'group'
          ? { groupId: selectedGroupId, channelId: selectedChannelId }
          : { friend: activeChatFriend?.name };
      if (!body.groupId && !body.friend) return;
      await apiFetch('/typing', { method: 'POST', body });
    } catch {
      // ignore typing errors
    }
  }, 500);
}

function updateTypingIndicator(typers) {
  const el = document.getElementById('typingIndicator');
  if (!el) return;
  if (!typers?.length) {
    el.hidden = true;
    el.textContent = '';
    return;
  }
  el.hidden = false;
  el.textContent =
    typers.length === 1 ? `${typers[0]} is typing...` : `${typers.length} people are typing...`;
}

async function pollTyping() {
  if (!canSendMessage()) {
    updateTypingIndicator([]);
    return;
  }
  try {
    let url =
      chatMode === 'group'
        ? `/typing?groupId=${encodeURIComponent(selectedGroupId)}`
        : `/typing?friend=${encodeURIComponent(activeChatFriend.name)}`;
    if (chatMode === 'group' && selectedChannelId) {
      url += `&channelId=${encodeURIComponent(selectedChannelId)}`;
    }
    const data = await apiFetch(url);
    updateTypingIndicator(data.typers || []);
  } catch {
    // ignore typing errors
  }
}

function initDragAndDropUploads() {
  const wrap = document.getElementById('composerWrap');
  const overlay = document.getElementById('dropOverlay');
  if (!wrap) return;

  const showDrop = (show) => {
    if (overlay) overlay.hidden = !show;
    wrap.classList.toggle('drop-active', show);
  };

  wrap.addEventListener('dragenter', (event) => {
    event.preventDefault();
    if (!canSendMessage()) return;
    showDrop(true);
  });
  wrap.addEventListener('dragover', (event) => {
    event.preventDefault();
    if (!canSendMessage()) return;
    showDrop(true);
  });
  wrap.addEventListener('dragleave', (event) => {
    if (!wrap.contains(event.relatedTarget)) showDrop(false);
  });
  wrap.addEventListener('drop', async (event) => {
    event.preventDefault();
    showDrop(false);
    if (!canSendMessage()) {
      showChatStatus('Select a friend or group first.', true);
      return;
    }
    const file = Array.from(event.dataTransfer?.files || []).find(
      (entry) => entry.type.startsWith('image/') || entry.type.startsWith('video/')
    );
    if (!file) {
      showChatStatus('Drop an image or video file.', true);
      return;
    }
    if (file.type.startsWith('image/')) await handleImageFile(file);
    else await handleVideoFile(file);
  });
}

function initChatSearch() {
  const input = document.getElementById('chatSearch');
  if (!input) return;
  input.addEventListener('input', () => {
    clearTimeout(searchDebounceTimer);
    searchDebounceTimer = setTimeout(() => {
      messageSearchQuery = input.value;
      updateFriendsSearchFilter();
      if (canSendMessage()) schedulePaintMessages(cachedMessages, { force: true });
    }, SEARCH_DEBOUNCE_MS);
  });
}

function initEditMessageModal() {
  const modal = document.getElementById('editMessageModal');
  const saveBtn = document.getElementById('saveEditMessageBtn');
  const cancelBtn = document.getElementById('cancelEditMessageBtn');
  const input = document.getElementById('editMessageInput');
  if (saveBtn) saveBtn.addEventListener('click', saveEditedMessage);
  if (cancelBtn) cancelBtn.addEventListener('click', closeEditMessageModal);
  if (modal) {
    modal.addEventListener('click', (event) => {
      if (event.target === modal) closeEditMessageModal();
    });
  }
  if (input) {
    input.addEventListener('keydown', (event) => {
      if (event.key === 'Enter' && !event.shiftKey) {
        event.preventDefault();
        saveEditedMessage();
      }
    });
  }
}

function getPollInterval(name, intervalMs) {
  if (tabHidden) {
    if (name === 'messages') return POLL_MESSAGES_IDLE_MS * POLL_HIDDEN_MULTIPLIER;
    return intervalMs * POLL_HIDDEN_MULTIPLIER;
  }
  if (name === 'messages') {
    if (canSendMessage()) return POLL_MESSAGES_MS;
    return POLL_MESSAGES_IDLE_MS;
  }
  return intervalMs;
}

async function runPollTask(name, intervalMs, task) {
  const now = Date.now();
  const waitMs = getPollInterval(name, intervalMs);
  if (now - pollLast[name] < waitMs) return;
  if (pollInFlight[name]) return;
  pollLast[name] = now;
  pollInFlight[name] = true;
  try {
    await task();
  } finally {
    pollInFlight[name] = false;
  }
}

function startPolling() {
  stopPolling();
  pollLast = { messages: 0, typing: 0, friends: 0, requests: 0, presence: 0, heartbeat: 0 };
  sendPresenceHeartbeat();
  refreshPresence();
  pollNewMessages();
  pollTimer = setInterval(() => {
    if (!currentUser || !chatScreen.classList.contains('active')) return;
    runPollTask('messages', POLL_MESSAGES_MS, pollNewMessages);
    runPollTask('typing', POLL_TYPING_MS, pollTyping);
    runPollTask('friends', POLL_FRIENDS_MS, refreshFriends);
    runPollTask('requests', POLL_REQUESTS_MS, refreshRequests);
    runPollTask('presence', POLL_PRESENCE_MS, refreshPresence);
    runPollTask('heartbeat', POLL_HEARTBEAT_MS, sendPresenceHeartbeat);
  }, POLL_TICK_MS);
}

function stopPolling() {
  if (pollTimer) {
    clearInterval(pollTimer);
    pollTimer = null;
  }
}

async function enterChat(user, message) {
  loadStoredMessageCaches();
  unlockMessageSendAudio();
  void loadMessageSendSound();
  currentUser = user;
  dndEnabled = loadDndPreference();
  updateDndUi();
  updateProfilePanel();
  setScreen('chat');
  showStatus(message);
  applyGroupTheme();
  updateCoolBar();
  refreshGateBotStatus();
  startPolling();
  callControls?.startCallPolling();
  loadCommunity()
    .then(() => {
      setTimeout(autoSelectDefault, 60);
    })
    .catch((error) => {
      showChatStatus(error.message, true);
    });
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

  document.addEventListener('visibilitychange', () => {
    const wasHidden = tabHidden;
    tabHidden = document.visibilityState === 'hidden';
    if (wasHidden && !tabHidden && currentUser) {
      pollLast.messages = 0;
      pollLast.presence = 0;
      pollNewMessages();
      refreshPresence();
    }
  });

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
        await completeAuth(data, `Welcome back, ${data.user.username}!`);
      } catch (loginError) {
        if (loginError.status === 404) {
          data = await apiFetch('/auth/register', { method: 'POST', body: { username, password } });
          await completeAuth(data, 'Account created. You can now chat with other people!');
        } else if (loginError.status === 401) {
          showStatus('Incorrect password. Use your passkey below to reset it.', true);
          openResetPanel(username);
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

  if (loginUsername) {
    loginUsername.addEventListener('input', () => {
      if (loginReset && !loginReset.hidden && resetPasskey) {
        resetPasskey.value = getSavedPasskey(loginUsername.value.trim());
      }
    });
  }

  if (cancelResetBtn) {
    cancelResetBtn.addEventListener('click', () => {
      hideResetPanel();
      showStatus('Enter your username and password to sign in.');
    });
  }

  if (resetPasswordBtn) {
    resetPasswordBtn.addEventListener('click', async () => {
      const uname = loginReset?.dataset.username || loginUsername.value.trim();
      const passkey = resetPasskey?.value.trim() || '';
      const password = resetNewPassword?.value || '';
      const confirm = resetConfirmPassword?.value || '';

      if (!uname) {
        showStatus('Enter your username first.', true);
        return;
      }
      if (!passkey) {
        showStatus('Enter your passkey to reset the password.', true);
        return;
      }
      if (password.length < 4) {
        showStatus('New password must be at least 4 characters.', true);
        return;
      }
      if (password !== confirm) {
        showStatus('New passwords do not match.', true);
        return;
      }

      try {
        const data = await apiFetch('/auth/reset-password', {
          method: 'POST',
          body: { username: uname, passkey, password },
        });
        if (savePasskeyCheckbox?.checked) {
          savePasskeyForUser(uname, passkey);
        }
        await completeAuth(data, 'Password reset. Signing you in...');
      } catch (error) {
        showStatus(error.message, true);
      }
    });
  }

  if (passkeyModalDone) {
    passkeyModalDone.addEventListener('click', () => {
      closePasskeyModal(true);
    });
  }
  if (passkeyModal) {
    passkeyModal.addEventListener('click', (event) => {
      if (event.target === passkeyModal) closePasskeyModal(true);
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

  initMessageComposer();
  initMessageContextMenu();
  initEditMessageModal();
  initChatSearch();
  initDragAndDropUploads();
  initCoolFeatures();
  initMessageListDelegation();
  initMessageTickAudio();
  applyGroupTheme();
  updateCoolBar();

  messageForm.addEventListener('submit', async (event) => {
    event.preventDefault();
    const text = messageInput.value.trim();
    if (!text) return;
    if (!currentUser) {
      showChatStatus('Please sign in to send messages.', true);
      return;
    }
    if (!canSendMessage()) {
      showChatStatus('Select a friend or group first.', true);
      return;
    }
    unlockMessageSendAudio();
    messageInput.value = '';
    closeMessagePickers();
    messageInput.focus();
    void addMessage(text)
      .then(() => showChatStatus(''))
      .catch((error) => {
        showChatStatus(error.message, true);
      });
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

  if (addGroupButton) {
    addGroupButton.addEventListener('click', openCreateGroupModal);
  }
  if (cancelCreateGroup) {
    cancelCreateGroup.addEventListener('click', closeCreateGroupModal);
  }
  if (confirmCreateGroup) {
    confirmCreateGroup.addEventListener('click', submitCreateGroup);
  }
  if (createGroupInput) {
    createGroupInput.addEventListener('keydown', async (event) => {
      if (event.key === 'Enter') {
        event.preventDefault();
        await submitCreateGroup();
      }
    });
  }
  if (createGroupModal) {
    createGroupModal.addEventListener('click', (event) => {
      if (event.target === createGroupModal) closeCreateGroupModal();
    });
  }

  if (addGroupMemberBtn) {
    addGroupMemberBtn.addEventListener('click', openAddGroupMemberModal);
  }
  if (cancelAddGroupMember) {
    cancelAddGroupMember.addEventListener('click', closeAddGroupMemberModal);
  }
  if (confirmAddGroupMember) {
    confirmAddGroupMember.addEventListener('click', async () => {
      if (!addGroupMemberSelect?.value) return;
      await addFriendToGroup(addGroupMemberSelect.value);
    });
  }
  if (addGroupMemberModal) {
    addGroupMemberModal.addEventListener('click', (event) => {
      if (event.target === addGroupMemberModal) closeAddGroupMemberModal();
    });
  }

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
      clearTimeout(userSearchDebounceTimer);
      userSearchDebounceTimer = setTimeout(() => {
        refreshUserSuggestions(addFriendInput.value);
      }, USER_SEARCH_DEBOUNCE_MS);
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
        if (view) switchNavView(view, { fromNav: true });
      });
    });
  }

  const bindFriendActions = (unfriendBtn, blockBtn) => {
    if (unfriendBtn) {
      unfriendBtn.addEventListener('click', () => {
        if (activeChatFriend) removeFriend(activeChatFriend.name);
      });
    }
    if (blockBtn) {
      blockBtn.addEventListener('click', () => {
        if (activeChatFriend) blockUser(activeChatFriend.name);
      });
    }
  };

  bindFriendActions(removeFriendBtn, blockFriendBtn);
  bindFriendActions(
    document.getElementById('actionUnfriendBtn'),
    document.getElementById('actionBlockBtn')
  );

  if (deleteServerBtn) {
    deleteServerBtn.addEventListener('click', deleteCurrentServer);
  }

  if (document.getElementById('newChatBtn')) {
    document.getElementById('newChatBtn').addEventListener('click', openAddFriendModal);
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
    callControls?.cleanupCall();
    setScreen('landing');
    currentUser = null;
    clearToken();
    stopPolling();
    closeDrawer();
    showStatus('Logged out. Ready to connect.');
  });

  if (typeof initCalls === 'function') {
    callControls = initCalls({
      apiFetch,
      getCurrentUser: () => currentUser,
      getActiveFriend: () => activeChatFriend,
      showChatStatus,
    });
  }

  const openProfileBtn = document.getElementById('openProfileBtn');
  const cancelProfileBtn = document.getElementById('cancelProfileBtn');
  const saveProfileBtn = document.getElementById('saveProfileBtn');
  const profileDndBtn = document.getElementById('profileDndBtn');
  const profileModal = document.getElementById('profileModal');
  const profilePhotoInput = document.getElementById('profilePhotoInput');
  const removeProfilePhotoBtn = document.getElementById('removeProfilePhotoBtn');
  if (openProfileBtn) openProfileBtn.addEventListener('click', openProfileModal);
  if (profileDndBtn) profileDndBtn.addEventListener('click', toggleDoNotDisturb);
  if (cancelProfileBtn) cancelProfileBtn.addEventListener('click', closeProfileModal);
  if (saveProfileBtn) saveProfileBtn.addEventListener('click', saveProfile);
  if (profileModal) {
    profileModal.addEventListener('click', (event) => {
      if (event.target === profileModal) closeProfileModal();
    });
  }
  if (profilePhotoInput) {
    profilePhotoInput.addEventListener('change', async () => {
      const file = profilePhotoInput.files?.[0];
      profilePhotoInput.value = '';
      if (!file) return;
      try {
        pendingProfileAvatar = await compressImage(file, 320, 0.82);
        renderAvatarElement(document.getElementById('profileEditAvatar'), {
          ...currentUser,
          avatar: pendingProfileAvatar,
        });
      } catch (error) {
        const status = document.getElementById('profileEditStatus');
        if (status) {
          status.textContent = error.message;
          status.className = 'profile-edit-status error';
        }
      }
    });
  }
  if (removeProfilePhotoBtn) {
    removeProfilePhotoBtn.addEventListener('click', () => {
      pendingProfileAvatar = '';
      renderAvatarElement(document.getElementById('profileEditAvatar'), currentUser);
    });
  }

  restoreSession();
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initApp);
} else {
  initApp();
}
