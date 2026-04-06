/**
 * 自定义错误类
 */

export class ConfigError extends Error {
  constructor(message: string) {
    super(`[CONFIG] ${message}`);
    this.name = 'ConfigError';
  }
}

export class ModelNotFoundError extends Error {
  constructor(model: string) {
    super(`Model "${model}" is not configured in slot mappings or legacy routes.`);
    this.name = 'ModelNotFoundError';
  }
}

export class ProviderNotFoundError extends Error {
  constructor(providerId: string) {
    super(`Provider "${providerId}" is not configured.`);
    this.name = 'ProviderNotFoundError';
  }
}

export class ProviderError extends Error {
  public readonly code: string | number | undefined;
  public readonly providerId: string;

  constructor(providerId: string, message: string, code?: string | number) {
    super(`[PROVIDER:${providerId}] ${message}`);
    this.name = 'ProviderError';
    this.providerId = providerId;
    this.code = code;
  }
}

export class AuthenticationError extends Error {
  constructor(message = 'Invalid gateway API key') {
    super(message);
    this.name = 'AuthenticationError';
  }
}

export interface OpenAIErrorResponse {
  error: {
    message: string;
    type: string;
    code?: string;
  };
}

export interface AnthropicErrorResponse {
  type: 'error';
  error: {
    type: string;
    message: string;
  };
}

/** 将错误转换为 OpenAI-compatible 格式 */
export function toOpenAIError(error: unknown): OpenAIErrorResponse {
  if (error instanceof ModelNotFoundError) {
    return {
      error: {
        message: error.message,
        type: 'invalid_request_error',
        code: 'model_not_found',
      },
    };
  }

  if (error instanceof ProviderNotFoundError) {
    return {
      error: {
        message: error.message,
        type: 'invalid_request_error',
        code: 'provider_not_found',
      },
    };
  }

  if (error instanceof ProviderError) {
    return {
      error: {
        message: error.message,
        type: 'api_error',
        code: typeof error.code === 'string' ? error.code : undefined,
      },
    };
  }

  if (error instanceof AuthenticationError) {
    return {
      error: {
        message: error.message,
        type: 'authentication_error',
        code: 'invalid_api_key',
      },
    };
  }

  if (error instanceof Error) {
    return {
      error: {
        message: error.message,
        type: 'internal_error',
      },
    };
  }

  return {
    error: {
      message: 'Unknown error occurred',
      type: 'internal_error',
    },
  };
}

export function toAnthropicError(error: unknown): AnthropicErrorResponse {
  if (error instanceof ModelNotFoundError) {
    return {
      type: 'error',
      error: {
        type: 'not_found_error',
        message: error.message,
      },
    };
  }

  if (error instanceof ProviderNotFoundError) {
    return {
      type: 'error',
      error: {
        type: 'invalid_request_error',
        message: error.message,
      },
    };
  }

  if (error instanceof ProviderError) {
    return {
      type: 'error',
      error: {
        type: 'api_error',
        message: error.message,
      },
    };
  }

  if (error instanceof AuthenticationError) {
    return {
      type: 'error',
      error: {
        type: 'authentication_error',
        message: error.message,
      },
    };
  }

  if (error instanceof Error) {
    return {
      type: 'error',
      error: {
        type: 'internal_server_error',
        message: error.message,
      },
    };
  }

  return {
    type: 'error',
    error: {
      type: 'internal_server_error',
      message: 'Unknown error occurred',
    },
  };
}
