/**
 * 厂商对比图表
 *
 * 使用 Recharts 绘制柱状图，支持切换指标（Token 数 / 费用）
 */

import { useState } from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import type { ProviderUsageSummary } from '../../../shared/types';

type MetricKey = 'tokens' | 'cost';

interface ProviderComparisonProps {
  readonly providerBreakdown: readonly ProviderUsageSummary[];
  readonly loading: boolean;
}

function formatTokenCount(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return String(n);
}

function formatCost(n: number): string {
  return `$${n.toFixed(2)}`;
}

export function ProviderComparison({ providerBreakdown, loading }: ProviderComparisonProps) {
  const [metric, setMetric] = useState<MetricKey>('tokens');

  // 转换为 Recharts 数据格式
  const chartData = providerBreakdown.map(p => ({
    name: p.providerName,
    inputTokens: p.totalInputTokens,
    outputTokens: p.totalOutputTokens,
    cost: p.totalCost,
  }));

  return (
    <div className="rounded-lg border border-zinc-200 bg-white p-4">
      <div className="mb-4 flex items-center justify-between">
        <h3 className="text-base font-semibold text-zinc-800">厂商对比</h3>
        <div className="flex gap-1">
          <button
            onClick={() => setMetric('tokens')}
            className={`rounded px-2.5 py-1 text-xs font-medium transition-colors ${
              metric === 'tokens'
                ? 'bg-blue-100 text-blue-700'
                : 'text-zinc-500 hover:bg-zinc-100 hover:text-zinc-700'
            }`}
          >
            Token 数
          </button>
          <button
            onClick={() => setMetric('cost')}
            className={`rounded px-2.5 py-1 text-xs font-medium transition-colors ${
              metric === 'cost'
                ? 'bg-blue-100 text-blue-700'
                : 'text-zinc-500 hover:bg-zinc-100 hover:text-zinc-700'
            }`}
          >
            费用
          </button>
        </div>
      </div>

      {loading ? (
        <div className="flex h-64 items-center justify-center">
          <span className="text-sm text-zinc-400">加载中...</span>
        </div>
      ) : chartData.length === 0 ? (
        <div className="flex h-64 items-center justify-center">
          <span className="text-sm text-zinc-400">暂无数据</span>
        </div>
      ) : (
        <ResponsiveContainer width="100%" height={260}>
          <BarChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e4e4e7" />
            <XAxis
              dataKey="name"
              tick={{ fontSize: 11, fill: '#71717a' }}
              axisLine={{ stroke: '#e4e4e7' }}
            />
            <YAxis
              tickFormatter={metric === 'cost' ? formatCost : formatTokenCount}
              tick={{ fontSize: 11, fill: '#71717a' }}
              axisLine={{ stroke: '#e4e4e7' }}
            />
            <Tooltip
              formatter={(value, name) => {
                const num = Number(value);
                if (name === 'inputTokens') return [formatTokenCount(num), 'Input Tokens'];
                if (name === 'outputTokens') return [formatTokenCount(num), 'Output Tokens'];
                if (name === 'cost') return [formatCost(num), '费用'];
                return [value, name];
              }}
              contentStyle={{
                borderRadius: '8px',
                border: '1px solid #e4e4e7',
                fontSize: '12px',
              }}
            />
            <Legend
              formatter={(value: string) => {
                if (value === 'inputTokens') return 'Input Tokens';
                if (value === 'outputTokens') return 'Output Tokens';
                if (value === 'cost') return '费用';
                return value;
              }}
            />
            {metric === 'tokens' ? (
              <>
                <Bar dataKey="inputTokens" fill="#3b82f6" radius={[2, 2, 0, 0]} />
                <Bar dataKey="outputTokens" fill="#f59e0b" radius={[2, 2, 0, 0]} />
              </>
            ) : (
              <Bar dataKey="cost" fill="#10b981" radius={[2, 2, 0, 0]} />
            )}
          </BarChart>
        </ResponsiveContainer>
      )}
    </div>
  );
}
