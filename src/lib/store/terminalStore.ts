import { create } from "zustand";

type State = {
  lines: string[];
};

type Actions = {
  append: (line: string) => void;
  clear: () => void;
};

export const useTerminalStore = create<State & Actions>((set) => ({
  lines: ["$ Ready"],
  append: (line) => set((s) => ({ lines: [...s.lines.slice(-500), line] })), // cap buffer
  clear: () => set({ lines: ["$ Cleared"] }),
}));