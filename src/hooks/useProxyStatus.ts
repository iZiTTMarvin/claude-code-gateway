/**
 * 代理状态管理 Hook
 */

import { useState, useEffect, useCallback } from 'react';
import type { ProxyStatus } from '../../shared/types';
import * as ipc from '../lib/ipc';

export function useProxyStatus() {
  const [status, setStatus] = useState<ProxyStatus>({
    running: false,
    port: 1314,
  });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let mounted = true;
    let unsubscribe: (() => void) | null = null;

    // 初始化状态并设置监听
    const init = async () => {
      try {
        const status = await ipc.getProxyStatus();
        if (mounted) setStatus(status);

        // 设置状态变更监听
        unsubscribe = await ipc.onProxyStatusChange(newStatus => {
          if (mounted) setStatus(newStatus);
        });
      } catch (err) {
        console.warn('初始化代理状态失败:', err);
      }
    };

    init();

    return () => {
      mounted = false;
      if (unsubscribe) unsubscribe();
    };
  }, []);

  const start = useCallback(async () => {
    setLoading(true);
    try {
      await ipc.startProxy();
    } finally {
      setLoading(false);
    }
  }, []);

  const stop = useCallback(async () => {
    setLoading(true);
    try {
      await ipc.stopProxy();
    } finally {
      setLoading(false);
    }
  }, []);

  return { status, loading, start, stop };
}
