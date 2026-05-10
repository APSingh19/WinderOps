import mongoose from 'mongoose';

const savedFilterSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true, maxlength: 80 },
    module: { type: String, default: 'tasks', index: true },
    owner: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    workspace: { type: mongoose.Schema.Types.ObjectId, ref: 'Workspace' },
    query: { type: mongoose.Schema.Types.Mixed, default: {} },
    sort: { type: String, default: '-updatedAt' },
    shared: { type: Boolean, default: false }
  },
  { timestamps: true }
);

export default mongoose.model('SavedFilter', savedFilterSchema);
