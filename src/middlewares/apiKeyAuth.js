import { authenticateApiKey } from "../services/authService.js";

function getApiKeyFromRequest(request) {
    const header = request.headers["x-api-key"];
    if (Array.isArray(header)) return header[0];
    return header;
}

export function buildApiKeyAuth({ enabled = true, authenticate = authenticateApiKey } = {}) {
    return async function apiKeyAuth(request, reply) {
        if (!enabled) return;
        if (!request.url.startsWith("/api")) return;

        const apiKey = getApiKeyFromRequest(request);
        if (!apiKey) {
            return reply.code(401).send({
                error: {
                    code: "API_KEY_REQUIRED",
                    message: "Missing X-API-Key header",
                    details: null,
                },
            });
        }

        const auth = await authenticate(apiKey);
        if (!auth) {
            return reply.code(403).send({
                error: {
                    code: "INVALID_API_KEY",
                    message: "Invalid or inactive API key",
                    details: null,
                },
            });
        }

        request.tenant = auth.tenant;
        request.project = auth.project;
    };
}
