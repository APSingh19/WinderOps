import dotenv from 'dotenv';
import { connectDB } from './config/db.js';
import Comment from './models/Comment.js';
import Notification from './models/Notification.js';
import Project from './models/Project.js';
import Task from './models/Task.js';
import User from './models/User.js';

dotenv.config();
await connectDB();

await Promise.all([
  User.deleteMany({}),
  Project.deleteMany({}),
  Task.deleteMany({}),
  Comment.deleteMany({}),
  Notification.deleteMany({})
]);

const [admin, designer, engineer] = await User.create([
  { name: 'AP Singh', email: 'admin@example.com', password: 'password123', role: 'Admin', title: 'Product Lead' },
  { name: 'Maya Chen', email: 'maya@example.com', password: 'password123', role: 'Member', title: 'Designer' },
  { name: 'Noah Patel', email: 'noah@example.com', password: 'password123', role: 'Member', title: 'Full-stack Engineer' }
]);

const project = await Project.create({
  name: 'Launch Workspace',
  key: 'LWS',
  description: 'A polished launch plan for the collaborative task platform.',
  owner: admin._id,
  status: 'Active',
  color: '#0f766e',
  members: [
    { user: admin._id, role: 'Admin' },
    { user: designer._id, role: 'Member' },
    { user: engineer._id, role: 'Member' }
  ],
  dueDate: new Date(Date.now() + 1000 * 60 * 60 * 24 * 21)
});

await Task.create([
  {
    title: 'Design task detail drawer',
    description: 'Include comments, attachments, activity history, and fast status changes.',
    project: project._id,
    reporter: admin._id,
    assignee: designer._id,
    priority: 'High',
    status: 'In Progress',
    dueDate: new Date(Date.now() + 1000 * 60 * 60 * 24 * 4),
    position: 1,
    labels: ['UX', 'Dashboard'],
    activity: [{ user: admin._id, action: 'Task created' }]
  },
  {
    title: 'Connect analytics widgets',
    description: 'Power the dashboard using aggregated project and task data.',
    project: project._id,
    reporter: admin._id,
    assignee: engineer._id,
    priority: 'Medium',
    status: 'Review',
    dueDate: new Date(Date.now() + 1000 * 60 * 60 * 24 * 7),
    position: 1,
    labels: ['API', 'Charts'],
    activity: [{ user: admin._id, action: 'Task created' }]
  }
]);

console.log('Seed complete. Login with admin@example.com / password123');
process.exit(0);
