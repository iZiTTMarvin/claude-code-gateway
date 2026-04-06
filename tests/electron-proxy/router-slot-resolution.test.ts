import assert from 'node:assert/strict';

import { buildAdvertisedModels } from '../../electron-proxy/server.js';
import { clearProviderCache, resolveRoute } from '../../electron-proxy/router.js';

function buildConfig() {
  return {
    providers: [
      {
        id: 'glm',
        name: 'GLM',
        protocol: 'anthropic' as const,
        baseUrl: 'https://open.bigmodel.cn/api/anthropic',
        apiKey: 'test-glm',
        discovery: {
          status: 'success' as const,
          syncedAt: '2026-04-07T00:00:00.000Z',
          error: null,
          models: [
            {
              id: 'glm-5',
              displayName: 'glm-5',
              providerId: 'glm',
            },
          ],
        },
      },
      {
        id: 'minimax',
        name: 'MiniMax',
        protocol: 'anthropic' as const,
        baseUrl: 'https://api.minimaxi.com/anthropic',
        apiKey: 'test-minimax',
        discovery: {
          status: 'success' as const,
          syncedAt: '2026-04-07T00:00:00.000Z',
          error: null,
          models: [],
        },
      },
    ],
    slotMappings: [
      {
        id: 'slot-sonnet',
        slot: 'sonnet' as const,
        providerId: 'minimax',
        source: 'custom' as const,
        modelId: 'MiniMax-M2.7',
      },
      {
        id: 'slot-main',
        slot: 'main' as const,
        providerId: 'glm',
        source: 'custom' as const,
        modelId: 'glm-coding',
      },
    ],
    appSettings: {
      port: 1314,
      minimizeToTrayOnClose: true,
      autoLaunch: false,
    },
    gatewayAuth: {
      enabled: false,
      apiKey: '',
    },
    port: 1314,
    routes: [],
  };
}

function test(name: string, fn: () => void): void {
  try {
    fn();
    process.stdout.write(`PASS ${name}\n`);
  } catch (error) {
    process.stderr.write(`FAIL ${name}\n`);
    throw error;
  }
}

clearProviderCache();

test('槽位别名 sonnet 可解析到对应 provider 和 model', () => {
  const resolved = resolveRoute('sonnet', buildConfig(), 'anthropic');
  assert.equal(resolved.resolvedBy, 'slot');
  assert.equal(resolved.resolvedKey, 'sonnet');
  assert.equal(resolved.provider.id, 'minimax');
  assert.equal(resolved.actualModel, 'MiniMax-M2.7');
});

test('main 槽位走新的 slotMappings 而不是 legacy routes', () => {
  const resolved = resolveRoute('main', buildConfig(), 'anthropic');
  assert.equal(resolved.resolvedBy, 'slot');
  assert.equal(resolved.provider.id, 'glm');
  assert.equal(resolved.actualModel, 'glm-coding');
});

test('直接使用 discovery 里的模型 ID 也可解析', () => {
  const resolved = resolveRoute('glm-5', buildConfig(), 'anthropic');
  assert.equal(resolved.resolvedBy, 'direct-model');
  assert.equal(resolved.provider.id, 'glm');
  assert.equal(resolved.actualModel, 'glm-5');
});

test('模型列表会聚合 discovery 与槽位映射中的模型 ID', () => {
  const models = buildAdvertisedModels(buildConfig());
  assert.deepEqual(
    models.map(model => model.id),
    ['glm-5', 'glm-coding', 'MiniMax-M2.7'],
  );
});

test('未配置槽位时抛出模型未找到错误', () => {
  assert.throws(() => resolveRoute('opus', buildConfig(), 'anthropic'), /not configured/i);
});
