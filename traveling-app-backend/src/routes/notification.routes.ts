import { Router, Response, NextFunction } from 'express';
import { requireAuth } from '../middlewares/auth.middleware';
import { validate } from '../middlewares/validate.middleware';
import { notificationListSchema, notificationReadAllSchema, notificationReadSchema, uuidParams } from '../validators/schemas';
import { AuthenticatedRequest, sendSuccess } from '../types';
import { inappNotifications } from '../repositories/inappNotification.repository';

const router = Router();
router.use((_req, res, next) => { res.setHeader('Cache-Control', 'private, no-store'); next(); });
router.use(requireAuth);
const handle = (fn: (req: AuthenticatedRequest, res: Response) => Promise<unknown>) =>
  (req: AuthenticatedRequest, res: Response, next: NextFunction) => { void fn(req, res).catch(next); };

router.get('/unread-count', handle(async (req, res) => sendSuccess(res, { unreadCount: await inappNotifications.unreadCount(req.user!.id) })));
router.get('/', validate(notificationListSchema, 'query'), handle(async (req, res) => {
  const language = /^en(?:[-,;]|$)/i.test(req.get('Accept-Language') || '') ? 'en' : 'vi';
  const result = await inappNotifications.list(req.user!.id, Number(req.query.page), Number(req.query.limit), (req.query as unknown as { unreadOnly: boolean }).unreadOnly, language);
  return sendSuccess(res, { items: result.items, unreadCount: result.unreadCount }, 200, result.pagination);
}));
router.patch('/read-all', validate(notificationReadAllSchema), handle(async (req, res) => sendSuccess(res, await inappNotifications.markAllRead(req.user!.id, req.body.before))));
router.patch('/:id/read', validate(uuidParams, 'params'), validate(notificationReadSchema), handle(async (req, res) => sendSuccess(res, await inappNotifications.markRead(req.user!.id, req.params.id))));
export default router;
