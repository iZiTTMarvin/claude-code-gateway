/**
 * 趋势图表
 *
 * 使用 Recharts 绘制折线图，支持切换时间范围（7天/30天/90天/全部）
 */

import { useState, useEffect } from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import type { DailyUsageSummary } from '../../../shared/types';

type TimeRange = '7d' | '30d' | '90d' | 'all';

interface TrendChartProps {
  readonly dailyTrend: readonly DailyUsageSummary[];
  readonly loading: boolean;
  readonly onRangeChange: (startDate?: string) => void;
}

const TIME_RANGE_OPTIONS: readonly { key: TimeRange; label: string; days: number | null }[] = [
  { key: '7d', label: '7 天', days: 7 },
  { key: '30d', label: '30 天', days: 30 },
  { key: '90d', label: '90 天', days: 90 },
  { key: 'all', label: '全部', days: null },
];

function getStartDate(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() - days);
  return d.toISOString().split('T')[0];
}

function formatShortDate(dateStr: string): string {
  const parts = dateStr.split('-');
  if (parts.length !== 3) return dateStr;
  return `${parts[1]}/${parts[2]}`;
}

function formatTokenCount(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return String(n);
}

export function TrendChart({ dailyTrend, loading, onRangeChange }: TrendChartProps) {
  const [range, setRange] = useState<TimeRange>('30d');

  useEffect(() => {
    const option = TIME_RANGE_OPTIONS.find(o => o.key === range);
    if (option && option.days !== null) {
      onRangeChange(getStartDate(option.days));
    } else {
      onRangeChange(undefined);
    }
  }, [range, onRangeChange]);

  return (
    <div className="rounded-lg border border-zinc-200 bg-white p-4">
      <div className="mb-4 flex items-center justify-between">
        <h3 className="text-base font-semibold text-zinc-800">Token 使用趋势</h3>
        <div className="flex gap-1">
          {TIME_RANGE_OPTIONS.map(option => (
            <button
              key={option.key}
              onClick={() => setRange(option.key)}
              className={`rounded px-2.5 py-1 text-xs font-medium transition-colors ${
                range === option.key
                  ? 'bg-blue-100 text-blue-700'
                  : 'text-zinc-500 hover:bg-zinc-100 hover:text-zinc-700'
              }`}
            >
              {option.label}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="flex h-64 items-center justify-center">
          <span className="text-sm text-zinc-400">加载中...</span>
        </div>
      ) : dailyTrend.length === 0 ? (
        <div className="flex h-64 items-center justify-center">
          <span className="text-sm text-zinc-400">暂无数据</span>
        </div>
      ) : (
        <ResponsiveContainer width="100%" height={260}>
          <LineChart data={dailyTrend}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e4e4e7" />
            <XAxis
              dataKey="date"
              tickFormatter={formatShortDate}
              tick={{ fontSize: 11, fill: '#71717a' }}
              axisLine={{ stroke: '#e4e4e7' }}
            />
            <YAxis
              tickFormatter={formatTokenCount}
              tick={{ fontSize: 11, fill: '#71717a' }}
              axisLine={{ stroke: '#e4e4e7' }}
            />
            <Tooltip
              labelFormatter={(label) => `日期: ${label}`}
              formatter={(value, name) => [
                formatTokenCount(Number(value)),
                name === 'totalInputTokens' ? 'Input Tokens' : 'Output Tokens',
              ]}
              contentStyle={{
                borderRadius: '8px',
                border: '1px solid #e4e4e7',
                fontSize: '12px',
              }}
            />
            <Legend
              formatter={(value: string) =>
                value === 'totalInputTokens' ? 'Input Tokens' : 'Output Tokens'
              }
            />
            <Line
              type="monotone"
              dataKey="totalInputTokens"
              stroke="#3b82f6"
              strokeWidth={2}
              dot={false}
              activeDot={{ r: 4 }}
            />
            <Line
              type="monotone"
              dataKey="totalOutputTokens"
              stroke="#f59e0b"
              strokeWidth={2}
              dot={false}
              activeDot={{ r: 4 }}
            />
          </LineChart>
        </ResponsiveContainer>
      )}
    </div>
  );
}
