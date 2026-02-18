import crypto from "node:crypto";
import Project from "../models/Project.js";

function generateApiKey() {
    return `pk_${crypto.randomBytes(24).toString("hex")}`;
}

function sanitizeProject(project, includeApiKey = false) {
    const base = {
        id: String(project._id),
        tenantId: String(project.tenantId),
        name: project.name,
        allowedOrigins: project.allowedOrigins ?? ["*"],
        status: project.status,
        createdAt: project.createdAt,
        updatedAt: project.updatedAt,
    };
    if (includeApiKey) {
        return { ...base, apiKey: project.apiKey };
    }
    return base;
}

export async function createProjectForTenant({
    tenantId,
    name,
    allowedOrigins = ["*"],
}) {
    const project = await Project.create({
        tenantId,
        name,
        allowedOrigins,
        apiKey: generateApiKey(),
        status: "active",
    });
    return sanitizeProject(project, true);
}

export async function listProjectsForTenant({ tenantId }) {
    const projects = await Project.find({ tenantId }).sort({ createdAt: -1 }).exec();
    return projects.map((project) => sanitizeProject(project, false));
}

export async function updateProjectAllowedOrigins({
    tenantId,
    projectId,
    allowedOrigins,
}) {
    const project = await Project.findOneAndUpdate(
        { _id: projectId, tenantId },
        { $set: { allowedOrigins } },
        { new: true }
    ).exec();
    if (!project) return null;
    return sanitizeProject(project, false);
}

export async function rotateProjectApiKey({ tenantId, projectId }) {
    const project = await Project.findOneAndUpdate(
        { _id: projectId, tenantId, status: "active" },
        { $set: { apiKey: generateApiKey() } },
        { new: true }
    ).exec();
    if (!project) return null;
    return sanitizeProject(project, true);
}

export async function revokeProject({ tenantId, projectId }) {
    const project = await Project.findOneAndUpdate(
        { _id: projectId, tenantId },
        { $set: { status: "disabled" } },
        { new: true }
    ).exec();
    if (!project) return null;
    return sanitizeProject(project, false);
}
