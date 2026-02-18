import Tenant from "../models/Tenant.js";
import Project from "../models/Project.js";

export async function authenticateApiKey(rawApiKey) {
    const apiKey = typeof rawApiKey === "string" ? rawApiKey.trim() : "";
    if (!apiKey) return null;

    const project = await Project.findOne({ apiKey, status: "active" }).exec();
    if (!project) return null;

    const tenant = await Tenant.findOne({
        _id: project.tenantId,
        status: "active",
    }).exec();
    if (!tenant) return null;

    return {
        tenant: {
            id: String(tenant._id),
            name: tenant.name,
            status: tenant.status,
        },
        project: {
            id: String(project._id),
            name: project.name,
            status: project.status,
            allowedOrigins: project.allowedOrigins ?? ["*"],
        },
    };
}

export async function ensureDefaultTenantProject() {
    const shouldBootstrap = process.env.AUTO_BOOTSTRAP_PROJECT !== "false";
    if (!shouldBootstrap) return null;

    const tenantName = process.env.DEFAULT_TENANT_NAME ?? "default-tenant";
    const projectName = process.env.DEFAULT_PROJECT_NAME ?? "default-project";
    const apiKey = process.env.DEFAULT_API_KEY ?? "dev-api-key";

    let tenant = await Tenant.findOne({ name: tenantName }).exec();
    if (!tenant) {
        tenant = await Tenant.create({ name: tenantName, status: "active" });
    }

    let project = await Project.findOne({
        tenantId: tenant._id,
        name: projectName,
    }).exec();

    if (!project) {
        project = await Project.create({
            tenantId: tenant._id,
            name: projectName,
            apiKey,
            allowedOrigins: ["*"],
            status: "active",
        });
    }

    return {
        tenant: {
            id: String(tenant._id),
            name: tenant.name,
        },
        project: {
            id: String(project._id),
            name: project.name,
            apiKey: project.apiKey,
        },
    };
}
