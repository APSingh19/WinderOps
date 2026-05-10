import Notification from '../models/Notification.js';
import { emitToUser } from '../config/socket.js';

export const createNotification = async (payload) => {
  if (!payload.recipient) return null;
  if (payload.actor && String(payload.recipient) === String(payload.actor)) return null;

  const notification = await Notification.create(payload);
  const populated = await notification.populate('actor project task', 'name title key');
  emitToUser(payload.recipient, 'notification:new', populated);
  return populated;
};
