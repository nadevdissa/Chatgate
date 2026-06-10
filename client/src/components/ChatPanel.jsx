import { useEffect, useRef, useState } from 'react';
import { useChat } from '../context/ChatContext';

function RequestList() {
  const { requests, acceptFriendRequest, declineFriendRequest, blockUser } = useChat();

  if (!requests.length) {
    return <li className="request-empty">No pending friend requests right now.</li>;
  }

  return requests.map((request) => (
    <li key={request.id} className="request-item">
      <div className="request-avatar">{request.from.slice(0, 2).toUpperCase()}</div>
      <div className="request-details">
        <strong>{request.from}</strong>
        <span>Sent you a friend request.</span>
      </div>
      <div className="request-actions">
        <button
          type="button"
          className="btn primary small"
          onClick={() => acceptFriendRequest(request.id)}
        >
          Accept
        </button>
        <button
          type="button"
          className="btn secondary small"
          onClick={() => declineFriendRequest(request.id)}
        >
          Ignore
        </button>
        <button
          type="button"
          className="btn secondary small danger"
          onClick={() => blockUser(request.from, true)}
        >
          Block
        </button>
      </div>
    </li>
  ));
}

function BlockedList() {
  const { blocked, unblockUser } = useChat();

  if (!blocked.length) {
    return <li className="request-empty">No blocked users.</li>;
  }

  return blocked.map((entry) => (
    <li key={entry.username} className="request-item">
      <div className="request-avatar">{entry.username.slice(0, 2).toUpperCase()}</div>
      <div className="request-details">
        <strong>{entry.username}</strong>
        <span>Blocked user</span>
      </div>
      <div className="request-actions">
        <button
          type="button"
          className="btn secondary small"
          onClick={() => unblockUser(entry.username)}
        >
          Unblock
        </button>
      </div>
    </li>
  ));
}

function MessageList() {
  const { messages, currentUser, activeChatFriend } = useChat();

  if (!activeChatFriend) {
    return (
      <div className="message-row">
        <div className="message-bubble">Select a friend to start chatting.</div>
      </div>
    );
  }

  if (!messages.length) {
    return (
      <div className="message-row">
        <div className="message-bubble">No messages in this chat yet.</div>
      </div>
    );
  }

  return messages.map((message) => (
    <div
      key={message.id}
      className={`message-row${
        message.sender?.toLowerCase() === currentUser?.username?.toLowerCase() ? ' self' : ''
      }`}
    >
      <div className="message-bubble">{message.content}</div>
      <div className="message-meta">
        {message.sender} ·{' '}
        {new Date(message.sent_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
      </div>
    </div>
  ));
}

export default function ChatPanel() {
  const {
    activeNavView,
    activeChatFriend,
    servers,
    selectedGroupId,
    chatStatus,
    openAddFriendModal,
    removeFriend,
    blockUser,
    deleteCurrentServer,
    messages,
    sendMessage,
    showChatStatusMessage,
  } = useChat();

  const [messageInput, setMessageInput] = useState('');
  const messagesRef = useRef(null);

  useEffect(() => {
    if (messagesRef.current) {
      messagesRef.current.scrollTop = messagesRef.current.scrollHeight;
    }
  }, [messages, activeChatFriend]);

  const showChatActions = activeChatFriend && activeNavView === 'friends';
  const hideAddFriend = activeChatFriend && activeNavView === 'friends';
  const currentServer = servers.find((server) => server.id === selectedGroupId);
  const showDeleteServer = currentServer && servers.length > 1 && activeNavView === 'friends';

  const onSubmit = async (event) => {
    event.preventDefault();
    const text = messageInput.trim();
    if (!text) return;
    if (!activeChatFriend) {
      showChatStatusMessage('Select a friend from Direct Messages first.', true);
      return;
    }
    try {
      await sendMessage(text);
      setMessageInput('');
    } catch (error) {
      showChatStatusMessage(error.message, true);
    }
  };

  return (
    <main className="chat-panel">
      <div className="main-top">
        {activeNavView === 'friends' && (
          <div className="main-nav friends-nav">
            <div className="nav-left">
              <strong>{activeChatFriend ? activeChatFriend.name : 'Friends'}</strong>
              <button className="tab small active" type="button">
                All
              </button>
            </div>
            <div className="nav-right">
              {showChatActions && (
                <div className="chat-actions">
                  <button
                    type="button"
                    className="btn secondary small"
                    onClick={() => removeFriend(activeChatFriend.name)}
                  >
                    Unfriend
                  </button>
                  <button
                    type="button"
                    className="btn secondary small danger"
                    onClick={() => blockUser(activeChatFriend.name)}
                  >
                    Block
                  </button>
                </div>
              )}
              {showDeleteServer && (
                <button
                  type="button"
                  className="btn secondary small danger"
                  onClick={deleteCurrentServer}
                >
                  Delete Server
                </button>
              )}
              {!hideAddFriend && (
                <button type="button" className="btn primary small" onClick={openAddFriendModal}>
                  Add Friend
                </button>
              )}
            </div>
          </div>
        )}

        {activeNavView === 'requests' && (
          <div className="main-nav requests-nav">
            <div className="nav-left">
              <span className="nav-icon" aria-hidden="true">
                ✉️
              </span>
              <strong>Message Requests</strong>
              <span className="nav-separator" aria-hidden="true">
                ·
              </span>
              <button className="tab small active" type="button">
                Requests
              </button>
            </div>
          </div>
        )}

        {activeNavView === 'blocked' && (
          <div className="main-nav blocked-nav">
            <div className="nav-left">
              <span className="nav-icon" aria-hidden="true">
                🚫
              </span>
              <strong>Blocked Users</strong>
            </div>
          </div>
        )}
      </div>

      {activeNavView === 'friends' && (
        <div className="friends-panel">
          {activeChatFriend && (
            <div className="chat-action-bar">
              <button
                type="button"
                className="action-btn unfriend"
                onClick={() => removeFriend(activeChatFriend.name)}
              >
                Unfriend
              </button>
              <button
                type="button"
                className="action-btn block"
                onClick={() => blockUser(activeChatFriend.name)}
              >
                Block
              </button>
            </div>
          )}
          <p
            className={`chat-status${
              chatStatus.isError ? ' error' : chatStatus.message ? ' success' : ''
            }`}
            aria-live="polite"
          >
            {chatStatus.message}
          </p>
          <div className="messages" ref={messagesRef}>
            <MessageList />
          </div>
          <form className="message-form" onSubmit={onSubmit} hidden={!activeChatFriend}>
            <input
              type="text"
              placeholder="Type a message..."
              autoComplete="off"
              value={messageInput}
              onChange={(event) => setMessageInput(event.target.value)}
            />
            <button type="submit" className="btn primary">
              Send
            </button>
          </form>
        </div>
      )}

      {activeNavView === 'requests' && (
        <div className="requests-panel">
          <ul className="request-list">
            <RequestList />
          </ul>
        </div>
      )}

      {activeNavView === 'blocked' && (
        <div className="blocked-panel">
          <ul className="blocked-list">
            <BlockedList />
          </ul>
        </div>
      )}
    </main>
  );
}
