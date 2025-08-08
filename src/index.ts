import { LiquidLanguageServer } from "./server";

const server = new LiquidLanguageServer();

server.start();

process.on("SIGINT", () => {
  server.stop();
  process.exit(0);
});

process.on("SIGTERM", () => {
  server.stop();
  process.exit(0);
});
