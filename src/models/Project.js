import mongoose from "mongoose";

const { Schema } = mongoose;

const projectSchema = new Schema(
    {
        tenantId: {
            type: Schema.Types.ObjectId,
            ref: "Tenant",
            required: true,
            index: true,
        },
        name: { type: String, required: true, trim: true },
        apiKey: { type: String, required: true, unique: true, index: true },
        allowedOrigins: { type: [String], default: ["*"] },
        status: {
            type: String,
            enum: ["active", "disabled"],
            default: "active",
            required: true,
        },
    },
    { collection: "projects", timestamps: true }
);

projectSchema.index({ tenantId: 1, name: 1 }, { unique: true });

const Project = mongoose.model("Project", projectSchema);
export default Project;
