import jwt from "jsonwebtoken";

const DEFAULT_WS_TOKEN_TTL = process.env.WS_TOKEN_TTL ?? "30m";

function getJwtSecret() {
    return process.env.WS_JWT_SECRET ?? process.env.JWT_SECRET ?? "change-me-in-production";
}

export function issueWsToken({
    tenantId,
    projectId,
    username,
    allowedOrigins = ["*"],
    expiresIn = DEFAULT_WS_TOKEN_TTL,
}) {
    return jwt.sign(
        {
            tenantId,
            projectId,
            username: username ?? null,
            allowedOrigins,
            scope: "ws:connect",
        },
        getJwtSecret(),
        { expiresIn }
    );
}

export function verifyWsToken(token) {
    try {
        return jwt.verify(token, getJwtSecret());
    } catch {
        return null;
    }
}
