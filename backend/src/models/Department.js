import mongoose from 'mongoose';

const departmentSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true, maxlength: 120 },
    departmentName: { type: String, trim: true, maxlength: 120 },
    code: { type: String, required: true, uppercase: true, trim: true, maxlength: 16 },
    workspace: { type: mongoose.Schema.Types.ObjectId, ref: 'Workspace', index: true },
    parentDepartment: { type: mongoose.Schema.Types.ObjectId, ref: 'Department' },
    manager: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    departmentHead: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    departmentMembers: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
    projects: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Project' }],
    description: { type: String, maxlength: 500 },
    active: { type: Boolean, default: true }
  },
  { timestamps: true }
);

departmentSchema.pre('validate', function syncDepartmentAliases(next) {
  this.departmentName = this.departmentName || this.name;
  this.name = this.name || this.departmentName;
  this.departmentHead = this.departmentHead || this.manager;
  this.manager = this.manager || this.departmentHead;
  next();
});

departmentSchema.index({ workspace: 1, code: 1 }, { unique: true, sparse: true });
departmentSchema.index({ name: 'text', code: 'text' });
departmentSchema.index({ workspace: 1, departmentHead: 1, active: 1 });

export default mongoose.model('Department', departmentSchema);
