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
  const [error, setError] = useState<string | null>(null);

  // --- 汇总概览 ---
  const [summary, setSummary] = useState<UsageSummary | null>(null);
  const [loadingSummary, setLoadingSummary] = useState(false);

  const refreshSummary = useCallback(async (startDate?: string, endDate?: string) => {
    setLoadingSummary(true);
    setError(null);
    try {
      const data = await ipc.getUsageSummary({ startDate, endDate });
      setSummary(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : '加载汇总数据失败');
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
    } catch (err) {
      setError(err instanceof Error ? err.message : '查询用量记录失败');
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
    } catch (err) {
      setError(err instanceof Error ? err.message : '加载趋势数据失败');
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
    } catch (err) {
      setError(err instanceof Error ? err.message : '加载模型定价失败');
    } finally {
      setLoadingPricing(false);
    }
  }, []);

  const savePricing = useCallback(async (pricing: ModelPricing) => {
    try {
      await ipc.upsertPricing(pricing);
      const updated = await ipc.getAllPricing();
      setPricingList(updated);
    } catch (err) {
      setError(err instanceof Error ? err.message : '保存模型定价失败');
    }
  }, []);

  const deletePricing = useCallback(async (modelId: string) => {
    try {
      await ipc.deletePricing({ modelId });
      setPricingList(prev => prev.filter(p => p.modelId !== modelId));
    } catch (err) {
      setError(err instanceof Error ? err.message : '删除模型定价失败');
    }
  }, []);

  // --- 数据清理 ---
  const deleteBefore = useCallback(async (date: string) => {
    try {
      await ipc.deleteUsageBefore(date);
    } catch (err) {
      setError(err instanceof Error ? err.message : '清理数据失败');
    }
  }, []);

  const clearAll = useCallback(async () => {
    try {
      await ipc.clearAllUsage();
    } catch (err) {
      setError(err instanceof Error ? err.message : '清空数据失败');
    }
  }, []);

  const clearError = useCallback(() => setError(null), []);

  return {
    error,
    clearError,
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
