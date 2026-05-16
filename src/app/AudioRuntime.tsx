import { useEffect, useRef } from 'react';

import { RuntimeAudioController } from '../audio/runtimeAudio';
import { useSetupStore } from '../state/setupStore';

export function AudioRuntime() {
  const controllerRef = useRef<RuntimeAudioController | null>(null);
  const gameState = useSetupStore((state) => state.gameState);
  const musicEnabled = useSetupStore((state) => state.musicEnabled);
  const sfxEnabled = useSetupStore((state) => state.sfxEnabled);
  const pendingAudioCues = useSetupStore((state) => state.pendingAudioCues);
  const clearPendingAudioCues = useSetupStore(
    (state) => state.clearPendingAudioCues,
  );
  const currentMusicTrackAssetId = !gameState
    ? 'music_menu_loop'
    : gameState.phase === 'game_over'
      ? 'music_end_screen'
      : 'music_game_loop';

  if (!controllerRef.current) {
    controllerRef.current = new RuntimeAudioController();
  }

  useEffect(() => {
    const controller = controllerRef.current;

    return () => controller?.dispose();
  }, []);

  useEffect(() => {
    const controller = controllerRef.current;

    controller?.setMusicEnabled(musicEnabled);
  }, [musicEnabled]);

  useEffect(() => {
    const controller = controllerRef.current;

    controller?.setSfxEnabled(sfxEnabled);
  }, [sfxEnabled]);

  useEffect(() => {
    const controller = controllerRef.current;

    controller?.setMusicTrack(currentMusicTrackAssetId);
  }, [currentMusicTrackAssetId]);

  useEffect(() => {
    if (pendingAudioCues.length === 0) {
      return;
    }

    const controller = controllerRef.current;

    for (const cue of pendingAudioCues) {
      controller?.playSfx(cue.assetId);
    }

    clearPendingAudioCues();
  }, [clearPendingAudioCues, pendingAudioCues]);

  return null;
}
