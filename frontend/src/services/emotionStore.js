// frontend/src/services/emotionStore.js
import { create } from 'zustand';

const useEmotionStore = create((set) => ({
  counts: {},
  init: (emotions) => set(() => ({
    counts: emotions.reduce((acc, emotion) => ({ ...acc, [emotion]: 0 }), {})
  })),
  increment: (emotion) => set((state) => {
    if (Object.prototype.hasOwnProperty.call(state.counts, emotion)) {
      // --- DEBUG LOG ---
      console.log(`%c[EmotionStore] Incrementing "${emotion}". Old: ${state.counts[emotion]}, New: ${state.counts[emotion] + 1}`, 'color: #9333ea;');
      return {
        counts: { ...state.counts, [emotion]: state.counts[emotion] + 1 }
      };
    }
    // This warning is already good.
    console.warn(`[EmotionStore] Attempted to increment an uninitialized emotion: "${emotion}". Make sure it's in EMOTIONS_LIST.`);
    return state;
  }),
  reset: () => set((state) => ({
    counts: Object.keys(state.counts).reduce((acc, key) => ({ ...acc, [key]: 0 }), {})
  })),
}));

export default useEmotionStore;