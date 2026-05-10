import mongoose from 'mongoose';
import User from '../models/User.js';
import { roleLevels, isCompanyAdmin } from '../constants/roles.js';

const publicFields = 'name email avatar title role designation department managerId teamLeadId hierarchyLevel lastActiveAt';

export const getDescendantIds = async (managerId) => {
  const [result] = await User.aggregate([
    { $match: { _id: new mongoose.Types.ObjectId(managerId) } },
    {
      $graphLookup: {
        from: 'users',
        startWith: '$_id',
        connectFromField: '_id',
        connectToField: 'managerId',
        as: 'descendants',
        maxDepth: 12,
        depthField: 'depth'
      }
    },
    { $project: { ids: '$descendants._id' } }
  ]);
  return result?.ids || [];
};

export const getVisibleEmployeeIds = async (user) => {
  if (isCompanyAdmin(user)) return null;
  const descendants = await getDescendantIds(user._id);
  return [user._id, ...descendants];
};

export const buildOrganizationTree = async ({ companyId, rootId, viewer }) => {
  const match = {};
  if (companyId) match.companyId = new mongoose.Types.ObjectId(companyId);
  if (rootId) match._id = new mongoose.Types.ObjectId(rootId);
  if (!rootId && !isCompanyAdmin(viewer)) match._id = new mongoose.Types.ObjectId(viewer._id);
  if (!rootId && isCompanyAdmin(viewer)) match.$or = [{ managerId: { $exists: false } }, { managerId: null }];

  const roots = await User.aggregate([
    { $match: match },
    {
      $graphLookup: {
        from: 'users',
        startWith: '$_id',
        connectFromField: '_id',
        connectToField: 'managerId',
        as: 'descendants',
        maxDepth: 12,
        depthField: 'depth'
      }
    },
    {
      $project: {
        name: 1,
        email: 1,
        avatar: 1,
        title: 1,
        role: 1,
        designation: 1,
        department: 1,
        managerId: 1,
        hierarchyLevel: 1,
        descendants: {
          _id: 1,
          name: 1,
          email: 1,
          avatar: 1,
          title: 1,
          role: 1,
          designation: 1,
          department: 1,
          managerId: 1,
          hierarchyLevel: 1,
          depth: 1
        }
      }
    }
  ]);

  const hydrate = (root) => {
    const nodes = [root, ...(root.descendants || [])].map((node) => ({ ...node, children: [] }));
    const map = new Map(nodes.map((node) => [String(node._id), node]));
    nodes.forEach((node) => {
      const parent = map.get(String(node.managerId));
      if (parent && String(parent._id) !== String(node._id)) parent.children.push(node);
    });
    const tree = map.get(String(root._id));
    delete tree.descendants;
    const sortChildren = (node) => {
      node.children.sort((a, b) => (a.hierarchyLevel ?? 99) - (b.hierarchyLevel ?? 99) || a.name.localeCompare(b.name));
      node.children.forEach(sortChildren);
    };
    sortChildren(tree);
    return tree;
  };

  return roots.map(hydrate);
};

export const getReportingChain = async (userId) => {
  const [result] = await User.aggregate([
    { $match: { _id: new mongoose.Types.ObjectId(userId) } },
    {
      $graphLookup: {
        from: 'users',
        startWith: '$managerId',
        connectFromField: 'managerId',
        connectToField: '_id',
        as: 'managers',
        maxDepth: 12,
        depthField: 'depth'
      }
    },
    { $project: { managers: { _id: 1, name: 1, email: 1, role: 1, designation: 1, hierarchyLevel: 1, depth: 1 } } }
  ]);
  return (result?.managers || []).sort((a, b) => b.depth - a.depth);
};

export const canManageEmployee = async (manager, employeeId) => {
  if (isCompanyAdmin(manager)) return true;
  if (String(manager._id) === String(employeeId)) return false;
  const descendants = await getDescendantIds(manager._id);
  return descendants.some((id) => String(id) === String(employeeId));
};

export const assignManager = async ({ employeeId, managerId, actor }) => {
  if (String(employeeId) === String(managerId)) throw new Error('An employee cannot report to themselves');
  const [employee, manager] = await Promise.all([
    User.findById(employeeId),
    User.findById(managerId).select(publicFields)
  ]);
  if (!employee || !manager) throw new Error('Employee or manager not found');
  if (!(await canManageEmployee(actor, employeeId)) && !isCompanyAdmin(actor)) throw new Error('You cannot move this employee');
  const descendants = await getDescendantIds(employeeId);
  if (descendants.some((id) => String(id) === String(managerId))) throw new Error('Circular hierarchy is not allowed');

  await User.updateOne({ _id: employee.managerId }, { $pull: { subordinates: employee._id } });
  employee.managerId = manager._id;
  employee.teamLeadId = manager.role === 'Team Leader' ? manager._id : manager.teamLeadId;
  employee.department = manager.department || employee.department;
  employee.workspace = manager.workspace || employee.workspace;
  employee.companyId = manager.companyId || employee.companyId;
  employee.hierarchyLevel = Math.max((manager.hierarchyLevel ?? roleLevels[manager.role] ?? 5) + 1, roleLevels[employee.role] ?? 5);
  await employee.save();
  await User.updateOne({ _id: manager._id }, { $addToSet: { subordinates: employee._id } });
  return employee.populate('managerId teamLeadId department', 'name email role designation title code');
};
