import * as fs from "fs";
import * as path from "path";
import * as os from "os";

interface LoggerOptions {
  consoleLog?: boolean;
  filePath?: string;
}

export class Logger {
  private logFile: string;
  private className: string;
  private consoleLog: boolean;

  constructor(className: string, options: LoggerOptions = {}) {
    this.className = className;
    this.consoleLog = options.consoleLog ?? false;
    this.logFile = options.filePath || this.getDefaultLogFile();
    this.ensureLogDirectory();
  }

  private getDefaultLogFile(): string {
    const configDir = path.join(os.homedir(), ".config", "liquid-ls", "logs");
    return path.join(configDir, "liquid-ls.log");
  }

  private ensureLogDirectory(): void {
    const logDir = path.dirname(this.logFile);
    if (!fs.existsSync(logDir)) {
      fs.mkdirSync(logDir, { recursive: true });
    }
  }

  private formatMessage(message: string): string {
    const timestamp = new Date().toISOString();
    return `${timestamp} [${this.className}] ${message}`;
  }

  public log(message: string): void {
    const formattedMessage = this.formatMessage(message);
    if (this.consoleLog) {
      // eslint-disable-next-line no-console
      console.log(formattedMessage);
    } else {
      fs.appendFileSync(this.logFile, formattedMessage + "\n");
    }
  }

  public info(message: string): void {
    this.log(`INFO: ${message}`);
  }

  public error(message: string): void {
    this.log(`ERROR: ${message}`);
  }

  public warn(message: string): void {
    this.log(`WARN: ${message}`);
  }

  public debug(message: string): void {
    this.log(`DEBUG: ${message}`);
  }

  public logRequest(method: string, params?: unknown): void {
    const paramsStr = params ? JSON.stringify(params, null, 2) : "none";
    this.log(`REQUEST: ${method} - Params: ${paramsStr}`);
  }

  public logResponse(method: string, result?: unknown): void {
    const resultStr = result ? JSON.stringify(result, null, 2) : "none";
    this.log(`RESPONSE: ${method} - Result: ${resultStr}`);
  }
}
