/**
 * 网关鉴权配置 Hook
 */

import { useCallback, useState } from 'react';
import type { AppConfig, GatewayAuthConfig } from '../../shared/types';
import * as ipc from '../lib/ipc';

export function useGatewayAuth(config: AppConfig | null, setConfig: (config: AppConfig) => void) {
  const [generating, setGenerating] = useState(false);
  const gatewayAuth = config?.gatewayAuth ?? { enabled: false, apiKey: '' };

  const saveGatewayAuth = useCallback(
    async (nextGatewayAuth: GatewayAuthConfig) => {
      if (!config) return;
      const updated = await ipc.saveConfig({ gatewayAuth: nextGatewayAuth });
      setConfig(updated);
    },
    [config, setConfig]
  );

  const generateApiKey = useCallback(async () => {
    setGenerating(true);
    try {
      const apiKey = await ipc.generateGatewayApiKey();
      return apiKey;
    } finally {
      setGenerating(false);
    }
  }, []);

  return {
    gatewayAuth,
    generating,
    saveGatewayAuth,
    generateApiKey,
  } as const;
}
