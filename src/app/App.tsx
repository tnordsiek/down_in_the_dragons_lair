import { useSetupStore } from '../state/setupStore';
import { GameScreen } from '../ui/screens/GameScreen';
import { StartScreen } from '../ui/screens/StartScreen';

export function App() {
  const gameState = useSetupStore((state) => state.gameState);

  return gameState ? <GameScreen /> : <StartScreen />;
}
