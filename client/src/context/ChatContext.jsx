import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { apiFetch, clearToken, getToken, saveToken } from '../api';

const ChatContext = createContext(null);

export function ChatProvider({ children }) {
  const [screen, setScreen] = useState('landing');
  const [authStatus, setAuthStatus] = useState({ message: 'Ready to connect.', isError: false });
  const [resetUsername, setResetUsername] = useState('');
  const [showReset, setShowReset] = useState(false);

  const [currentUser, setCurrentUser] = useState(null);
  const [friends, setFriends] = useState([]);
  const [servers, setServers] = useState([]);
  const [requests, setRequests] = useState([]);
  const [blocked, setBlocked] = useState([]);
  const [selectedGroupId, setSelectedGroupId] = useState(null);
  const [activeChatFriend, setActiveChatFriend] = useState(null);
  const [activeNavView, setActiveNavView] = useState('friends');
  const [messages, setMessages] = useState([]);
  const [chatStatus, setChatStatus] = useState({ message: '', isError: false });

  const [drawerOpen, setDrawerOpen] = useState(false);
  const [addFriendOpen, setAddFriendOpen] = useState(false);
  const [addFriendInput, setAddFriendInput] = useState('');
  const [addFriendStatus, setAddFriendStatus] = useState({ message: '', type: '' });
  const [userSuggestions, setUserSuggestions] = useState([]);

  const pollTimer = useRef(null);
  const drawerTouchStart = useRef(null);

  const showAuthStatus = useCallback((message, isError = false) => {
    setAuthStatus({ message, isError });
  }, []);

  const showChatStatusMessage = useCallback((message, isError = false) => {
    setChatStatus({ message, isError });
  }, []);

  const closeDrawer = useCallback(() => setDrawerOpen(false), []);
  const openDrawer = useCallback(() => setDrawerOpen(true), []);
  const toggleDrawer = useCallback(() => setDrawerOpen((open) => !open), []);

  const refreshRequests = useCallback(async () => {
    const data = await apiFetch('/requests');
    setRequests(data.requests);
    return data.requests;
  }, []);

  const refreshBlocked = useCallback(async () => {
    const data = await apiFetch('/users/blocked');
    setBlocked(data.blocked);
    return data.blocked;
  }, []);

  const loadMessages = useCallback(async (friend) => {
    if (!friend) {
      setMessages([]);
      return;
    }
    const data = await apiFetch(`/messages?friend=${encodeURIComponent(friend.name)}`);
    setMessages(data.messages);
  }, []);

  const loadCommunity = useCallback(async () => {
    const [friendsData, serversData] = await Promise.all([
      apiFetch('/friends'),
      apiFetch('/servers'),
    ]);
    setFriends(friendsData.friends);
    setServers(serversData.servers);
    await refreshRequests();
    await refreshBlocked();
    return { friends: friendsData.friends, servers: serversData.servers };
  }, [refreshBlocked, refreshRequests]);

  const selectFriend = useCallback((friend) => {
    setActiveChatFriend(friend);
    setActiveNavView('friends');
    closeDrawer();
    showChatStatusMessage('');
    loadMessages(friend);
  }, [closeDrawer, loadMessages, showChatStatusMessage]);

  const switchNavView = useCallback(async (view) => {
    setActiveNavView(view);
    if (view === 'requests') {
      await refreshRequests();
      closeDrawer();
    } else if (view === 'blocked') {
      await refreshBlocked();
      closeDrawer();
    } else if (activeChatFriend) {
      await loadMessages(activeChatFriend);
    } else {
      setMessages([]);
    }
  }, [activeChatFriend, closeDrawer, loadMessages, refreshBlocked, refreshRequests]);

  const startPolling = useCallback(() => {
    if (pollTimer.current) clearInterval(pollTimer.current);
    pollTimer.current = setInterval(async () => {
      if (!currentUser) return;
      try {
        const newRequests = await refreshRequests();
        if (activeNavView === 'friends' && activeChatFriend) {
          await loadMessages(activeChatFriend);
        }
        const friendsData = await apiFetch('/friends');
        setFriends((prev) => (friendsData.friends.length !== prev.length ? friendsData.friends : prev));
        setRequests(newRequests);
      } catch {
        // ignore polling errors
      }
    }, 3000);
  }, [activeChatFriend, activeNavView, currentUser, loadMessages, refreshRequests]);

  const stopPolling = useCallback(() => {
    if (pollTimer.current) {
      clearInterval(pollTimer.current);
      pollTimer.current = null;
    }
  }, []);

  useEffect(() => {
    if (screen === 'chat' && currentUser) {
      startPolling();
      return stopPolling;
    }
    stopPolling();
    return undefined;
  }, [screen, currentUser, startPolling, stopPolling]);

  useEffect(() => {
    if (!selectedGroupId && servers.length) {
      setSelectedGroupId(servers[0].id);
    }
  }, [servers, selectedGroupId]);

  useEffect(() => {
    if (screen !== 'chat' || activeChatFriend || !friends.length) return;
    const timer = setTimeout(() => {
      setActiveChatFriend((prev) => prev || friends[0]);
      loadMessages(friends[0]);
    }, 60);
    return () => clearTimeout(timer);
  }, [screen, friends, activeChatFriend, loadMessages]);

  useEffect(() => {
    if (activeChatFriend) loadMessages(activeChatFriend);
  }, [activeChatFriend, loadMessages]);

  useEffect(() => {
    const restore = async () => {
      const token = getToken();
      if (!token) return;
      try {
        const data = await apiFetch('/auth/me');
        setCurrentUser(data.user);
        setScreen('chat');
        showAuthStatus(`Welcome back, ${data.user.username}!`);
        await loadCommunity();
      } catch {
        clearToken();
      }
    };
    restore();
  }, [loadCommunity, showAuthStatus]);

  useEffect(() => {
    const onTouchStart = (event) => {
      if (event.touches.length !== 1) return;
      drawerTouchStart.current = event.touches[0].clientX;
    };
    const onTouchMove = (event) => {
      if (drawerTouchStart.current == null || event.touches.length !== 1) return;
      const deltaX = event.touches[0].clientX - drawerTouchStart.current;
      if (!drawerOpen && drawerTouchStart.current < 40 && deltaX > 80) {
        openDrawer();
        drawerTouchStart.current = null;
      }
      if (drawerOpen && deltaX < -80) {
        closeDrawer();
        drawerTouchStart.current = null;
      }
    };
    const onTouchEnd = () => {
      drawerTouchStart.current = null;
    };
    document.addEventListener('touchstart', onTouchStart);
    document.addEventListener('touchmove', onTouchMove);
    document.addEventListener('touchend', onTouchEnd);
    return () => {
      document.removeEventListener('touchstart', onTouchStart);
      document.removeEventListener('touchmove', onTouchMove);
      document.removeEventListener('touchend', onTouchEnd);
    };
  }, [closeDrawer, drawerOpen, openDrawer]);

  const handleLogin = async (username, password) => {
    if (username.length < 3) {
      showAuthStatus('Username must be at least 3 characters.', true);
      return;
    }
    if (password.length < 4) {
      showAuthStatus('Password must be at least 4 characters.', true);
      return;
    }
    try {
      try {
        const data = await apiFetch('/auth/login', { method: 'POST', body: { username, password } });
        saveToken(data.token);
        setCurrentUser(data.user);
        setScreen('chat');
        showAuthStatus(`Welcome back, ${data.user.username}!`);
        await loadCommunity();
      } catch (loginError) {
        if (loginError.status === 404) {
          const data = await apiFetch('/auth/register', { method: 'POST', body: { username, password } });
          saveToken(data.token);
          setCurrentUser(data.user);
          setScreen('chat');
          showAuthStatus('Account created. You can now chat with other people!');
          await loadCommunity();
        } else if (loginError.status === 401) {
          showAuthStatus('Incorrect password.', true);
          setShowReset(true);
          setResetUsername(username);
        } else {
          showAuthStatus(loginError.message, true);
        }
      }
    } catch (error) {
      showAuthStatus(error.message, true);
    }
  };

  const handleResetPassword = async (username, password) => {
    if (!username || password.length < 4) {
      showAuthStatus('Enter a new password with at least 4 characters.', true);
      return;
    }
    if (!confirm(`Reset password for ${username}?`)) return;
    try {
      const data = await apiFetch('/auth/reset-password', {
        method: 'POST',
        body: { username, password },
      });
      saveToken(data.token);
      setCurrentUser(data.user);
      setScreen('chat');
      showAuthStatus('Password reset. Signing you in...');
      await loadCommunity();
    } catch (error) {
      showAuthStatus(error.message, true);
    }
  };

  const handleLogout = () => {
    setScreen('landing');
    setCurrentUser(null);
    clearToken();
    stopPolling();
    closeDrawer();
    showAuthStatus('Logged out. Ready to connect.');
  };

  const openAddFriendModal = () => {
    setAddFriendOpen(true);
    setAddFriendStatus({ message: '', type: '' });
    setAddFriendInput('');
    setUserSuggestions([]);
  };

  const closeAddFriendModal = () => setAddFriendOpen(false);

  const refreshUserSuggestions = async (query) => {
    const q = query.trim();
    if (q.length < 2) {
      setUserSuggestions([]);
      return;
    }
    try {
      const data = await apiFetch(`/users/search?q=${encodeURIComponent(q)}`);
      setUserSuggestions(data.users);
    } catch {
      setUserSuggestions([]);
    }
  };

  const sendFriendRequest = async (username) => {
    const target = username.trim().replace(/\s+/g, ' ');
    if (!target) {
      setAddFriendStatus({ message: 'Enter a username first.', type: 'error' });
      return false;
    }
    try {
      const data = await apiFetch('/requests', { method: 'POST', body: { to: target } });
      setAddFriendStatus({ message: `Friend request sent to ${data.request.to}.`, type: 'success' });
      setTimeout(closeAddFriendModal, 1200);
      return true;
    } catch (error) {
      if (error.code === 'incoming_exists') {
        setAddFriendStatus({
          message: `${target} already sent you a request. Open Message Requests.`,
          type: 'error',
        });
        await switchNavView('requests');
        return false;
      }
      let message = error.message;
      if (error.suggestions?.length) {
        message += ` Available users: ${error.suggestions.join(', ')}`;
      }
      setAddFriendStatus({ message, type: 'error' });
      return false;
    }
  };

  const acceptFriendRequest = async (requestId) => {
    try {
      const data = await apiFetch(`/requests/${requestId}/accept`, {
        method: 'POST',
        body: { groupId: selectedGroupId },
      });
      setFriends(data.friends);
      await refreshRequests();
      const acceptedFriend = data.friends.find((friend) => friend.name === data.request.from);
      if (acceptedFriend) selectFriend(acceptedFriend);
      else await switchNavView('friends');
    } catch (error) {
      showChatStatusMessage(error.message, true);
    }
  };

  const declineFriendRequest = async (requestId) => {
    try {
      await apiFetch(`/requests/${requestId}/decline`, { method: 'POST' });
      await refreshRequests();
    } catch (error) {
      showChatStatusMessage(error.message, true);
    }
  };

  const clearActiveChat = () => {
    setActiveChatFriend(null);
    setMessages([]);
    showChatStatusMessage('');
  };

  const removeFriend = async (username) => {
    if (!username || !confirm(`Remove ${username} from your friends?`)) return;
    try {
      const data = await apiFetch('/friends/remove', { method: 'POST', body: { username } });
      setFriends(data.friends);
      if (activeChatFriend?.name.toLowerCase() === username.toLowerCase()) {
        clearActiveChat();
      }
      showChatStatusMessage(`Removed ${data.removed} from friends.`);
      setTimeout(() => showChatStatusMessage(''), 3000);
    } catch (error) {
      showChatStatusMessage(error.message, true);
    }
  };

  const blockUser = async (username, fromRequest = false) => {
    if (!username) return;
    const action = fromRequest
      ? `Block ${username}?`
      : `Block ${username}? They cannot message you or send requests.`;
    if (!confirm(action)) return;
    try {
      await apiFetch('/users/block', { method: 'POST', body: { username } });
      if (activeChatFriend?.name.toLowerCase() === username.toLowerCase()) {
        clearActiveChat();
      }
      const friendsData = await apiFetch('/friends');
      setFriends(friendsData.friends);
      await refreshRequests();
      await refreshBlocked();
      showChatStatusMessage(`Blocked ${username}.`);
      setTimeout(() => showChatStatusMessage(''), 3000);
    } catch (error) {
      showChatStatusMessage(error.message, true);
    }
  };

  const unblockUser = async (username) => {
    try {
      await apiFetch('/users/unblock', { method: 'POST', body: { username } });
      await refreshBlocked();
      showChatStatusMessage(`Unblocked ${username}.`);
    } catch (error) {
      showChatStatusMessage(error.message, true);
    }
  };

  const addServer = async (name) => {
    const trimmed = name.trim();
    if (!trimmed) return;
    const data = await apiFetch('/servers', { method: 'POST', body: { name: trimmed } });
    setServers((prev) => [...prev, data.server]);
  };

  const deleteCurrentServer = async () => {
    if (!selectedGroupId) return;
    const server = servers.find((item) => item.id === selectedGroupId);
    if (!server || !confirm(`Delete server "${server.name}"? Friends will move to another server.`)) return;
    try {
      const data = await apiFetch(`/servers/${selectedGroupId}`, { method: 'DELETE' });
      setServers(data.servers);
      setSelectedGroupId(data.servers[0]?.id || null);
      showChatStatusMessage(`Deleted server ${server.name}.`);
    } catch (error) {
      showChatStatusMessage(error.message, true);
    }
  };

  const sendMessage = async (content) => {
    const text = content.trim();
    if (!text || !currentUser || !activeChatFriend) return;
    await apiFetch('/messages', {
      method: 'POST',
      body: {
        content: text,
        groupId: selectedGroupId,
        recipient: activeChatFriend.name,
      },
    });
    await loadMessages(activeChatFriend);
    showChatStatusMessage('');
  };

  const value = {
    screen,
    setScreen,
    authStatus,
    showAuthStatus,
    showReset,
    resetUsername,
    currentUser,
    friends,
    servers,
    requests,
    blocked,
    selectedGroupId,
    setSelectedGroupId,
    activeChatFriend,
    activeNavView,
    messages,
    chatStatus,
    drawerOpen,
    addFriendOpen,
    addFriendInput,
    setAddFriendInput,
    addFriendStatus,
    userSuggestions,
    handleLogin,
    handleResetPassword,
    handleLogout,
    openDrawer,
    closeDrawer,
    toggleDrawer,
    switchNavView,
    selectFriend,
    openAddFriendModal,
    closeAddFriendModal,
    refreshUserSuggestions,
    sendFriendRequest,
    acceptFriendRequest,
    declineFriendRequest,
    removeFriend,
    blockUser,
    unblockUser,
    addServer,
    deleteCurrentServer,
    sendMessage,
    showChatStatusMessage,
  };

  return <ChatContext.Provider value={value}>{children}</ChatContext.Provider>;
}

export function useChat() {
  const context = useContext(ChatContext);
  if (!context) throw new Error('useChat must be used within ChatProvider');
  return context;
}
