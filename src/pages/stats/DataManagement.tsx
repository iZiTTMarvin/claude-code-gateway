/**
 * 数据管理
 *
 * 数据清理区域，包含"清理指定日期前数据"和"清空全部数据"两个操作，均需二次确认
 */

import { useState, useCallback } from 'react';
import { Modal } from '../../components/ui/Modal';

interface DataManagementProps {
  readonly onDeleteBefore: (date: string) => Promise<void>;
  readonly onClearAll: () => Promise<void>;
}

export function DataManagement({ onDeleteBefore, onClearAll }: DataManagementProps) {
  const [deleteDate, setDeleteDate] = useState('');
  const [confirmAction, setConfirmAction] = useState<'delete-before' | 'clear-all' | null>(null);
  const [processing, setProcessing] = useState(false);

  const openDeleteBeforeConfirm = useCallback(() => {
    if (!deleteDate) return;
    setConfirmAction('delete-before');
  }, [deleteDate]);

  const handleDeleteBefore = useCallback(async () => {
    setProcessing(true);
    try {
      await onDeleteBefore(deleteDate);
      setConfirmAction(null);
      setDeleteDate('');
    } finally {
      setProcessing(false);
    }
  }, [deleteDate, onDeleteBefore]);

  const handleClearAll = useCallback(async () => {
    setProcessing(true);
    try {
      await onClearAll();
      setConfirmAction(null);
    } finally {
      setProcessing(false);
    }
  }, [onClearAll]);

  const confirmTitle =
    confirmAction === 'delete-before'
      ? '确认清理'
      : '确认清空全部数据';

  const confirmMessage =
    confirmAction === 'delete-before'
      ? `确定要清理 ${deleteDate} 之前的所有用量数据吗？此操作不可撤销。`
      : '确定要清空全部用量数据吗？此操作不可撤销。';

  return (
    <div className="rounded-lg border border-zinc-200 bg-white p-4">
      <h3 className="mb-4 text-base font-semibold text-zinc-800">数据管理</h3>

      <div className="flex items-end gap-3">
        <div className="flex-1">
          <label className="mb-1 block text-xs font-medium text-zinc-600">清理指定日期前的数据</label>
          <input
            type="date"
            value={deleteDate}
            onChange={e => setDeleteDate(e.target.value)}
            className="w-full rounded-md border border-zinc-300 px-3 py-1.5 text-sm focus:border-blue-400 focus:outline-none focus:ring-1 focus:ring-blue-400"
          />
        </div>
        <button
          onClick={openDeleteBeforeConfirm}
          disabled={!deleteDate}
          className="rounded-md bg-red-50 px-3 py-1.5 text-sm font-medium text-red-700 transition-colors hover:bg-red-100 disabled:opacity-50"
        >
          清理
        </button>
      </div>

      <div className="mt-4 border-t border-zinc-100 pt-4">
        <button
          onClick={() => setConfirmAction('clear-all')}
          className="rounded-md bg-red-50 px-3 py-1.5 text-sm font-medium text-red-700 transition-colors hover:bg-red-100"
        >
          清空全部数据
        </button>
      </div>

      <Modal
        open={confirmAction !== null}
        onClose={() => setConfirmAction(null)}
        title={confirmTitle}
      >
        <div className="space-y-4">
          <p className="text-sm text-zinc-600">{confirmMessage}</p>
          <div className="flex gap-2">
            <button
              onClick={confirmAction === 'delete-before' ? handleDeleteBefore : handleClearAll}
              disabled={processing}
              className="rounded-md bg-red-600 px-3 py-1.5 text-sm font-medium text-white transition-colors hover:bg-red-700 disabled:opacity-50"
            >
              {processing ? '处理中...' : '确认'}
            </button>
            <button
              onClick={() => setConfirmAction(null)}
              disabled={processing}
              className="rounded-md bg-zinc-100 px-3 py-1.5 text-sm font-medium text-zinc-600 transition-colors hover:bg-zinc-200 disabled:opacity-50"
            >
              取消
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
