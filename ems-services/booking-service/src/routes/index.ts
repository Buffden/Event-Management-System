import { Router } from 'express';
import bookingRoutes from './booking.routes';
import { ticketRoutes } from './ticket.routes';
import speakerRoutes from './speaker.routes';
import adminRoutes from './admin.routes';
import attendanceRoutes from './attendance.routes';

const router = Router();

// Booking routes (USER/ADMIN role required)
router.use('/', bookingRoutes);

// Ticket routes (USER/ADMIN role required)
router.use('/tickets', ticketRoutes);

// Speaker routes (SPEAKER role required)
router.use('/speaker', speakerRoutes);

// Admin routes (ADMIN role required)
router.use('/admin', adminRoutes);

// Attendance routes (All authenticated users)
router.use('/', attendanceRoutes);

export default router;
