import Task from '../models/Task.js';
import { getPagination, getSort } from '../helpers/query.js';

export const findTasks = async (query, requestQuery) => {
  const { page, limit, skip } = getPagination(requestQuery, { limit: 50, maxLimit: 100 });
  const [items, total] = await Promise.all([
    Task.find(query)
      .populate('assignee reporter assignedBy delegatedBy delegatedTo reviewer', 'name email avatar title role designation')
      .populate('project', 'name key color')
      .sort(getSort(requestQuery, 'position'))
      .skip(skip)
      .limit(limit),
    Task.countDocuments(query)
  ]);

  return { items, total, page, limit };
};
