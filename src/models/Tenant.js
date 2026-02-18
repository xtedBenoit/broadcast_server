import mongoose from "mongoose";

const { Schema } = mongoose;

const tenantSchema = new Schema(
    {
        name: { type: String, required: true, unique: true, trim: true },
        status: {
            type: String,
            enum: ["active", "suspended"],
            default: "active",
            required: true,
        },
    },
    { collection: "tenants", timestamps: true }
);

const Tenant = mongoose.model("Tenant", tenantSchema);
export default Tenant;
