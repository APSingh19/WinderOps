import { body } from 'express-validator';
import Comment from '../models/Comment.js';
import Project from '../models/Project.js';
import Task from '../models/Task.js';
import { asyncHandler } from '../middleware/errorHandler.js';
import { emitToProject } from '../config/socket.js';
import { getProjectForUser } from '../utils/projectAccess.js';
import { createNotification } from '../utils/notifications.js';
import { publicUploadPath } from '../middleware/upload.js';
import { canManageEmployee, getVisibleEmployeeIds } from '../services/hierarchyService.js';
import { isCompanyAdmin } from '../constants/roles.js';
import { canManageProject } from '../utils/projectAccess.js';
import { recordActivity } from '../services/activityService.js';

export const taskRules = [
  body('title').trim().isLength({ min: 2 }).withMessage('Task title is required'),
  body('priority').optional().isIn(['Low', 'Medium', 'High']),
  body('status').optional().isIn(['Todo', 'In Progress', 'Review', 'Completed'])
];

const populateTask = (query) =>
  query
    .populate('assignee reporter assignedBy delegatedBy reviewer', 'name email avatar title role designation')
    .populate('project', 'name key color owner projectManager teamLeaders department assignedTeam');

const ensureAssigneeIsVisible = async (actor, assigneeId) => {
  if (!assigneeId || isCompanyAdmin(actor) || String(actor._id) === String(assigneeId)) return;
  if (!(await canManageEmployee(actor, assigneeId))) {
    const error = new Error('You can only assign work inside your reporting structure');
    error.statusCode = 403;
    throw error;
  }
};

const cleanTaskPayload = (body) => {
  const payload = { ...body };
  ['assignee', 'reviewer', 'delegatedBy', 'parentTask', 'dueDate'].forEach((field) => {
    if (payload[field] === '') payload[field] = undefined;
  });
  if (payload.assignee === null) payload.assignee = undefined;
  return payload;
};

export const listTasks = asyncHandler(async (req, res) => {
  const { project, status, assignee, priority, search = '', page = 1, limit = 50, due, department, team, approvalStatus } = req.query;
  const query = {};
  if (project) {
    const allowedProject = await getProjectForUser(project, req.user);
    if (!allowedProject) {
      res.status(allowedProject === null ? 404 : 403);
      throw new Error(allowedProject === null ? 'Project not found' : 'No project access');
    }
    query.project = project;
  } else if (!isCompanyAdmin(req.user)) {
    const visibleEmployeeIds = await getVisibleEmployeeIds(req.user);
    const projects = await Project.find({
      $or: [
        { owner: { $in: visibleEmployeeIds } },
        { projectManager: { $in: visibleEmployeeIds } },
        { teamLeaders: { $in: visibleEmployeeIds } },
        { 'members.user': { $in: visibleEmployeeIds } }
      ]
    }).select('_id');
    query.project = { $in: projects.map((item) => item._id) };
  }
  if (department || team) {
    const scopedProjects = await Project.find({
      ...(department ? { department } : {}),
      ...(team ? { assignedTeam: team } : {})
    }).select('_id');
    const scopedIds = scopedProjects.map((item) => item._id);
    if (query.project?.$in) {
      const visible = new Set(query.project.$in.map(String));
      query.project = { $in: scopedIds.filter((id) => visible.has(String(id))) };
    } else if (query.project) {
      query.project = scopedIds.some((id) => String(id) === String(query.project)) ? query.project : { $in: [] };
    } else {
      query.project = { $in: scopedIds };
    }
  }
  if (status) query.status = status;
  if (assignee) query.assignee = assignee;
  if (priority) query.priority = priority;
  if (approvalStatus) query.approvalStatus = approvalStatus;
  if (search) query.$text = { $search: search };
  if (due === 'overdue') query.dueDate = { $lt: new Date() };
  const skip = (Number(page) - 1) * Number(limit);
  const [items, total] = await Promise.all([
    populateTask(Task.find(query)).sort({ position: 1, dueDate: 1 }).skip(skip).limit(Number(limit)),
    Task.countDocuments(query)
  ]);
  res.json({ items, total, page: Number(page), pages: Math.ceil(total / Number(limit)) || 1 });
});

export const createTask = asyncHandler(async (req, res) => {
  const payload = cleanTaskPayload(req.body);
  const project = await getProjectForUser(payload.project, req.user);
  if (!project) {
    res.status(project === null ? 404 : 403);
    throw new Error(project === null ? 'Project not found' : 'No project access');
  }
  await ensureAssigneeIsVisible(req.user, payload.assignee);
  const task = await Task.create({
    ...payload,
    reporter: req.user._id,
    assignedBy: req.user._id,
    reviewer: payload.reviewer || project.projectManager || project.owner,
    activity: [{ user: req.user._id, action: 'Task created' }]
  });
  const populated = await populateTask(Task.findById(task._id));
  if (task.assignee) {
    await createNotification({
      recipient: task.assignee,
      actor: req.user._id,
      project: task.project,
      task: task._id,
      type: 'TASK_ASSIGNED',
      message: `You were assigned "${task.title}"`
    });
  }
  emitToProject(task.project, 'task:created', populated);
  res.status(201).json(populated);
});

export const getTask = asyncHandler(async (req, res) => {
  const task = await populateTask(Task.findById(req.params.id));
  if (!task) {
    res.status(404);
    throw new Error('Task not found');
  }
  const project = await getProjectForUser(task.project._id, req.user);
  if (!project) {
    res.status(403);
    throw new Error('No project access');
  }
  const comments = await Comment.find({ task: task._id })
    .populate('author', 'name email avatar')
    .sort({ createdAt: -1 });
  res.json({ ...task.toObject(), comments });
});

export const updateTask = asyncHandler(async (req, res) => {
  const payload = cleanTaskPayload(req.body);
  const task = await Task.findById(req.params.id);
  if (!task) {
    res.status(404);
    throw new Error('Task not found');
  }
  const project = await getProjectForUser(task.project, req.user);
  if (!project) {
    res.status(403);
    throw new Error('No project access');
  }
  const previousStatus = task.status;
  const previousAssignee = task.assignee;
  await ensureAssigneeIsVisible(req.user, payload.assignee);
  ['title', 'description', 'priority', 'status', 'dueDate', 'assignee', 'position', 'labels'].forEach((field) => {
    if (payload[field] !== undefined) task[field] = payload[field];
  });
  ['reviewer', 'approvalStatus', 'reviewStatus', 'delegatedBy', 'parentTask', 'escalation'].forEach((field) => {
    if (payload[field] !== undefined) task[field] = payload[field];
  });
  if (payload.status && payload.status !== previousStatus) {
    task.activity.push({ user: req.user._id, action: 'Status updated', from: previousStatus, to: payload.status });
    if (payload.status === 'Review' && task.approvalStatus === 'Not Required') {
      task.approvalStatus = 'Pending';
      task.reviewStatus = 'In Review';
    }
  }
  if (payload.assignee && String(payload.assignee) !== String(previousAssignee || '')) {
    task.assignedBy = req.user._id;
    if (previousAssignee) task.delegatedBy = req.user._id;
    task.activity.push({ user: req.user._id, action: 'Assignee changed' });
    await createNotification({
      recipient: payload.assignee,
      actor: req.user._id,
      project: task.project,
      task: task._id,
      type: 'TASK_ASSIGNED',
      message: `You were assigned "${task.title}"`
    });
  }
  await task.save();
  const populated = await populateTask(Task.findById(task._id));
  emitToProject(task.project, 'task:updated', populated);
  res.json(populated);
});

export const reviewTask = asyncHandler(async (req, res) => {
  const task = await Task.findById(req.params.id);
  if (!task) {
    res.status(404);
    throw new Error('Task not found');
  }
  const project = await getProjectForUser(task.project, req.user);
  if (!project) {
    res.status(403);
    throw new Error('No project access');
  }

  const isReviewer = String(task.reviewer || '') === String(req.user._id);
  const canReview = isCompanyAdmin(req.user) || canManageProject(project, req.user) || isReviewer;
  if (!canReview) {
    res.status(403);
    throw new Error('Only reviewers and project leaders can approve this task');
  }

  const decision = req.body.decision;
  if (!['approve', 'reject'].includes(decision)) {
    res.status(400);
    throw new Error('Decision must be approve or reject');
  }

  const previousApproval = task.approvalStatus;
  task.approvalStatus = decision === 'approve' ? 'Approved' : 'Rejected';
  task.reviewStatus = decision === 'approve' ? 'Accepted' : 'Changes Requested';
  if (decision === 'approve') task.status = 'Completed';
  if (decision === 'reject') task.status = 'In Progress';
  task.activity.push({
    user: req.user._id,
    action: decision === 'approve' ? 'Task approved' : 'Task rejected',
    from: previousApproval,
    to: task.approvalStatus
  });
  await task.save();

  await recordActivity({
    req,
    action: decision === 'approve' ? 'task.approved' : 'task.rejected',
    entityType: 'Task',
    entityId: task._id,
    project: task.project,
    task: task._id,
    metadata: { previousApproval, approvalStatus: task.approvalStatus, note: req.body.note }
  });

  if (task.assignee) {
    await createNotification({
      recipient: task.assignee,
      actor: req.user._id,
      project: task.project,
      task: task._id,
      type: decision === 'approve' ? 'TASK_APPROVED' : 'TASK_REJECTED',
      message: decision === 'approve' ? `"${task.title}" was approved` : `"${task.title}" needs changes`
    });
  }

  const populated = await populateTask(Task.findById(task._id));
  emitToProject(task.project, 'task:reviewed', populated);
  emitToProject(task.project, 'task:updated', populated);
  res.json(populated);
});

export const deleteTask = asyncHandler(async (req, res) => {
  const task = await Task.findById(req.params.id);
  if (!task) {
    res.status(404);
    throw new Error('Task not found');
  }
  const project = await getProjectForUser(task.project, req.user);
  if (!project) {
    res.status(403);
    throw new Error('No project access');
  }
  await Comment.deleteMany({ task: task._id });
  await task.deleteOne();
  emitToProject(task.project, 'task:deleted', { id: task._id });
  res.status(204).end();
});

export const reorderTasks = asyncHandler(async (req, res) => {
  const { updates } = req.body;
  await Promise.all(
    updates.map((item) =>
      Task.updateOne({ _id: item.id }, { status: item.status, position: item.position })
    )
  );
  res.json({ message: 'Board updated' });
});

export const uploadAttachment = asyncHandler(async (req, res) => {
  const task = await Task.findById(req.params.id);
  if (!task || !req.file) {
    res.status(task ? 400 : 404);
    throw new Error(task ? 'File is required' : 'Task not found');
  }
  const project = await getProjectForUser(task.project, req.user);
  if (!project) {
    res.status(403);
    throw new Error('No project access');
  }
  task.attachments.push({
    originalName: req.file.originalname,
    url: publicUploadPath(req.file.filename),
    mimeType: req.file.mimetype,
    size: req.file.size,
    uploadedBy: req.user._id
  });
  task.activity.push({ user: req.user._id, action: 'Attachment added' });
  await task.save();
  res.status(201).json(task.attachments.at(-1));
});
