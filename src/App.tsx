/**
 * 根组件
 */

import { useState, useEffect } from 'react';
import type { AppConfig } from '../shared/types';
import { AppHeader } from './components/AppHeader';
import { GatewayStatusCard } from './components/GatewayStatusCard';
import { GatewayAuthCard } from './components/GatewayAuthCard';
import { ModelDiscoveryCard } from './components/ModelDiscoveryCard';
import { ProviderCard } from './components/ProviderCard';
import { StatusBar } from './components/StatusBar';
import { useAppSettings } from './hooks/useAppSettings';
import { useGatewayAuth } from './hooks/useGatewayAuth';
import { useProxyStatus } from './hooks/useProxyStatus';
import { useProviders } from './hooks/useProviders';

import * as ipc from './lib/ipc';

export function App() {
  const [config, setConfig] = useState<AppConfig | null>(null);
  const [error, setError] = useState<string | null>(null);
  const proxy = useProxyStatus();

  useEffect(() => {
    ipc
      .getConfig()
      .then(setConfig)
      .catch((err: Error) => setError(err.message));
  }, []);

  const providerState = useProviders(config, setConfig);

  const appSettingsState = useAppSettings(config, setConfig);
  const gatewayAuthState = useGatewayAuth(config, setConfig);

  if (error) {
    return (
      <div className="flex h-screen items-center justify-center bg-zinc-50">
        <div className="rounded-lg border border-red-200 bg-red-50 p-6 text-red-700">
          <div className="font-semibold">加载配置失败</div>
          <div className="mt-1 text-sm">{error}</div>
        </div>
      </div>
    );
  }

  if (!config) {
    return (
      <div className="flex h-screen items-center justify-center bg-zinc-50">
        <div className="text-zinc-400">加载中...</div>
      </div>
    );
  }

  return (
    <div className="flex h-screen flex-col bg-zinc-50">
      <AppHeader
        status={proxy.status}
        loading={proxy.loading}
        onStart={proxy.start}
        onStop={proxy.stop}
      />

      {/* 左右双栏主区域 */}
      <div className="flex flex-1 overflow-hidden">
        {/* 左栏：配置区 */}
        <div className="flex w-[420px] shrink-0 flex-col gap-4 overflow-y-auto border-r border-zinc-200 p-5">
          <ProviderCard
            providers={providerState.providers}
            editing={providerState.editing}
            onEdit={providerState.setEditing}
            onAdd={providerState.addProvider}
            onUpdate={providerState.updateProvider}
            onRemove={providerState.removeProvider}
          />

          <ModelDiscoveryCard
            providers={providerState.providers}
            discoveryStateByProvider={providerState.discoveryStateByProvider}
            syncingProviderId={providerState.syncingProviderId}
            onRetry={providerState.retryProviderModels}
          />
        </div>

        {/* 右栏：运行区 */}
        <div className="flex flex-1 flex-col gap-4 overflow-y-auto p-5">
          <GatewayStatusCard
            status={proxy.status}
            appSettings={appSettingsState.appSettings}
            savingSettings={appSettingsState.saving}
            onSaveAppSettings={appSettingsState.saveAppSettings}
          />

          <GatewayAuthCard
            auth={gatewayAuthState.gatewayAuth}
            generating={gatewayAuthState.generating}
            onSave={gatewayAuthState.saveGatewayAuth}
            onGenerate={gatewayAuthState.generateApiKey}
          />
        </div>
      </div>

      <StatusBar status={proxy.status} providerCount={config.providers.length} />
    </div>
  );
}
