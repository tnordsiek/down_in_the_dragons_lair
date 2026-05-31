import { AudioRuntime } from './AudioRuntime';
import { useSetupStore } from '../state/setupStore';
import { FeedbackModal } from '../ui/components/FeedbackModal';
import { GameScreen } from '../ui/screens/GameScreen';
import { StartScreen } from '../ui/screens/StartScreen';
import { TutorialScreen } from '../ui/screens/TutorialScreen';

export function App() {
  const gameState = useSetupStore((state) => state.gameState);
  const tutorialActive = useSetupStore((state) => state.tutorialActive);

  return (
    <>
      <AudioRuntime />
      {gameState ? (
        <GameScreen />
      ) : tutorialActive ? (
        <TutorialScreen />
      ) : (
        <StartScreen />
      )}
      <FeedbackModal />
    </>
  );
}
