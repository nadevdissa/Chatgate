import { useChat } from '../context/ChatContext';
import GroupBar from './GroupBar';
import Sidebar from './Sidebar';
import ChatPanel from './ChatPanel';
import AddFriendModal from './AddFriendModal';

export default function ChatScreen({ active }) {
  const { currentUser, drawerOpen, toggleDrawer, closeDrawer, handleLogout } = useChat();

  return (
    <section className={`screen chat-screen${active ? ' active' : ''}`}>
      <div className="chat-header">
        <div className="chat-header-main">
          <div className="brand-icon small">💬</div>
          <div>
            <h1>ChatGate</h1>
            <p>
              Logged in as <strong>{currentUser?.username || '...'}</strong>
            </p>
          </div>
        </div>
        <button type="button" className="btn secondary" onClick={handleLogout}>
          Log out
        </button>
      </div>

      <button
        type="button"
        className="drawer-toggle"
        aria-label="Open sidebar"
        onClick={toggleDrawer}
      >
        ☰
      </button>
      <div
        className={`drawer-overlay${drawerOpen ? ' open' : ''}`}
        onClick={closeDrawer}
      />

      <div className="chat-layout">
        <GroupBar />
        <Sidebar />
        <ChatPanel />
      </div>

      <AddFriendModal />
    </section>
  );
}
