import { useChat } from '../context/ChatContext';

export default function Sidebar() {
  const {
    currentUser,
    friends,
    requests,
    activeChatFriend,
    activeNavView,
    drawerOpen,
    switchNavView,
    selectFriend,
    openAddFriendModal,
    removeFriend,
  } = useChat();

  return (
    <aside className={`chat-sidebar side-drawer${drawerOpen ? ' open' : ''}`}>
      <div className="sidebar-card nav-panel">
        <div className="search-row">
          <input type="text" placeholder="Find or start a conversation" autoComplete="off" />
        </div>

        <ul className="menu-list">
          <li
            className={`menu-item${activeNavView === 'friends' ? ' active' : ''}`}
            onClick={() => switchNavView('friends')}
          >
            <span>💬</span>Friends
          </li>
          <li
            className={`menu-item${activeNavView === 'requests' ? ' active' : ''}`}
            onClick={() => switchNavView('requests')}
          >
            <span>✉️</span>Message Requests
            {requests.length > 0 && (
              <span className="request-badge">{requests.length}</span>
            )}
          </li>
          <li
            className={`menu-item${activeNavView === 'blocked' ? ' active' : ''}`}
            onClick={() => switchNavView('blocked')}
          >
            <span>🚫</span>Blocked
          </li>
        </ul>

        <h4 className="dm-heading">
          Direct Messages{' '}
          <button className="btn secondary small" type="button" onClick={openAddFriendModal}>
            +
          </button>
        </h4>
        <ul className="chat-list">
          {!friends.length ? (
            <li className="chat-list-empty">No chats yet. Add a friend to start talking.</li>
          ) : (
            friends.map((friend) => (
              <li
                key={friend.id}
                className={`chat-list-item${activeChatFriend?.id === friend.id ? ' active' : ''}`}
              >
                <button
                  type="button"
                  className="chat-row-main"
                  onClick={() => selectFriend(friend)}
                >
                  <div className="chat-avatar">{friend.name.slice(0, 2).toUpperCase()}</div>
                  <div className="chat-item-details">
                    <strong>{friend.name}</strong>
                    <span>Tap to chat</span>
                  </div>
                </button>
                <button
                  type="button"
                  className="friend-remove-btn"
                  onClick={(event) => {
                    event.stopPropagation();
                    removeFriend(friend.name);
                  }}
                >
                  Remove
                </button>
              </li>
            ))
          )}
        </ul>

        <div className="sidebar-profile">
          <div className="sidebar-profile-avatar">
            {currentUser?.username.slice(0, 2).toUpperCase()}
          </div>
          <div className="sidebar-profile-info">
            <strong>{currentUser?.username}</strong>
            <span>Logged in</span>
          </div>
        </div>
      </div>
    </aside>
  );
}
