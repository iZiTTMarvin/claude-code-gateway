/**
 * 桌面应用行为设置 Hook。
 */

import { useCallback, useState } from 'react';
import type { AppConfig, AppSettings } from '../../shared/types';
import * as ipc from '../lib/ipc';

export function useAppSettings(config: AppConfig | null, setConfig: (config: AppConfig) => void) {
  const [saving, setSaving] = useState(false);
  const appSettings = config?.appSettings ?? {
    port: 1314,
    minimizeToTrayOnClose: true,
    autoLaunch: false,
  };

  const saveAppSettings = useCallback(
    async (nextAppSettings: AppSettings) => {
      if (!config) return;
      setSaving(true);
      try {
        const updated = await ipc.saveConfig({ appSettings: nextAppSettings });
        setConfig(updated);
      } finally {
        setSaving(false);
      }
    },
    [config, setConfig],
  );

  return {
    appSettings,
    saving,
    saveAppSettings,
  } as const;
}
