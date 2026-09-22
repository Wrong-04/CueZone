import mongoose, { Document, Schema } from "mongoose";

export interface IPermission {
  module: string;
  actions: string[];
}

export interface IRole extends Document {
  name: string;
  displayName: string;
  description?: string;
  permissions: IPermission[];
  isDefault: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const permissionSchema = new Schema<IPermission>({
  module: { type: String, required: true },
  actions: [{ type: String }],
});

const roleSchema = new Schema<IRole>(
  {
    name: { type: String, required: true, unique: true, lowercase: true, trim: true },
    displayName: { type: String, required: true },
    description: { type: String },
    permissions: [permissionSchema],
    isDefault: { type: Boolean, default: false },
  },
  { timestamps: true }
);

export const Role = mongoose.model<IRole>("Role", roleSchema);
