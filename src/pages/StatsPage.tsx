/**
 * 统计页面
 *
 * 页面垂直滚动布局，包含汇总概览、趋势图表、厂商对比、详细表格、定价配置和数据管理。
 */

import { useEffect, useMemo, useCallback } from 'react';
import { useUsage } from '../hooks/useUsage';
import { SummaryCards } from './stats/SummaryCards';
import { TrendChart } from './stats/TrendChart';
import { ProviderComparison } from './stats/ProviderComparison';
import { UsageTable } from './stats/UsageTable';
import { PricingConfig } from './stats/PricingConfig';
import { DataManagement } from './stats/DataManagement';

export function StatsPage() {
  const usage = useUsage();

  // 初始加载
  useEffect(() => {
    usage.refreshSummary();
    usage.refreshTrend();
    usage.refreshPricing();
    usage.queryRecords({ page: 1, pageSize: 20 });
  }, []);

  // 从汇总数据中提取厂商列表（id + name）
  const providers = useMemo(() => {
    if (!usage.summary) return [];
    return usage.summary.providerBreakdown.map(p => ({
      providerId: p.providerId,
      providerName: p.providerName,
    }));
  }, [usage.summary]);

  // 趋势图时间范围变化回调（useCallback 防止 TrendChart useEffect 无限触发）
  const handleTrendRangeChange = useCallback((startDate?: string) => {
    usage.refreshTrend(startDate);
  }, [usage.refreshTrend]);

  // 数据清理后刷新所有数据面板
  const refreshAllData = useCallback(() => {
    usage.refreshSummary();
    usage.refreshTrend();
    usage.queryRecords({ page: 1, pageSize: 20 });
  }, [usage.refreshSummary, usage.refreshTrend, usage.queryRecords]);

  const handleDeleteBefore = useCallback(
    async (date: string) => {
      await usage.deleteBefore(date);
      refreshAllData();
    },
    [usage.deleteBefore, refreshAllData],
  );

  const handleClearAll = useCallback(async () => {
    await usage.clearAll();
    refreshAllData();
  }, [usage.clearAll, refreshAllData]);

  return (
    <div className="flex flex-1 flex-col gap-4 overflow-y-auto p-5">
      {/* 汇总概览 */}
      <SummaryCards summary={usage.summary} loading={usage.loadingSummary} />

      {/* 趋势图表 */}
      <TrendChart
        dailyTrend={usage.dailyTrend}
        loading={usage.loadingTrend}
        onRangeChange={handleTrendRangeChange}
      />

      {/* 厂商对比 */}
      <ProviderComparison
        providerBreakdown={usage.summary?.providerBreakdown ?? []}
        loading={usage.loadingSummary}
      />

      {/* 详细表格 */}
      <UsageTable
        records={usage.records}
        totalRecords={usage.totalRecords}
        loading={usage.loadingRecords}
        onQuery={usage.queryRecords}
        providers={providers}
      />

      {/* 模型定价配置 */}
      <PricingConfig
        pricingList={usage.pricingList}
        loading={usage.loadingPricing}
        onSave={usage.savePricing}
        onDelete={usage.deletePricing}
      />

      {/* 数据管理 - 操作后刷新所有数据 */}
      <DataManagement
        onDeleteBefore={handleDeleteBefore}
        onClearAll={handleClearAll}
      />
    </div>
  );
}
