import { Router } from 'express';
import publicRoutes from './public.routes';
import speakerRoutes from './speaker.routes';
import adminRoutes from './admin.routes';

const router = Router();

// Public routes (no authentication required)
router.use('/', publicRoutes);

// Speaker routes (SPEAKER role required)
router.use('/', speakerRoutes);

// Admin routes (ADMIN role required)
router.use('/admin', adminRoutes);

export default router;
