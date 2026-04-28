import { create } from 'zustand';

type SetupState = {
  selectedHeroId: string;
  aiCount: number;
  setSelectedHeroId: (heroId: string) => void;
  setAiCount: (aiCount: number) => void;
};

export const useSetupStore = create<SetupState>((set) => ({
  selectedHeroId: 'hero_mage',
  aiCount: 1,
  setSelectedHeroId: (selectedHeroId) => set({ selectedHeroId }),
  setAiCount: (aiCount) => set({ aiCount }),
}));
