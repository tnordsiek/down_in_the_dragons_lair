import { getAsset, getAssetUrl } from '../data/assets';

type AudioLike = {
  currentTime: number;
  loop: boolean;
  pause: () => void;
  play: () => Promise<unknown> | unknown;
};

type AudioFactory = (src: string) => AudioLike | undefined;

export class RuntimeAudioController {
  private readonly audioFactory: AudioFactory;

  private desiredMusicAssetId: string | undefined;

  private activeMusicAssetId: string | undefined;

  private activeMusicElement: AudioLike | undefined;

  private musicEnabled = true;

  private sfxEnabled = true;

  constructor(audioFactory: AudioFactory = createBrowserAudio) {
    this.audioFactory = audioFactory;
  }

  setMusicEnabled(enabled: boolean) {
    this.musicEnabled = enabled;

    if (!enabled) {
      this.stopMusic();
      return;
    }

    this.syncMusic();
  }

  setSfxEnabled(enabled: boolean) {
    this.sfxEnabled = enabled;
  }

  setMusicTrack(assetId: string | undefined) {
    this.desiredMusicAssetId = assetId;
    this.syncMusic();
  }

  playSfx(assetId: string) {
    if (!this.sfxEnabled) {
      return;
    }

    const audio = this.createAudio(assetId);

    if (!audio) {
      return;
    }

    this.tryPlay(audio);
  }

  dispose() {
    this.stopMusic();
    this.desiredMusicAssetId = undefined;
  }

  private syncMusic() {
    if (!this.musicEnabled || !this.desiredMusicAssetId) {
      this.stopMusic();
      return;
    }

    if (this.activeMusicAssetId === this.desiredMusicAssetId) {
      this.tryPlay(this.activeMusicElement);
      return;
    }

    const audio = this.createAudio(this.desiredMusicAssetId);

    if (!audio) {
      this.stopMusic();
      return;
    }

    const asset = getAsset(this.desiredMusicAssetId);

    this.stopMusic();
    audio.loop = asset.loop ?? false;
    this.activeMusicAssetId = this.desiredMusicAssetId;
    this.activeMusicElement = audio;
    this.tryPlay(audio);
  }

  private stopMusic() {
    if (!this.activeMusicElement) {
      this.activeMusicAssetId = undefined;
      return;
    }

    this.activeMusicElement.pause();
    this.activeMusicElement.currentTime = 0;
    this.activeMusicAssetId = undefined;
    this.activeMusicElement = undefined;
  }

  private createAudio(assetId: string) {
    const assetUrl = getAssetUrl(assetId);

    if (!assetUrl) {
      return undefined;
    }

    try {
      return this.audioFactory(assetUrl);
    } catch {
      return undefined;
    }
  }

  private tryPlay(audio: AudioLike | undefined) {
    if (!audio) {
      return;
    }

    try {
      const result = audio.play();

      if (result && typeof (result as Promise<unknown>).catch === 'function') {
        void (result as Promise<unknown>).catch(() => undefined);
      }
    } catch {
      return;
    }
  }
}

function createBrowserAudio(src: string): AudioLike | undefined {
  if (typeof Audio === 'undefined') {
    return undefined;
  }

  return new Audio(src);
}
