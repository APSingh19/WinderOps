import ActivityLog from '../models/ActivityLog.js';
import Project from '../models/Project.js';
import { asyncHandler } from '../middleware/errorHandler.js';
import { buildVisibleProjectQuery } from '../utils/projectAccess.js';
import { isCompanyAdmin } from '../constants/roles.js';

export const listActivity = asyncHandler(async (req, res) => {
  const { project, workspace, page = 1, limit = 40 } = req.query;
  const query = {};
  if (project) query.project = project;
  if (workspace) query.workspace = workspace;
  if (!isCompanyAdmin(req.user) && !project && !workspace) {
    const projects = await Project.find(await buildVisibleProjectQuery(req.user)).select('_id');
    query.project = { $in: projects.map((item) => item._id) };
  }
  const skip = (Number(page) - 1) * Number(limit);
  const [items, total] = await Promise.all([
    ActivityLog.find(query)
      .populate('actor', 'name email avatar')
      .populate('project', 'name key color')
      .populate('task', 'title status priority')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(Number(limit)),
    ActivityLog.countDocuments(query)
  ]);
  res.json({ items, total, page: Number(page), pages: Math.ceil(total / Number(limit)) || 1 });
});
