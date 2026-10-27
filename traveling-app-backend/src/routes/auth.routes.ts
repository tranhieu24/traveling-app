import { Router } from 'express';
import { authController } from '../controllers/auth.controller';
import { requireAuth } from '../middlewares/auth.middleware';
import { validate } from '../middlewares/validate.middleware';
import { updateProfileSchema } from '../validators/schemas';

const router = Router();

router.get('/me', requireAuth, authController.getMe);
router.patch('/me', requireAuth, validate(updateProfileSchema, 'body'), authController.updateMe);

export default router;
