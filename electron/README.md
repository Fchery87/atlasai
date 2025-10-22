# Electron Desktop Application

This directory contains the Electron main process code for the BoltForge desktop application.

## Structure

- `main.ts` - Main process entry point
- `preload.ts` - Preload script for secure IPC communication
- `tsconfig.json` - TypeScript configuration for Electron

## Development

### Build Electron code

```bash
npm run electron:build
```

### Start in development mode

```bash
npm run electron:start
```

### Package for distribution

```bash
# Package for current platform
npm run electron:package

# Package for Windows
npm run electron:package:win

# Package for macOS
npm run electron:package:mac

# Package for Linux
npm run electron:package:linux
```

## Features

- Native file system access
- System dialogs (open, save, message boxes)
- Application menus
- Keyboard shortcuts
- Single instance lock
- Auto-updates support (when configured)

## Security

The application follows Electron security best practices:

- Context isolation enabled
- Node integration disabled
- Sandbox enabled
- Preload script for safe IPC
- External links open in system browser

## Distribution

Built applications will be output to `dist-electron/` directory with platform-specific installers:

- **Windows**: NSIS installer (.exe) and portable (.exe)
- **macOS**: DMG image (.dmg) and ZIP archive (.zip)
- **Linux**: AppImage (.AppImage), DEB (.deb), and RPM (.rpm)

## Configuration

Edit `electron-builder.json` in the project root to customize:

- App ID and metadata
- Icons and resources
- Platform-specific options
- Auto-update configuration
- Code signing (requires certificates)

## Requirements

- Node.js 18+ (for Electron 28)
- Platform-specific build tools:
  - Windows: Windows SDK
  - macOS: Xcode
  - Linux: Standard build tools

## Notes

- First run may take longer as Electron downloads platform binaries
- Code signing requires valid certificates for Windows and macOS
- For production releases, configure auto-updates in electron-builder.json
