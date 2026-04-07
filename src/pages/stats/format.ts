/**
 * 统计页面共享格式化工具函数
 */

/** 格式化 token 数量（带 K/M 后缀） */
export function formatTokenCount(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return String(n);
}

/** 格式化费用（统一 4 位小数） */
export function formatCost(n: number): string {
  return `$${n.toFixed(4)}`;
}

/** 格式化时间戳为本地显示 */
export function formatTimestamp(ts: string): string {
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
}

/** 格式化日期为短格式（MM/DD） */
export function formatShortDate(dateStr: string): string {
  const parts = dateStr.split('-');
  if (parts.length !== 3) return dateStr;
  return `${parts[1]}/${parts[2]}`;
}

/** 格式化数字（带 K/M 后缀，2 位小数） */
export function formatNumber(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(2)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return n.toLocaleString();
}
