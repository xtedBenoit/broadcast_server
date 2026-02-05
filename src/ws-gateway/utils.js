export function resolvePort(rawPort, fallback) {
    const port = Number.parseInt(rawPort ?? "", 10);
    return Number.isFinite(port) ? port : fallback;
}
