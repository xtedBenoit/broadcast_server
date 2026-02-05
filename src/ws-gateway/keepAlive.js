export function startKeepAlive(wss, intervalMs = 30000) {
    const pingInterval = setInterval(() => {
        wss.clients.forEach((ws) => {
            if (!ws.isAlive) return ws.terminate();
            ws.isAlive = false;
            ws.ping();
        });
    }, intervalMs);

    return () => clearInterval(pingInterval);
}
