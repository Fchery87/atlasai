/**
 * Electron Preload Script
 * Exposes safe IPC methods to the renderer process
 */

import { contextBridge, ipcRenderer } from "electron";

export type ElectronAPI = {
  // File system operations
  readFile: (
    filePath: string,
  ) => Promise<{ success: boolean; content?: string; error?: string }>;
  writeFile: (
    filePath: string,
    content: string,
  ) => Promise<{ success: boolean; error?: string }>;

  // Dialog operations
  showOpenDialog: (
    options: Electron.OpenDialogOptions,
  ) => Promise<Electron.OpenDialogReturnValue>;
  showSaveDialog: (
    options: Electron.SaveDialogOptions,
  ) => Promise<Electron.SaveDialogReturnValue>;
  showMessageBox: (
    options: Electron.MessageBoxOptions,
  ) => Promise<Electron.MessageBoxReturnValue>;

  // Menu actions
  onMenuAction: (
    callback: (action: string, ...args: any[]) => void,
  ) => () => void;

  // Platform info
  platform: NodeJS.Platform;
  isElectron: boolean;
};

// Expose protected methods that allow the renderer process to use
// the ipcRenderer without exposing the entire object
contextBridge.exposeInMainWorld("electronAPI", {
  // File system operations
  readFile: (filePath: string) => ipcRenderer.invoke("read-file", filePath),
  writeFile: (filePath: string, content: string) =>
    ipcRenderer.invoke("write-file", filePath, content),

  // Dialog operations
  showOpenDialog: (options: Electron.OpenDialogOptions) =>
    ipcRenderer.invoke("show-open-dialog", options),
  showSaveDialog: (options: Electron.SaveDialogOptions) =>
    ipcRenderer.invoke("show-save-dialog", options),
  showMessageBox: (options: Electron.MessageBoxOptions) =>
    ipcRenderer.invoke("show-message-box", options),

  // Menu actions
  onMenuAction: (callback: (action: string, ...args: any[]) => void) => {
    const subscription = (
      _event: Electron.IpcRendererEvent,
      action: string,
      ...args: any[]
    ) => {
      callback(action, ...args);
    };
    ipcRenderer.on("menu-action", subscription);

    // Return unsubscribe function
    return () => {
      ipcRenderer.removeListener("menu-action", subscription);
    };
  },

  // Platform info
  platform: process.platform,
  isElectron: true,
} as ElectronAPI);

// Type declarations for TypeScript
declare global {
  interface Window {
    electronAPI?: ElectronAPI;
  }
}
