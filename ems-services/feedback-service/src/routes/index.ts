import { Router } from 'express';
import feedbackRoutes from './feedback.routes';
import { errorHandler, notFoundHandler } from '../middleware/error.middleware';

const router = Router();

// Feedback routes
router.use('/feedback', feedbackRoutes);

// Error handling middleware
router.use(notFoundHandler);
router.use(errorHandler);

export default router;
