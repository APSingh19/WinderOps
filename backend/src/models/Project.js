import mongoose from 'mongoose';

const projectMemberSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    role: {
      type: String,
      enum: ['Owner', 'Project Manager', 'Co-Leader', 'Team Leader', 'Member', 'Viewer', 'Admin'],
      default: 'Member'
    },
    team: { type: String, trim: true, maxlength: 80 }
  },
  { _id: false }
);

const subTeamSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true, maxlength: 100 },
    lead: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    members: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }]
  },
  { _id: true, timestamps: true }
);

const projectSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true, maxlength: 120 },
    key: { type: String, required: true, uppercase: true, trim: true, maxlength: 12 },
    description: { type: String, maxlength: 1000 },
    status: { type: String, enum: ['Planning', 'Active', 'On Hold', 'Completed'], default: 'Active' },
    color: { type: String, default: '#2563eb' },
    owner: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    projectManager: { type: mongoose.Schema.Types.ObjectId, ref: 'User', index: true },
    coLeaders: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
    teamLeaders: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
    department: { type: mongoose.Schema.Types.ObjectId, ref: 'Department', index: true },
    assignedTeam: { type: mongoose.Schema.Types.ObjectId, ref: 'Team', index: true },
    assignedEmployees: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
    workspace: { type: mongoose.Schema.Types.ObjectId, ref: 'Workspace', index: true },
    companyId: { type: mongoose.Schema.Types.ObjectId, ref: 'Workspace', index: true },
    members: [projectMemberSchema],
    subTeams: [subTeamSchema],
    startDate: Date,
    dueDate: Date,
    archived: { type: Boolean, default: false }
  },
  { timestamps: true }
);

projectSchema.index({ name: 'text', key: 'text', description: 'text' });
projectSchema.index({ owner: 1, status: 1 });
projectSchema.index({ projectManager: 1, status: 1 });
projectSchema.index({ companyId: 1, department: 1, status: 1 });
projectSchema.index({ assignedTeam: 1, status: 1 });
projectSchema.index({ 'members.user': 1, archived: 1 });

export default mongoose.model('Project', projectSchema);
