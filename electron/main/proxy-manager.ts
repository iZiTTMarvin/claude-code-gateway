/**
 * Express 代理服务管理
 */

import express, { type NextFunction, type Request, type Response } from 'express';
import type { Server } from 'node:http';
import type { AppConfig, ProxyStatus } from '../../shared/types';
import {
  handleAnthropicMessages,
  handleChatCompletion,
  handleCountTokens,
  handleHealthCheck,
  handleListModels,
  handleRoot,
} from '../../electron-proxy/server';
import { clearProviderCache } from '../../electron-proxy/router';
import {
  AuthenticationError,
  toAnthropicError,
  toOpenAIError,
} from '../../electron-proxy/utils/errors';
import { logger } from '../../electron-proxy/utils/logger';

let server: Server | null = null;
let currentStatus: ProxyStatus = { running: false, port: 1314 };

type StatusChangeCallback = (status: ProxyStatus) => void;
let onStatusChange: StatusChangeCallback | null = null;

export function setStatusChangeCallback(cb: StatusChangeCallback): void {
  onStatusChange = cb;
}

function updateStatus(status: ProxyStatus): void {
  currentStatus = status;
  onStatusChange?.(status);
}

function readGatewayApiKey(req: Request): string | null {
  const xApiKey = req.header('x-api-key');
  if (xApiKey) {
    return xApiKey;
  }

  const authorization = req.header('authorization');
  if (!authorization?.startsWith('Bearer ')) {
    return null;
  }

  return authorization.slice('Bearer '.length).trim() || null;
}

function createGatewayAuthMiddleware(getConfig: () => Promise<AppConfig>) {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    if (req.path === '/health') {
      next();
      return;
    }

    try {
      const config = await getConfig();
      if (!config.gatewayAuth.enabled) {
        next();
        return;
      }

      const incomingKey = readGatewayApiKey(req);
      if (!incomingKey || incomingKey !== config.gatewayAuth.apiKey) {
        throw new AuthenticationError();
      }

      next();
    } catch (error) {
      const statusCode = error instanceof AuthenticationError ? 401 : 500;
      if (req.path.startsWith('/v1/messages')) {
        res.status(statusCode).json(toAnthropicError(error));
        return;
      }
      res.status(statusCode).json(toOpenAIError(error));
    }
  };
}

export async function startProxy(getConfig: () => Promise<AppConfig>): Promise<void> {
  if (server) {
    return;
  }

  const config = await getConfig();
  const port = config.port;

  clearProviderCache();

  const app = express();

  app.use(express.json({ limit: '10mb' }));
  app.use((_req, _res, next) => {
    logger.debug(`${_req.method} ${_req.path}`);
    next();
  });

  app.get('/', handleRoot);
  app.get('/health', handleHealthCheck);
  app.use(createGatewayAuthMiddleware(getConfig));
  app.get('/v1/models', (_req, res) => {
    handleListModels(res, getConfig).catch((err: Error) => {
      logger.error(`Unhandled list models error: ${err.message}`);
      res.status(500).json({
        error: {
          message: err.message,
          type: 'internal_error',
        },
      });
    });
  });
  app.get('/models', (_req, res) => {
    handleListModels(res, getConfig).catch((err: Error) => {
      logger.error(`Unhandled list models error: ${err.message}`);
      res.status(500).json({
        error: {
          message: err.message,
          type: 'internal_error',
        },
      });
    });
  });

  app.post('/v1/chat/completions', (req, res) => {
    handleChatCompletion(req, res, getConfig).catch((err: Error) => {
      logger.error(`Unhandled chat error: ${err.message}`);
    });
  });

  app.post('/v1/messages', (req, res) => {
    handleAnthropicMessages(req, res, getConfig).catch((err: Error) => {
      logger.error(`Unhandled anthropic error: ${err.message}`);
    });
  });

  app.post('/v1/messages/count_tokens', (req, res) => {
    handleCountTokens(req, res).catch((err: Error) => {
      logger.error(`Unhandled count_tokens error: ${err.message}`);
    });
  });

  return new Promise((resolve, reject) => {
    server = app.listen(port, () => {
      logger.info(`Proxy started on port ${port}`);
      updateStatus({ running: true, port });
      resolve();
    });

    server.on('error', (err: NodeJS.ErrnoException) => {
      const message =
        err.code === 'EADDRINUSE' ? `端口 ${port} 已被占用` : `启动失败: ${err.message}`;
      logger.error(message);
      server = null;
      updateStatus({ running: false, port, error: message });
      reject(new Error(message));
    });
  });
}

export function stopProxy(): Promise<void> {
  return new Promise(resolve => {
    if (!server) {
      updateStatus({ running: false, port: currentStatus.port });
      resolve();
      return;
    }

    server.close(() => {
      logger.info('Proxy stopped');
      server = null;
      clearProviderCache();
      updateStatus({ running: false, port: currentStatus.port });
      resolve();
    });
  });
}

export function getProxyStatus(): ProxyStatus {
  return { ...currentStatus };
}
