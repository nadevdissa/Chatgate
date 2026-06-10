import { useChat } from '../context/ChatContext';

export default function GroupBar() {
  const {
    servers,
    selectedGroupId,
    setSelectedGroupId,
    switchNavView,
    addServer,
    deleteCurrentServer,
  } = useChat();

  const handleAddServer = async () => {
    const name = prompt('New group name');
    if (!name) return;
    try {
      await addServer(name);
    } catch (error) {
      alert(error.message);
    }
  };

  return (
    <aside className="group-bar">
      <div className="server-stack">
        <div className="server-pill">
          <button
            className="server-icon dm-btn"
            type="button"
            aria-label="Direct Messages"
            onClick={() => switchNavView('friends')}
          >
            <svg className="dm-icon" viewBox="0 0 24 24" aria-hidden="true">
              <rect x="8" y="2" width="8" height="8" rx="2" />
              <rect x="2" y="8" width="8" height="8" rx="2" />
              <rect x="14" y="8" width="8" height="8" rx="2" />
              <rect x="8" y="14" width="8" height="8" rx="2" />
            </svg>
            <span className="server-tooltip">Direct Messages</span>
          </button>
        </div>
        <div className="server-pill">
          <button
            className="server-icon add-server-btn"
            type="button"
            aria-label="Add a Server"
            onClick={handleAddServer}
          >
            <span className="add-server-plus">+</span>
            <span className="server-tooltip">Add a Server</span>
          </button>
        </div>
      </div>
      <div className="group-list">
        {servers.map((server) => (
          <div key={server.id} className="group-item-wrap">
            <button
              type="button"
              className={`group-item${selectedGroupId === server.id ? ' selected' : ''}`}
              title={server.name}
              onClick={() => setSelectedGroupId(server.id)}
            >
              {server.name.slice(0, 2).toUpperCase()}
            </button>
            {selectedGroupId === server.id && servers.length > 1 && (
              <button
                type="button"
                className="group-delete-btn"
                title={`Delete ${server.name}`}
                aria-label={`Delete ${server.name}`}
                onClick={(event) => {
                  event.stopPropagation();
                  deleteCurrentServer();
                }}
              >
                ×
              </button>
            )}
          </div>
        ))}
      </div>
    </aside>
  );
}
