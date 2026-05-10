import { z } from 'zod';

const objectId = z.string().regex(/^[a-f\d]{24}$/i, 'Invalid MongoDB id');

const subtaskSchema = z.object({
  title: z.string().trim().min(1),
  completed: z.boolean().optional(),
  assignee: objectId.optional(),
  dueDate: z.string().datetime().optional()
});

const taskBodySchema = z.object({
  title: z.string().trim().min(2).max(160),
  description: z.string().max(3000).optional(),
  project: objectId,
  assignee: objectId.optional().nullable(),
  priority: z.enum(['Low', 'Medium', 'High']).optional(),
  status: z.enum(['Todo', 'In Progress', 'Review', 'Completed']).optional(),
  dueDate: z.string().datetime().optional().or(z.literal('')),
  startDate: z.string().datetime().optional().or(z.literal('')),
  labels: z.array(z.string().trim()).optional(),
  tags: z.array(z.string().trim()).optional(),
  subtasks: z.array(subtaskSchema).optional()
});

export const createTaskSchema = z.object({
  body: taskBodySchema,
  query: z.object({}).passthrough(),
  params: z.object({}).passthrough()
});

export const updateTaskSchema = z.object({
  body: taskBodySchema.partial(),
  query: z.object({}).passthrough(),
  params: z.object({ id: objectId })
});
