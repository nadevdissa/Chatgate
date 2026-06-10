import { useChat } from '../context/ChatContext';

export default function LandingScreen({ active }) {
  const { setScreen, showAuthStatus } = useChat();

  const openAuth = () => {
    setScreen('auth');
    showAuthStatus('Create an account or sign in to join the chat.');
  };

  return (
    <section className={`screen landing-screen${active ? ' active' : ''}`}>
      <div className="landing-card">
        <div className="landing-hero">
          <div className="brand-icon logo-shake">💬</div>
          <div>
            <h1>Welcome to ChatGate</h1>
            <p>Enter the gate and start chatting with anyone online.</p>
          </div>
        </div>
        <button type="button" className="btn primary" onClick={openAuth}>
          Open the gate
        </button>
      </div>
    </section>
  );
}
