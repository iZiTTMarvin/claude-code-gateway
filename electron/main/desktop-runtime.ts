/**
 * 桌面运行时能力：托盘、开机自启、窗口关闭行为。
 */

import { app, BrowserWindow, Menu, Tray, nativeImage } from 'electron';
import type { AppSettings } from '../../shared/types';
import { logger } from '../../electron-proxy/utils/logger';

const DEFAULT_SETTINGS: AppSettings = {
  port: 1314,
  minimizeToTrayOnClose: true,
  autoLaunch: false,
};

let tray: Tray | null = null;
let currentSettings: AppSettings = DEFAULT_SETTINGS;
let isQuitting = false;

interface DesktopRuntimeOptions {
  getMainWindow: () => BrowserWindow | null;
  onRestartProxy: () => Promise<void>;
}

function createTrayImage() {
  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 16 16">
      <rect x="1" y="1" width="14" height="14" rx="3" fill="#0f172a"/>
      <path d="M5 4.5h4.5a2.5 2.5 0 0 1 0 5H7v2H5v-7zM7 6.5v1h2.2a.5.5 0 0 0 0-1z" fill="#ffffff"/>
    </svg>
  `.trim();
  return nativeImage.createFromDataURL(
    `data:image/svg+xml;base64,${Buffer.from(svg).toString('base64')}`,
  );
}

function showMainWindow(window: BrowserWindow | null): void {
  if (!window || window.isDestroyed()) {
    return;
  }

  if (window.isMinimized()) {
    window.restore();
  }

  window.show();
  window.focus();
}

export function applyDesktopSettings(settings: AppSettings): void {
  currentSettings = settings;

  if (!app.isPackaged) {
    logger.debug(
      `Desktop settings updated (dev mode, skip OS auto-launch): autoLaunch=${settings.autoLaunch}`,
    );
    return;
  }

  app.setLoginItemSettings({
    openAtLogin: settings.autoLaunch,
    path: process.execPath,
  });
}

export function initializeDesktopRuntime(options: DesktopRuntimeOptions): void {
  if (tray) {
    return;
  }

  tray = new Tray(createTrayImage());
  tray.setToolTip('cc-gateway');

  const buildMenu = () =>
    Menu.buildFromTemplate([
      {
        label: '显示主窗口',
        click: () => showMainWindow(options.getMainWindow()),
      },
      {
        label: '重启网关',
        click: () => {
          void options.onRestartProxy().catch(error => {
            logger.error(
              `Restart proxy from tray failed: ${error instanceof Error ? error.message : String(error)}`,
            );
          });
        },
      },
      { type: 'separator' },
      {
        label: '退出',
        click: () => {
          isQuitting = true;
          app.quit();
        },
      },
    ]);

  tray.setContextMenu(buildMenu());
  tray.on('click', () => showMainWindow(options.getMainWindow()));
}

export function shouldMinimizeToTrayOnClose(): boolean {
  return currentSettings.minimizeToTrayOnClose;
}

export function markAppQuitting(): void {
  isQuitting = true;
}

export function resetAppQuitting(): void {
  isQuitting = false;
}

export function isAppQuitting(): boolean {
  return isQuitting;
}
