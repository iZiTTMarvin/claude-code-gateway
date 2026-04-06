import assert from 'node:assert/strict';

import {
  getAnthropicEndpointCandidates,
  getOpenAICompatibleEndpointCandidates,
  requestWithEndpointFallback,
} from '../../../electron-proxy/providers/endpoint-utils.js';

function test(name: string, fn: () => void | Promise<void>): Promise<void> {
  return Promise.resolve()
    .then(fn)
    .then(() => {
      process.stdout.write(`PASS ${name}\n`);
    })
    .catch(error => {
      process.stderr.write(`FAIL ${name}\n`);
      throw error;
    });
}

async function main(): Promise<void> {
  await test('OpenAI 根地址优先补全 /v1/chat/completions', () => {
    assert.deepEqual(getOpenAICompatibleEndpointCandidates('https://api.openai.com'), [
      '/v1/chat/completions',
      '/chat/completions',
    ]);
  });

  await test('OpenAI 已带 /v1 的地址不重复拼接版本前缀', () => {
    assert.deepEqual(getOpenAICompatibleEndpointCandidates('https://api.openai.com/v1'), [
      '/chat/completions',
      '/v1/chat/completions',
    ]);
  });

  await test('OpenAI 厂商定制路径默认直接拼接 chat/completions', () => {
    assert.deepEqual(
      getOpenAICompatibleEndpointCandidates('https://open.bigmodel.cn/api/paas/v4'),
      ['/chat/completions', '/v1/chat/completions']
    );
  });

  await test('Anthropic 根地址优先补全 /v1/messages', () => {
    assert.deepEqual(getAnthropicEndpointCandidates('https://api.anthropic.com'), [
      '/v1/messages',
      '/messages',
    ]);
  });

  await test('Anthropic 已带 /v1 的地址不重复拼接版本前缀', () => {
    assert.deepEqual(getAnthropicEndpointCandidates('https://api.anthropic.com/v1'), [
      '/messages',
      '/v1/messages',
    ]);
  });

  await test('404 时回退到下一个候选端点', async () => {
    const calledEndpoints: string[] = [];

    const result = await requestWithEndpointFallback(
      ['/v1/chat/completions', '/chat/completions'],
      async endpoint => {
        calledEndpoints.push(endpoint);
        if (endpoint === '/v1/chat/completions') {
          const error = new Error('not found') as Error & { response: { status: number } };
          error.response = { status: 404 };
          throw error;
        }
        return endpoint;
      }
    );

    assert.equal(result, '/chat/completions');
    assert.deepEqual(calledEndpoints, ['/v1/chat/completions', '/chat/completions']);
  });

  await test('非 404 错误不应重试候选端点', async () => {
    const calledEndpoints: string[] = [];
    const error = new Error('unauthorized') as Error & { response: { status: number } };
    error.response = { status: 401 };

    await assert.rejects(
      async () =>
        requestWithEndpointFallback(
          ['/v1/chat/completions', '/chat/completions'],
          async endpoint => {
            calledEndpoints.push(endpoint);
            throw error;
          }
        ),
      /unauthorized/
    );

    assert.deepEqual(calledEndpoints, ['/v1/chat/completions']);
  });
}

main().catch(error => {
  process.stderr.write(`${error instanceof Error ? error.stack ?? error.message : String(error)}\n`);
  process.exitCode = 1;
});
