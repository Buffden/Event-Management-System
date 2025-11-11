import { Router } from 'express';
import bookingRoutes from './booking.routes';
import { ticketRoutes } from './ticket.routes';
import speakerRoutes from './speaker.routes';
import adminRoutes from './admin.routes';
import attendanceRoutes from './attendance.routes';
import internalRoutes from './internal.routes';
import seederRoutes from './seeder.routes';

const router = Router();

// Internal routes (service-to-service) - MUST be first to avoid conflicts
router.use('/', internalRoutes);

// Attendance routes (All authenticated users) - MUST be first to avoid conflicts with booking routes
router.use('/', attendanceRoutes);

// Booking routes (USER/ADMIN role required)
router.use('/', bookingRoutes);

// Ticket routes (USER/ADMIN role required)
router.use('/tickets', ticketRoutes);

// Speaker routes (SPEAKER role required)
router.use('/speaker', speakerRoutes);

// Admin routes (ADMIN role required)
router.use('/admin', adminRoutes);

// Seeder routes (ADMIN role required, for seeding script)
router.use('/admin', seederRoutes);

export default router;
