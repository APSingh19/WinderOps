import bcrypt from 'bcryptjs';
import mongoose from 'mongoose';
import { organizationRoles, roleLevels } from '../constants/roles.js';

const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true, maxlength: 80 },
    employeeId: { type: String, trim: true, uppercase: true, sparse: true, index: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    password: { type: String, required: true, minlength: 6, select: false },
    role: { type: String, enum: organizationRoles, default: 'Employee' },
    avatar: String,
    title: { type: String, default: 'Team Member' },
    designation: { type: String, trim: true, maxlength: 120 },
    workRole: { type: String, trim: true, maxlength: 120 },
    employmentType: {
      type: String,
      enum: ['Full-time', 'Part-time', 'Contract', 'Internship', 'Consultant'],
      default: 'Full-time'
    },
    joiningDate: { type: Date, default: Date.now },
    department: { type: mongoose.Schema.Types.ObjectId, ref: 'Department', index: true },
    departmentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Department', index: true },
    managerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', index: true },
    reportingManager: { type: mongoose.Schema.Types.ObjectId, ref: 'User', index: true },
    teamLeadId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', index: true },
    teamLead: { type: mongoose.Schema.Types.ObjectId, ref: 'User', index: true },
    hierarchyLevel: { type: Number, min: 0, max: 20, default: 5, index: true },
    subordinates: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
    workspace: { type: mongoose.Schema.Types.ObjectId, ref: 'Workspace', index: true },
    companyId: { type: mongoose.Schema.Types.ObjectId, ref: 'Workspace', index: true },
    bio: { type: String, maxlength: 280 },
    skills: [{ type: String, trim: true }],
    weeklyCapacityHours: { type: Number, min: 0, max: 168, default: 40 },
    maxActiveTasks: { type: Number, min: 1, max: 100, default: 8 },
    lastActiveAt: Date
  },
  { timestamps: true }
);

userSchema.pre('save', async function hashPassword(next) {
  if (!this.isModified('password')) return next();
  this.password = await bcrypt.hash(this.password, 12);
  next();
});

userSchema.pre('validate', function syncHierarchyDefaults(next) {
  if (this.isModified('role') || this.hierarchyLevel === undefined) {
    this.hierarchyLevel = roleLevels[this.role] ?? this.hierarchyLevel ?? 5;
  }
  if (!this.designation) this.designation = this.title;
  if (!this.workRole) this.workRole = this.designation || this.title;
  this.departmentId = this.departmentId || this.department;
  this.department = this.department || this.departmentId;
  this.reportingManager = this.reportingManager || this.managerId;
  this.managerId = this.managerId || this.reportingManager;
  this.teamLead = this.teamLead || this.teamLeadId;
  this.teamLeadId = this.teamLeadId || this.teamLead;
  next();
});

userSchema.index({ companyId: 1, managerId: 1, hierarchyLevel: 1 });
userSchema.index({ workspace: 1, managerId: 1, hierarchyLevel: 1 });
userSchema.index({ department: 1, managerId: 1, role: 1 });
userSchema.index({ name: 'text', email: 'text', title: 'text', designation: 'text' });

userSchema.methods.comparePassword = function comparePassword(candidate) {
  return bcrypt.compare(candidate, this.password);
};

userSchema.methods.toJSON = function toJSON() {
  const user = this.toObject();
  delete user.password;
  return user;
};

export default mongoose.model('User', userSchema);
