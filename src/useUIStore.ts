import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import type { TabType } from '@/components/AI/TabBar.tsx';

interface IUIStore {
  activeTab: TabType;
  setActiveTab: (tab: TabType) => void;
}

export const useUIStore = create<IUIStore>()(
  persist(
    (set) => ({
      activeTab: 'chat',
      setActiveTab: (activeTab) => {
        set({ activeTab });
      },
    }),
    {
      name: 'ui-preferences',
      storage: createJSONStorage(() => localStorage),
    },
  ),
);
