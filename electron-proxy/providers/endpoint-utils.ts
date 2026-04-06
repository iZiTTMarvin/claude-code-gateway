/**
 * Provider 端点拼接与回退工具。
 * 兼容用户填写根地址、已带 /v1 地址，以及厂商自定义路径前缀。
 */

function getNormalizedPathname(baseUrl: string): string {
  try {
    const pathname = new URL(baseUrl).pathname.replace(/\/+$/, '');
    return pathname === '/' ? '' : pathname.toLowerCase();
  } catch {
    return '';
  }
}

function endsWithVersionSegment(baseUrl: string): boolean {
  const pathname = getNormalizedPathname(baseUrl);
  return pathname === '/v1' || pathname.endsWith('/v1');
}

function buildEndpointCandidates(primary: string, fallback: string): readonly string[] {
  return [...new Set([primary, fallback])];
}

export function getOpenAICompatibleEndpointCandidates(baseUrl: string): readonly string[] {
  if (endsWithVersionSegment(baseUrl)) {
    return buildEndpointCandidates('/chat/completions', '/v1/chat/completions');
  }

  if (getNormalizedPathname(baseUrl) === '') {
    return buildEndpointCandidates('/v1/chat/completions', '/chat/completions');
  }

  return buildEndpointCandidates('/chat/completions', '/v1/chat/completions');
}

export function getAnthropicEndpointCandidates(baseUrl: string): readonly string[] {
  if (endsWithVersionSegment(baseUrl)) {
    return buildEndpointCandidates('/messages', '/v1/messages');
  }

  return buildEndpointCandidates('/v1/messages', '/messages');
}

interface HttpStatusErrorShape {
  response?: {
    status?: number;
  };
}

export function isNotFoundStatusError(error: unknown): error is HttpStatusErrorShape {
  if (typeof error !== 'object' || error === null) {
    return false;
  }

  const candidate = error as HttpStatusErrorShape;
  return candidate.response?.status === 404;
}

export async function requestWithEndpointFallback<T>(
  endpointCandidates: readonly string[],
  requestFn: (endpoint: string) => Promise<T>
): Promise<T> {
  if (endpointCandidates.length === 0) {
    throw new Error('No endpoint candidates configured');
  }

  let lastError: unknown = null;

  for (const [index, endpoint] of endpointCandidates.entries()) {
    try {
      return await requestFn(endpoint);
    } catch (error) {
      lastError = error;
      const hasFallback = index < endpointCandidates.length - 1;
      if (!hasFallback || !isNotFoundStatusError(error)) {
        throw error;
      }
    }
  }

  throw (lastError ?? new Error('Request failed without an error payload'));
}
