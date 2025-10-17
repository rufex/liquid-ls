import { Connection } from "vscode-languageserver/node";

export enum LogLevel {
  DEBUG = 0,
  INFO = 1,
  WARN = 2,
  ERROR = 3,
  NONE = 4,
}

interface LoggerConfig {
  level?: LogLevel | string;
  connection?: Connection;
}

class LoggerInstance {
  private static instance: LoggerInstance;
  private logLevel: LogLevel = LogLevel.INFO;
  private connection?: Connection;

  private constructor() {}

  public static getInstance(): LoggerInstance {
    if (!LoggerInstance.instance) {
      LoggerInstance.instance = new LoggerInstance();
    }
    return LoggerInstance.instance;
  }

  public configure(config: Partial<LoggerConfig>): void {
    if (config.level !== undefined) {
      this.logLevel =
        typeof config.level === "string"
          ? this.parseLogLevel(config.level)
          : config.level;
    }
    if (config.connection) {
      this.connection = config.connection;
    }
  }

  private parseLogLevel(level: string): LogLevel {
    switch (level.toLowerCase()) {
      case "debug":
        return LogLevel.DEBUG;
      case "info":
        return LogLevel.INFO;
      case "warn":
        return LogLevel.WARN;
      case "error":
        return LogLevel.ERROR;
      case "none":
        return LogLevel.NONE;
      default:
        return LogLevel.INFO;
    }
  }

  private formatMessage(
    className: string,
    level: string,
    message: string,
  ): string {
    const timestamp = new Date().toISOString();
    return `${timestamp} [${level}] [${className}] ${message}`;
  }

  private shouldLog(level: LogLevel): boolean {
    return level >= this.logLevel;
  }

  public log(className: string, level: LogLevel, message: string): void {
    if (!this.shouldLog(level)) {
      return;
    }

    const levelName = LogLevel[level];
    const formattedMessage = this.formatMessage(className, levelName, message);

    // Send to client via LSP (works for VS Code, Neovim, Emacs, etc.)
    if (this.connection) {
      switch (level) {
        case LogLevel.ERROR:
          this.connection.console.error(formattedMessage);
          break;
        case LogLevel.WARN:
          this.connection.console.warn(formattedMessage);
          break;
        case LogLevel.INFO:
          this.connection.console.info(formattedMessage);
          break;
        case LogLevel.DEBUG:
          this.connection.console.log(formattedMessage);
          break;
      }
    }
  }

  public getLogLevel(): LogLevel {
    return this.logLevel;
  }
}

export class Logger {
  private className: string;
  private static loggerInstance = LoggerInstance.getInstance();

  constructor(className: string) {
    this.className = className;
  }

  public static configure(config: Partial<LoggerConfig>): void {
    Logger.loggerInstance.configure(config);
  }

  public static getLogLevel(): LogLevel {
    return Logger.loggerInstance.getLogLevel();
  }

  public debug(message: string): void {
    Logger.loggerInstance.log(this.className, LogLevel.DEBUG, message);
  }

  public info(message: string): void {
    Logger.loggerInstance.log(this.className, LogLevel.INFO, message);
  }

  public warn(message: string): void {
    Logger.loggerInstance.log(this.className, LogLevel.WARN, message);
  }

  public error(message: string): void {
    Logger.loggerInstance.log(this.className, LogLevel.ERROR, message);
  }

  public logRequest(method: string, params?: unknown): void {
    if (params) {
      const paramsStr = JSON.stringify(params, null, 2);
      this.debug(`REQUEST: ${method} - Params: ${paramsStr}`);
    } else {
      this.debug(`REQUEST: ${method}`);
    }
  }

  public logResponse(method: string, result?: unknown): void {
    if (result) {
      const resultStr = JSON.stringify(result, null, 2);
      this.debug(`RESPONSE: ${method} - Result: ${resultStr}`);
    } else {
      this.debug(`RESPONSE: ${method}`);
    }
  }
}
