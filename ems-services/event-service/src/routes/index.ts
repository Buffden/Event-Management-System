import { Router } from 'express';
import publicRoutes from './public.routes';
import speakerRoutes from './speaker.routes';
import adminRoutes from './admin.routes';
import seederRoutes from './seeder.routes';

const router = Router();

// Public routes (no authentication required)
router.use('/', publicRoutes);

// Speaker routes (SPEAKER role required)
router.use('/speaker', speakerRoutes);

// Admin routes (ADMIN role required)
router.use('/admin', adminRoutes);

// Seeder routes (ADMIN role required, for seeding script)
router.use('/admin', seederRoutes);

export default router;
