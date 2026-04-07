/**
 * Token 用量统计 Hook
 *
 * 封装所有 usage 相关的 IPC 调用，组件通过此 hook 访问数据。
 */

import { useState, useCallback } from 'react';
import type {
  UsageSummary,
  UsageRecord,
  UsageQueryParams,
  DailyUsageSummary,
  ModelPricing,
} from '../../shared/types';
import * as ipc from '../lib/ipc';

export function useUsage() {
  // --- 汇总概览 ---
  const [summary, setSummary] = useState<UsageSummary | null>(null);
  const [loadingSummary, setLoadingSummary] = useState(false);

  const refreshSummary = useCallback(async (startDate?: string, endDate?: string) => {
    setLoadingSummary(true);
    try {
      const data = await ipc.getUsageSummary({ startDate, endDate });
      setSummary(data);
    } finally {
      setLoadingSummary(false);
    }
  }, []);

  // --- 详细记录 ---
  const [records, setRecords] = useState<readonly UsageRecord[]>([]);
  const [totalRecords, setTotalRecords] = useState(0);
  const [loadingRecords, setLoadingRecords] = useState(false);

  const queryRecords = useCallback(async (params: UsageQueryParams) => {
    setLoadingRecords(true);
    try {
      const result = await ipc.getUsageRecords(params);
      setRecords(result.records);
      setTotalRecords(result.total);
    } finally {
      setLoadingRecords(false);
    }
  }, []);

  // --- 趋势数据 ---
  const [dailyTrend, setDailyTrend] = useState<readonly DailyUsageSummary[]>([]);
  const [loadingTrend, setLoadingTrend] = useState(false);

  const refreshTrend = useCallback(async (startDate?: string, endDate?: string) => {
    setLoadingTrend(true);
    try {
      const data = await ipc.getDailyTrend({ startDate, endDate });
      setDailyTrend(data);
    } finally {
      setLoadingTrend(false);
    }
  }, []);

  // --- 定价管理 ---
  const [pricingList, setPricingList] = useState<readonly ModelPricing[]>([]);
  const [loadingPricing, setLoadingPricing] = useState(false);

  const refreshPricing = useCallback(async () => {
    setLoadingPricing(true);
    try {
      const data = await ipc.getAllPricing();
      setPricingList(data);
    } finally {
      setLoadingPricing(false);
    }
  }, []);

  const savePricing = useCallback(async (pricing: ModelPricing) => {
    await ipc.upsertPricing(pricing);
    // 刷新列表以反映变更
    const updated = await ipc.getAllPricing();
    setPricingList(updated);
  }, []);

  const deletePricing = useCallback(async (modelId: string) => {
    await ipc.deletePricing(modelId);
    setPricingList(prev => prev.filter(p => p.modelId !== modelId));
  }, []);

  // --- 数据清理 ---
  const deleteBefore = useCallback(async (date: string) => {
    await ipc.deleteUsageBefore(date);
  }, []);

  const clearAll = useCallback(async () => {
    await ipc.clearAllUsage();
  }, []);

  return {
    summary,
    loadingSummary,
    refreshSummary,
    records,
    totalRecords,
    loadingRecords,
    queryRecords,
    dailyTrend,
    loadingTrend,
    refreshTrend,
    pricingList,
    loadingPricing,
    savePricing,
    deletePricing,
    refreshPricing,
    deleteBefore,
    clearAll,
  } as const;
}
