/**
 * 汇总概览卡片
 *
 * 一行 4 个卡片：总请求数、总 Input Tokens、总 Output Tokens、总费用
 */

import type { UsageSummary } from '../../../shared/types';

interface SummaryCardsProps {
  readonly summary: UsageSummary | null;
  readonly loading: boolean;
}

function formatNumber(n: number): string {
  if (n >= 1_000_000) {
    return `${(n / 1_000_000).toFixed(2)}M`;
  }
  if (n >= 1_000) {
    return `${(n / 1_000).toFixed(1)}K`;
  }
  return n.toLocaleString();
}

function formatCost(cost: number): string {
  return `$${cost.toFixed(4)}`;
}

interface StatCardProps {
  readonly title: string;
  readonly value: string;
  readonly loading: boolean;
  readonly icon: React.ReactNode;
}

function StatCard({ title, value, loading, icon }: StatCardProps) {
  return (
    <div className="rounded-lg border border-zinc-200 bg-white p-4">
      <div className="flex items-center gap-2">
        <span className="text-zinc-400">{icon}</span>
        <span className="text-xs font-medium text-zinc-500">{title}</span>
      </div>
      <div className="mt-2 text-xl font-semibold text-zinc-800">
        {loading ? (
          <span className="inline-block h-6 w-24 animate-pulse rounded bg-zinc-200" />
        ) : (
          value
        )}
      </div>
    </div>
  );
}

export function SummaryCards({ summary, loading }: SummaryCardsProps) {
  return (
    <div className="grid grid-cols-4 gap-4">
      <StatCard
        title="总请求数"
        value={summary ? formatNumber(summary.totalRequests) : '0'}
        loading={loading}
        icon={
          <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M7.5 8.25h9m-9 3H12m-9.75 1.51c0 1.6 1.123 2.994 2.707 3.227 1.087.16 2.185.283 3.293.369V21l4.076-4.076a1.526 1.526 0 0 1 1.037-.443 48.282 48.282 0 0 0 5.68-.494c1.584-.233 2.707-1.626 2.707-3.228V6.741c0-1.602-1.123-2.995-2.707-3.228A48.394 48.394 0 0 0 12 3c-2.392 0-4.744.175-7.043.513C3.373 3.746 2.25 5.14 2.25 6.741v6.018Z" />
          </svg>
        }
      />
      <StatCard
        title="总 Input Tokens"
        value={summary ? formatNumber(summary.totalInputTokens) : '0'}
        loading={loading}
        icon={
          <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0 0-9-9Z" />
          </svg>
        }
      />
      <StatCard
        title="总 Output Tokens"
        value={summary ? formatNumber(summary.totalOutputTokens) : '0'}
        loading={loading}
        icon={
          <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5M12 17.25h8.25" />
          </svg>
        }
      />
      <StatCard
        title="总费用"
        value={summary ? formatCost(summary.totalCost) : '$0.0000'}
        loading={loading}
        icon={
          <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v12m-3-2.818.879.659c1.171.879 3.07.879 4.242 0 1.172-.879 1.172-2.303 0-3.182C13.536 12.219 12.768 12 12 12c-.725 0-1.45-.22-2.003-.659-1.106-.879-1.106-2.303 0-3.182s2.9-.879 4.006 0l.415.33M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
          </svg>
        }
      />
    </div>
  );
}
