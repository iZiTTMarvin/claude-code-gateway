/**
 * Electron 主进程入口
 */

import { app, BrowserWindow, dialog, shell } from 'electron';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { registerIPCHandlers } from './ipc-handlers';
import { startProxy, stopProxy } from './proxy-manager';
import { getConfig } from './config-store';
import {
  applyDesktopSettings,
  initializeDesktopRuntime,
  isAppQuitting,
  markAppQuitting,
  shouldMinimizeToTrayOnClose,
} from './desktop-runtime';
import { logger } from '../../electron-proxy/utils/logger';

/** 全局未捕获错误兜底 */
process.on('unhandledRejection', reason => {
  logger.error(`Unhandled rejection: ${String(reason)}`);
});

process.on('uncaughtException', error => {
  logger.error(`Uncaught exception: ${error.message}\n${error.stack}`);
  dialog.showErrorBox(
    'cc-gateway 发生致命错误',
    `${error.message}\n\n应用将关闭，请查看日志获取详情。`
  );
  app.exit(1);
});

/** 禁用 GPU 加速（避免某些系统兼容性问题） */
app.disableHardwareAcceleration();

let mainWindow: BrowserWindow | null = null;

const VITE_DEV_SERVER_URL = process.env.VITE_DEV_SERVER_URL;
const currentDir = path.dirname(fileURLToPath(import.meta.url));
const shouldAutoOpenDevTools =
  Boolean(VITE_DEV_SERVER_URL) && process.env.CC_GATEWAY_OPEN_DEVTOOLS === '1';

function createWindow(): void {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 780,
    minWidth: 900,
    minHeight: 600,
    title: 'cc-gateway',
    webPreferences: {
      // preload 脚本必须使用 .cjs，避免在 type:module 下被按 ESM 解析
      preload: path.join(currentDir, '../preload/index.cjs'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
    },
  });

  // 注册 IPC handler
  registerIPCHandlers(mainWindow);

  mainWindow.on('close', event => {
    if (isAppQuitting()) {
      return;
    }

    if (shouldMinimizeToTrayOnClose()) {
      event.preventDefault();
      mainWindow?.hide();
    }
  });

  // 外部链接用浏览器打开
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: 'deny' };
  });

  if (VITE_DEV_SERVER_URL) {
    mainWindow.loadURL(VITE_DEV_SERVER_URL);
    if (shouldAutoOpenDevTools) {
      mainWindow.webContents.openDevTools();
    }
  } else {
    mainWindow.loadFile(path.join(currentDir, '../../dist/index.html'));
  }
}

app.whenReady().then(async () => {
  const config = await getConfig();
  applyDesktopSettings(config.appSettings);

  createWindow();
  initializeDesktopRuntime({
    getMainWindow: () => mainWindow,
    onRestartProxy: async () => {
      await stopProxy();
      await startProxy(getConfig);
    },
  });

  // 自动启动代理
  try {
    await startProxy(getConfig);
  } catch (err) {
    // 启动失败不影响窗口展示，用户可在 UI 中看到错误状态
    logger.error(`Auto-start proxy failed: ${err instanceof Error ? err.message : String(err)}`);
  }

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('before-quit', () => {
  markAppQuitting();
});

app.on('window-all-closed', async () => {
  await stopProxy();
  app.quit();
});

// Required for ESM module export detection in Node.js
export default app;
