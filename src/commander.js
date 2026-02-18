#!/usr/bin/env node
import { Command } from "commander";

const program = new Command();

program
  .name("broadcast-server")
  .description("A simple WebSocket broadcast server")
  .version("1.0.0");

program
  .command("start")
  .description("Starts the HTTP API server with WebSocket gateway")
  .option("-p, --port <number>", "Port to run the server on", "3000")
  .option(
    "--mongo <string>",
    "MongoDB connection string",
    "mongodb://127.0.0.1:27017/broadcast_server"
  )
  .action(async (options) => {
    process.env.PORT = options.port;
    process.env.MONGO_URI = options.mongo;
    const { startServer } = await import("./server.js");
    await startServer();
  });

program
  .command("stop")
  .description("Stops the WebSocket broadcast server")
  .action(() => {
    console.log("Stopping the server is not implemented yet.");
  });

program
  .command("connect")
  .description("Connects to an existing WebSocket server")
  .option("-u, --url <string>", "WebSocket server URL", "ws://localhost:3000/ws")
  .option("--api-key <string>", "Project API key", process.env.API_KEY ?? "dev-api-key")
  .option("--ws-token <string>", "Short-lived WebSocket token")
  .option("-c, --count <number>", "Number of clients to connect", "1")
  .option("-t, --type <string>", "Type of client", "generic")
  .option("-n, --name <string>", "Base username", "client")
  .option("-r, --room <string>", "Room to join")
  .option("--to <string>", "Target username for DM")
  .option("-m, --message <string>", "Message to send periodically")
  .option("-i, --interval <number>", "Interval in ms for periodic messages", "0")
  .option(
    "--typing-interval <number>",
    "Interval in ms to emit typing on/off (0 = disabled)",
    "0"
  )
  .action(async (options) => {
    const { startClients } = await import("./ws-client.js");
    startClients({
      url: options.url,
      apiKey: options.apiKey,
      wsToken: options.wsToken ?? null,
      count: options.count,
      type: options.type,
      baseName: options.name,
      room: options.room ?? null,
      to: options.to ?? null,
      message: options.message ?? null,
      intervalMs: options.interval,
      typingIntervalMs: options.typingInterval,
    });
  });

program
  .command("ws-start")
  .description("Legacy alias for start")
  .option("-p, --port <number>", "Port to run the API/WebSocket server on", "3000")
  .option(
    "--mongo <string>",
    "MongoDB connection string",
    "mongodb://127.0.0.1:27017/broadcast_server"
  )
  .action(async (options) => {
    const port = Number.parseInt(options.port, 10);
    process.env.MONGO_URI = options.mongo;
    process.env.PORT = Number.isFinite(port) ? String(port) : "3000";
    const { startServer } = await import("./server.js");
    await startServer();
  });

program.parse(process.argv);
export const options = program.opts();
