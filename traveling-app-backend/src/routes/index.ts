import { Router } from 'express';
import authRoutes from './auth.routes';
import discoveryRoutes from './discovery.routes';
import interactionRoutes from './interaction.routes';
import bookingRoutes from './booking.routes';
import adminRoutes from './admin.routes';
import supportRoutes from './support.routes';
import aiRoutes from './ai.routes';
import notificationRoutes from './notification.routes';

const apiRouter = Router();

// Map các routes nghiệp vụ
apiRouter.use('/auth', authRoutes);
apiRouter.use('/ai',aiRoutes);
apiRouter.use('/notifications',notificationRoutes);
apiRouter.use('/admin',adminRoutes);
apiRouter.use('/', discoveryRoutes);
apiRouter.use('/', interactionRoutes);
apiRouter.use('/', bookingRoutes);
apiRouter.use('/', supportRoutes);

export default apiRouter;
