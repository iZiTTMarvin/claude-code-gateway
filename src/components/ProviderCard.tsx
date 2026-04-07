/**
 * 服务商管理卡片
 */

import { useState, useCallback } from 'react';
import type { Provider } from '../../shared/types';
import { ProviderForm } from './ProviderForm';
import { Modal } from './ui/Modal';

interface ProviderCardProps {
  readonly providers: readonly Provider[];
  readonly editing: Provider | null;
  readonly onEdit: (provider: Provider | null) => void;
  readonly onAdd: (provider: Omit<Provider, 'id'>) => void;
  readonly onUpdate: (provider: Provider) => void;
  readonly onRemove: (id: string) => void;
}

type ModalMode = 'add' | 'edit' | null;

export function ProviderCard({
  providers,
  editing,
  onEdit,
  onAdd,
  onUpdate,
  onRemove,
}: ProviderCardProps) {
  const [modalMode, setModalMode] = useState<ModalMode>(null);

  const openAddModal = useCallback(() => {
    onEdit(null);
    setModalMode('add');
  }, [onEdit]);

  const openEditModal = useCallback(
    (provider: Provider) => {
      onEdit(provider);
      setModalMode('edit');
    },
    [onEdit],
  );

  const closeModal = useCallback(() => {
    setModalMode(null);
    onEdit(null);
  }, [onEdit]);

  const handleAdd = useCallback(
    (provider: Omit<Provider, 'id'>) => {
      onAdd(provider);
      closeModal();
    },
    [onAdd, closeModal],
  );

  const handleUpdate = useCallback(
    (provider: Provider) => {
      onUpdate(provider);
      closeModal();
    },
    [onUpdate, closeModal],
  );

  const modalTitle = modalMode === 'edit' ? '编辑服务商' : '添加服务商';

  return (
    <>
      <div className="rounded-lg border border-zinc-200 bg-white">
        <div className="flex items-center justify-between border-b border-zinc-100 px-4 py-3">
          <h2 className="text-base font-semibold text-zinc-800">服务商</h2>
          <button
            onClick={openAddModal}
            className="rounded-md bg-zinc-100 px-2.5 py-1 text-sm font-medium text-zinc-600 transition-colors hover:bg-zinc-200"
          >
            + 添加
          </button>
        </div>

        <div className="p-4 space-y-3">
          {providers.length === 0 && (
            <div className="py-8 text-center text-sm text-zinc-400">
              暂无服务商，点击"添加"开始配置
            </div>
          )}

          {providers.map(provider => (
            <div
              key={provider.id}
              className="flex items-center justify-between rounded-md border border-zinc-100 bg-zinc-50 px-4 py-3"
            >
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 font-medium text-zinc-800">
                  {provider.name}
                  <span className="rounded-full bg-white px-2 py-0.5 text-[11px] font-medium text-zinc-500 ring-1 ring-zinc-200">
                    {provider.protocol === 'anthropic' ? 'Anthropic' : 'OpenAI'}
                  </span>
                </div>
                <div className="truncate text-xs text-zinc-500">{provider.baseUrl}</div>
              </div>
              <div className="flex gap-1.5 ml-4">
                <button
                  onClick={() => openEditModal(provider)}
                  className="rounded px-2 py-1 text-xs text-blue-600 transition-colors hover:bg-blue-50"
                >
                  编辑
                </button>
                <button
                  onClick={() => onRemove(provider.id)}
                  className="rounded px-2 py-1 text-xs text-red-600 transition-colors hover:bg-red-50"
                >
                  删除
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      <Modal open={modalMode !== null} onClose={closeModal} title={modalTitle}>
        {modalMode === 'add' && (
          <ProviderForm onSubmit={handleAdd} onCancel={closeModal} />
        )}
        {modalMode === 'edit' && editing && (
          <ProviderForm
            initial={editing}
            onSubmit={p => handleUpdate(p as Provider)}
            onCancel={closeModal}
          />
        )}
      </Modal>
    </>
  );
}
