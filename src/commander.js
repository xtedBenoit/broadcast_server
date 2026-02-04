import { Command } from "commander";

const program = new Command();

program
  .name("broadcast-server")
  .description("A simple WebSocket broadcast server")
  .version("1.0.0");

program
  .command("start")
  .description("Starts the WebSocket broadcast server with specified options")
  .option("-p, --port <number>", "Port to run the server on", "3000")
  .action((options) => {
    process.env.PORT = options.port;
    import("./server.js");
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
  .option("-u, --url <string>", "WebSocket server URL", "ws://localhost:8080")
  .option("-c, --count <number>", "Number of clients to connect", "1")
  .option("-n, --name <string>", "Base username", "client")
  .option("-r, --room <string>", "Room to join")
  .option("-m, --message <string>", "Message to send periodically")
  .option("-i, --interval <number>", "Interval in ms for periodic messages", "0")
  .action(async (options) => {
    const { startClients } = await import("./ws-client.js");
    startClients({
      url: options.url,
      count: options.count,
      baseName: options.name,
      room: options.room ?? null,
      message: options.message ?? null,
      intervalMs: options.interval,
    });
  });

program
  .command("ws-start")
  .description("Starts the ws-gateway WebSocket server")
  .option("-p, --port <number>", "Port to run the WebSocket server on", "8080")
  .action(async (options) => {
    const { startWsGateway } = await import("./ws-gateway.js");
    const port = Number.parseInt(options.port, 10);
    startWsGateway({ port: Number.isFinite(port) ? port : 8080 });
  });

program.parse(process.argv);
export const options = program.opts();
