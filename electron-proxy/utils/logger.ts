/**
 * 结构化日志工具
 */

export type LogLevel = "debug" | "info" | "warn" | "error"

const LOG_LEVEL_PRIORITY: Record<LogLevel, number> = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
}

class Logger {
  private level: LogLevel = "info"

  setLevel(level: LogLevel): void {
    this.level = level
  }

  private shouldLog(level: LogLevel): boolean {
    return LOG_LEVEL_PRIORITY[level] >= LOG_LEVEL_PRIORITY[this.level]
  }

  private format(level: LogLevel, message: string): string {
    const timestamp = new Date().toISOString()
    return `[${level.toUpperCase()}] ${timestamp} ${message}`
  }

  debug(message: string): void {
    if (this.shouldLog("debug")) {
      process.stderr.write(this.format("debug", message) + "\n")
    }
  }

  info(message: string): void {
    if (this.shouldLog("info")) {
      process.stderr.write(this.format("info", message) + "\n")
    }
  }

  warn(message: string): void {
    if (this.shouldLog("warn")) {
      process.stderr.write(this.format("warn", message) + "\n")
    }
  }

  error(message: string): void {
    if (this.shouldLog("error")) {
      process.stderr.write(this.format("error", message) + "\n")
    }
  }

  request(method: string, path: string, model?: string): void {
    const modelInfo = model ? ` model=${model}` : ""
    this.info(`REQUEST: ${method} ${path}${modelInfo}`)
  }

  route(logicalModel: string, providerId: string, actualModel: string): void {
    this.info(`ROUTE: ${logicalModel} -> ${providerId}/${actualModel}`)
  }

  response(status: number, stream: boolean): void {
    this.info(`RESPONSE: status=${status} stream=${stream}`)
  }
}

export const logger = new Logger()
