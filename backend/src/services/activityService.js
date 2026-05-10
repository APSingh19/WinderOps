import ActivityLog from '../models/ActivityLog.js';

export const recordActivity = async ({ req, action, entityType, entityId, workspace, team, project, task, metadata = {} }) =>
  ActivityLog.create({
    workspace,
    team,
    project,
    task,
    actor: req?.user?._id,
    action,
    entityType,
    entityId,
    metadata,
    ip: req?.ip,
    userAgent: req?.headers?.['user-agent']
  });
