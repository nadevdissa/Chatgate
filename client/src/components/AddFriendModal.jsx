import { useChat } from '../context/ChatContext';

export default function AddFriendModal() {
  const {
    addFriendOpen,
    addFriendInput,
    setAddFriendInput,
    addFriendStatus,
    userSuggestions,
    closeAddFriendModal,
    refreshUserSuggestions,
    sendFriendRequest,
  } = useChat();

  if (!addFriendOpen) return null;

  return (
    <div
      className="add-friend-modal"
      onClick={(event) => {
        if (event.target === event.currentTarget) closeAddFriendModal();
      }}
    >
      <div className="add-friend-card">
        <h3>Add Friend</h3>
        <p className="hint">
          Enter their exact username (for example: <strong>Nadev</strong>)
        </p>
        <input
          type="text"
          placeholder="Username"
          autoComplete="off"
          value={addFriendInput}
          onChange={(event) => {
            setAddFriendInput(event.target.value);
            refreshUserSuggestions(event.target.value);
          }}
          onKeyDown={(event) => {
            if (event.key === 'Enter') {
              event.preventDefault();
              sendFriendRequest(addFriendInput);
            }
          }}
          autoFocus
        />
        <ul className="user-suggestions">
          {userSuggestions.map((username) => (
            <li key={username}>
              <button
                type="button"
                onClick={() => {
                  setAddFriendInput(username);
                  refreshUserSuggestions('');
                }}
              >
                {username}
              </button>
            </li>
          ))}
        </ul>
        <p className={`add-friend-status${addFriendStatus.type ? ` ${addFriendStatus.type}` : ''}`}>
          {addFriendStatus.message}
        </p>
        <div className="add-friend-actions">
          <button type="button" className="btn secondary" onClick={closeAddFriendModal}>
            Cancel
          </button>
          <button
            type="button"
            className="btn primary"
            onClick={() => sendFriendRequest(addFriendInput)}
          >
            Send Request
          </button>
        </div>
      </div>
    </div>
  );
}
