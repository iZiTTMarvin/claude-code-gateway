/**
 * 用量详细表格
 *
 * 分页表格，支持排序、厂商筛选、时间范围筛选
 */

import { useState, useEffect, useCallback } from 'react';
import type { UsageRecord, UsageQueryParams } from '../../../shared/types';

type SortField = 'timestamp' | 'providerName' | 'modelId' | 'inputTokens' | 'outputTokens';
type SortDir = 'asc' | 'desc';

interface UsageTableProps {
  readonly records: readonly UsageRecord[];
  readonly totalRecords: number;
  readonly loading: boolean;
  readonly onQuery: (params: UsageQueryParams) => void;
  readonly providers: readonly { readonly providerId: string; readonly providerName: string }[];
}

const PAGE_SIZE = 20;

export function UsageTable({
  records,
  totalRecords,
  loading,
  onQuery,
  providers,
}: UsageTableProps) {
  const [page, setPage] = useState(1);
  const [sortField, setSortField] = useState<SortField>('timestamp');
  const [sortDir, setSortDir] = useState<SortDir>('desc');
  const [providerFilter, setProviderFilter] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  const totalPages = Math.max(1, Math.ceil(totalRecords / PAGE_SIZE));

  const doQuery = useCallback(() => {
    onQuery({
      page,
      pageSize: PAGE_SIZE,
      providerId: providerFilter || undefined,
      startDate: startDate || undefined,
      endDate: endDate || undefined,
    });
  }, [page, providerFilter, startDate, endDate, onQuery]);

  useEffect(() => {
    doQuery();
  }, [doQuery]);

  // 筛选条件变化时重置页码
  const handleProviderChange = (value: string) => {
    setProviderFilter(value);
    setPage(1);
  };

  const handleStartDateChange = (value: string) => {
    setStartDate(value);
    setPage(1);
  };

  const handleEndDateChange = (value: string) => {
    setEndDate(value);
    setPage(1);
  };

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDir(prev => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortField(field);
      setSortDir('desc');
    }
  };

  const formatTimestamp = (ts: string): string => {
    try {
      const d = new Date(ts);
      return d.toLocaleString('zh-CN', {
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return ts;
    }
  };

  const formatTokens = (n: number): string => {
    return n.toLocaleString();
  };

  const sortIndicator = (field: SortField) => {
    if (sortField !== field) return null;
    return sortDir === 'asc' ? ' \u2191' : ' \u2193';
  };

  return (
    <div className="rounded-lg border border-zinc-200 bg-white p-4">
      <div className="mb-4 flex items-center justify-between">
        <h3 className="text-base font-semibold text-zinc-800">请求明细</h3>
        <div className="flex items-center gap-3">
          <select
            value={providerFilter}
            onChange={e => handleProviderChange(e.target.value)}
            className="rounded-md border border-zinc-300 px-2 py-1 text-xs focus:border-blue-400 focus:outline-none focus:ring-1 focus:ring-blue-400"
          >
            <option value="">全部厂商</option>
            {providers.map(p => (
              <option key={p.providerId} value={p.providerId}>
                {p.providerName}
              </option>
            ))}
          </select>
          <input
            type="date"
            value={startDate}
            onChange={e => handleStartDateChange(e.target.value)}
            className="rounded-md border border-zinc-300 px-2 py-1 text-xs focus:border-blue-400 focus:outline-none focus:ring-1 focus:ring-blue-400"
            placeholder="开始日期"
          />
          <input
            type="date"
            value={endDate}
            onChange={e => handleEndDateChange(e.target.value)}
            className="rounded-md border border-zinc-300 px-2 py-1 text-xs focus:border-blue-400 focus:outline-none focus:ring-1 focus:ring-blue-400"
            placeholder="结束日期"
          />
        </div>
      </div>

      {loading ? (
        <div className="flex h-48 items-center justify-center">
          <span className="text-sm text-zinc-400">加载中...</span>
        </div>
      ) : (
        <>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-zinc-100">
                  <th
                    onClick={() => handleSort('timestamp')}
                    className="cursor-pointer whitespace-nowrap px-3 py-2 text-xs font-medium text-zinc-500 hover:text-zinc-700"
                  >
                    时间{sortIndicator('timestamp')}
                  </th>
                  <th
                    onClick={() => handleSort('providerName')}
                    className="cursor-pointer whitespace-nowrap px-3 py-2 text-xs font-medium text-zinc-500 hover:text-zinc-700"
                  >
                    厂商{sortIndicator('providerName')}
                  </th>
                  <th
                    onClick={() => handleSort('modelId')}
                    className="cursor-pointer whitespace-nowrap px-3 py-2 text-xs font-medium text-zinc-500 hover:text-zinc-700"
                  >
                    模型 ID{sortIndicator('modelId')}
                  </th>
                  <th
                    onClick={() => handleSort('inputTokens')}
                    className="cursor-pointer whitespace-nowrap px-3 py-2 text-xs font-medium text-zinc-500 hover:text-zinc-700"
                  >
                    Input Tokens{sortIndicator('inputTokens')}
                  </th>
                  <th
                    onClick={() => handleSort('outputTokens')}
                    className="cursor-pointer whitespace-nowrap px-3 py-2 text-xs font-medium text-zinc-500 hover:text-zinc-700"
                  >
                    Output Tokens{sortIndicator('outputTokens')}
                  </th>
                  <th className="whitespace-nowrap px-3 py-2 text-xs font-medium text-zinc-500">
                    费用
                  </th>
                </tr>
              </thead>
              <tbody>
                {records.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-8 text-center text-xs text-zinc-400">
                      暂无记录
                    </td>
                  </tr>
                ) : (
                  records.map(record => (
                    <tr
                      key={record.id}
                      className="border-b border-zinc-50 transition-colors hover:bg-zinc-50"
                    >
                      <td className="whitespace-nowrap px-3 py-2 text-xs text-zinc-600">
                        {formatTimestamp(record.timestamp)}
                      </td>
                      <td className="whitespace-nowrap px-3 py-2 text-xs text-zinc-700">
                        {record.providerName}
                      </td>
                      <td className="max-w-[200px] truncate px-3 py-2 text-xs font-mono text-zinc-600">
                        {record.modelId}
                      </td>
                      <td className="whitespace-nowrap px-3 py-2 text-xs text-zinc-600">
                        {formatTokens(record.inputTokens)}
                      </td>
                      <td className="whitespace-nowrap px-3 py-2 text-xs text-zinc-600">
                        {formatTokens(record.outputTokens)}
                      </td>
                      <td className="whitespace-nowrap px-3 py-2 text-xs text-zinc-600">
                        --
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* 分页 */}
          <div className="mt-3 flex items-center justify-between">
            <span className="text-xs text-zinc-500">
              共 {totalRecords} 条，第 {page}/{totalPages} 页
            </span>
            <div className="flex gap-1">
              <button
                onClick={() => setPage(prev => Math.max(1, prev - 1))}
                disabled={page <= 1}
                className="rounded px-2 py-1 text-xs text-zinc-600 transition-colors hover:bg-zinc-100 disabled:opacity-50"
              >
                上一页
              </button>
              <button
                onClick={() => setPage(prev => Math.min(totalPages, prev + 1))}
                disabled={page >= totalPages}
                className="rounded px-2 py-1 text-xs text-zinc-600 transition-colors hover:bg-zinc-100 disabled:opacity-50"
              >
                下一页
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
