import { Router } from 'express';
import { bookingController } from '../controllers/booking.controller';
import { requireAuth } from '../middlewares/auth.middleware';
import { validate } from '../middlewares/validate.middleware';
import { bookingQuoteSchema, createBookingSchema } from '../validators/schemas';

const router = Router();

// Booking quote & creation
router.post('/bookings/quote', validate(bookingQuoteSchema, 'body'), bookingController.quote);
router.post('/bookings', requireAuth, validate(createBookingSchema, 'body'), bookingController.create);

// Booking management
router.get('/bookings', requireAuth, bookingController.getMyBookings);
router.get('/bookings/:id', requireAuth, bookingController.getBookingDetail);
router.patch('/bookings/:id/cancel', requireAuth, bookingController.cancelBooking);

// Receipt PDF stream
router.get('/payments/:bookingId/receipt', requireAuth, bookingController.downloadReceipt);

export default router;
