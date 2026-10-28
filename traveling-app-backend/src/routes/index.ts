import { Router } from 'express';
import authRoutes from './auth.routes';
import discoveryRoutes from './discovery.routes';
import interactionRoutes from './interaction.routes';
import bookingRoutes from './booking.routes';
import adminRoutes from './admin.routes';

const apiRouter = Router();

// Map các routes nghiệp vụ
apiRouter.use('/auth', authRoutes);
apiRouter.use('/admin',adminRoutes);
apiRouter.use('/', discoveryRoutes);
apiRouter.use('/', interactionRoutes);
apiRouter.use('/', bookingRoutes);

export default apiRouter;
