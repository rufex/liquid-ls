import { Logger } from "../src/logger";
import * as fs from "fs";
import * as path from "path";

describe("Logger", () => {
  const testLogFile = path.join(__dirname, "test.log");
  let logger: Logger;

  beforeEach(() => {
    if (fs.existsSync(testLogFile)) {
      fs.unlinkSync(testLogFile);
    }
    logger = new Logger("TestClass", { filePath: testLogFile });
  });

  afterEach(() => {
    if (fs.existsSync(testLogFile)) {
      fs.unlinkSync(testLogFile);
    }
  });

  it("should create a log file", () => {
    logger.log("Test message");
    expect(fs.existsSync(testLogFile)).toBe(true);
  });

  it("should log message with correct format", () => {
    const testMessage = "Test message";
    logger.log(testMessage);

    const logContent = fs.readFileSync(testLogFile, "utf8");
    const logLines = logContent.trim().split("\n");

    expect(logLines).toHaveLength(1);
    expect(logLines[0]).toMatch(
      /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z \[TestClass\] Test message$/,
    );
  });

  it("should log info messages", () => {
    logger.info("Info message");

    const logContent = fs.readFileSync(testLogFile, "utf8");
    expect(logContent).toContain("[TestClass] INFO: Info message");
  });

  it("should log error messages", () => {
    logger.error("Error message");

    const logContent = fs.readFileSync(testLogFile, "utf8");
    expect(logContent).toContain("[TestClass] ERROR: Error message");
  });

  it("should log warning messages", () => {
    logger.warn("Warning message");

    const logContent = fs.readFileSync(testLogFile, "utf8");
    expect(logContent).toContain("[TestClass] WARN: Warning message");
  });

  it("should log debug messages", () => {
    logger.debug("Debug message");

    const logContent = fs.readFileSync(testLogFile, "utf8");
    expect(logContent).toContain("[TestClass] DEBUG: Debug message");
  });

  it("should append multiple log entries", () => {
    logger.log("First message");
    logger.log("Second message");

    const logContent = fs.readFileSync(testLogFile, "utf8");
    const logLines = logContent.trim().split("\n");

    expect(logLines).toHaveLength(2);
    expect(logLines[0]).toContain("First message");
    expect(logLines[1]).toContain("Second message");
  });

  it("should create log directory if it doesn't exist", () => {
    const nestedLogFile = path.join(__dirname, "nested", "dir", "test.log");
    const nestedLogger = new Logger("NestedTest", { filePath: nestedLogFile });

    nestedLogger.log("Test message");

    expect(fs.existsSync(nestedLogFile)).toBe(true);

    // Cleanup
    fs.unlinkSync(nestedLogFile);
    fs.rmdirSync(path.dirname(nestedLogFile));
    fs.rmdirSync(path.dirname(path.dirname(nestedLogFile)));
  });
});
