import { useChat } from './context/ChatContext';
import LandingScreen from './components/LandingScreen';
import AuthScreen from './components/AuthScreen';
import ChatScreen from './components/ChatScreen';

export default function App() {
  const { screen } = useChat();

  return (
    <div className="app-shell">
      <LandingScreen active={screen === 'landing'} />
      <AuthScreen active={screen === 'auth'} />
      <ChatScreen active={screen === 'chat'} />
    </div>
  );
}
