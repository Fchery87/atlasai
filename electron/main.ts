/**
 * Electron Main Process
 * Handles native desktop application functionality
 */

import { app, BrowserWindow, Menu, shell, ipcMain, dialog } from "electron";
import { join } from "path";
import { fileURLToPath } from "url";
import { readFileSync, writeFileSync } from "fs";

const __dirname = fileURLToPath(new URL(".", import.meta.url));
const isDev = process.env.NODE_ENV === "development";

let mainWindow: BrowserWindow | null = null;

// Handle creating/removing shortcuts on Windows when installing/uninstalling
if (require("electron-squirrel-startup")) {
  app.quit();
}

/**
 * Create the main application window
 */
function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 800,
    minHeight: 600,
    title: "BoltForge",
    backgroundColor: "#ffffff",
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: true,
      preload: join(__dirname, "preload.js"),
    },
    icon: join(__dirname, "../public/icons/icon-512x512.png"),
  });

  // Load the app
  if (isDev) {
    mainWindow.loadURL("http://localhost:5173");
    mainWindow.webContents.openDevTools();
  } else {
    mainWindow.loadFile(join(__dirname, "../dist/index.html"));
  }

  // Handle external links
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: "deny" };
  });

  // Window event handlers
  mainWindow.on("closed", () => {
    mainWindow = null;
  });

  // Set up application menu
  setupMenu();
}

/**
 * Set up application menu
 */
function setupMenu() {
  const template: Electron.MenuItemConstructorOptions[] = [
    {
      label: "File",
      submenu: [
        {
          label: "New Project",
          accelerator: "CmdOrCtrl+N",
          click: () => {
            mainWindow?.webContents.send("menu-action", "new-project");
          },
        },
        {
          label: "Open Project",
          accelerator: "CmdOrCtrl+O",
          click: async () => {
            const result = await dialog.showOpenDialog(mainWindow!, {
              properties: ["openDirectory"],
              title: "Open Project",
            });
            if (!result.canceled && result.filePaths.length > 0) {
              mainWindow?.webContents.send(
                "menu-action",
                "open-project",
                result.filePaths[0],
              );
            }
          },
        },
        { type: "separator" },
        {
          label: "Save",
          accelerator: "CmdOrCtrl+S",
          click: () => {
            mainWindow?.webContents.send("menu-action", "save");
          },
        },
        {
          label: "Save As...",
          accelerator: "CmdOrCtrl+Shift+S",
          click: async () => {
            const result = await dialog.showSaveDialog(mainWindow!, {
              title: "Save Project",
              defaultPath: "project.zip",
              filters: [{ name: "ZIP Archive", extensions: ["zip"] }],
            });
            if (!result.canceled && result.filePath) {
              mainWindow?.webContents.send(
                "menu-action",
                "save-as",
                result.filePath,
              );
            }
          },
        },
        { type: "separator" },
        { role: "quit" },
      ],
    },
    {
      label: "Edit",
      submenu: [
        { role: "undo" },
        { role: "redo" },
        { type: "separator" },
        { role: "cut" },
        { role: "copy" },
        { role: "paste" },
        { role: "delete" },
        { type: "separator" },
        { role: "selectAll" },
      ],
    },
    {
      label: "View",
      submenu: [
        { role: "reload" },
        { role: "forceReload" },
        { role: "toggleDevTools" },
        { type: "separator" },
        { role: "resetZoom" },
        { role: "zoomIn" },
        { role: "zoomOut" },
        { type: "separator" },
        { role: "togglefullscreen" },
      ],
    },
    {
      label: "Window",
      submenu: [
        { role: "minimize" },
        { role: "zoom" },
        { type: "separator" },
        { role: "close" },
      ],
    },
    {
      label: "Help",
      submenu: [
        {
          label: "Documentation",
          click: () => {
            shell.openExternal("https://github.com/yourusername/boltforge");
          },
        },
        {
          label: "Report Issue",
          click: () => {
            shell.openExternal(
              "https://github.com/yourusername/boltforge/issues",
            );
          },
        },
        { type: "separator" },
        {
          label: "About",
          click: () => {
            dialog.showMessageBox(mainWindow!, {
              type: "info",
              title: "About BoltForge",
              message: "BoltForge",
              detail: `Version: ${app.getVersion()}\nElectron: ${process.versions.electron}\nChrome: ${process.versions.chrome}\nNode: ${process.versions.node}`,
            });
          },
        },
      ],
    },
  ];

  const menu = Menu.buildFromTemplate(template);
  Menu.setApplicationMenu(menu);
}

/**
 * IPC Handlers
 */

// Read file
ipcMain.handle("read-file", async (_event, filePath: string) => {
  try {
    const content = readFileSync(filePath, "utf-8");
    return { success: true, content };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
});

// Write file
ipcMain.handle(
  "write-file",
  async (_event, filePath: string, content: string) => {
    try {
      writeFileSync(filePath, content, "utf-8");
      return { success: true };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  },
);

// Show open dialog
ipcMain.handle("show-open-dialog", async (_event, options) => {
  return dialog.showOpenDialog(mainWindow!, options);
});

// Show save dialog
ipcMain.handle("show-save-dialog", async (_event, options) => {
  return dialog.showSaveDialog(mainWindow!, options);
});

// Show message box
ipcMain.handle("show-message-box", async (_event, options) => {
  return dialog.showMessageBox(mainWindow!, options);
});

/**
 * App lifecycle
 */

app.whenReady().then(() => {
  createWindow();

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
  }
});

// Handle second instance
const gotTheLock = app.requestSingleInstanceLock();

if (!gotTheLock) {
  app.quit();
} else {
  app.on("second-instance", () => {
    if (mainWindow) {
      if (mainWindow.isMinimized()) mainWindow.restore();
      mainWindow.focus();
    }
  });
}
