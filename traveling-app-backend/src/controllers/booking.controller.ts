import { Response, NextFunction } from 'express';
import { AuthenticatedRequest, sendSuccess, AppError } from '../types';
import { bookingRepository } from '../repositories/booking.repository';
import { pdfService } from '../services/pdf.service';

export class BookingController {
  async quote(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const { listingId, checkInDate, checkOutDate, guests } = req.body;
      const quote = await bookingRepository.quoteBooking(
        listingId,
        checkInDate,
        checkOutDate,
        guests
      );
      return sendSuccess(res, quote);
    } catch (error) {
      next(error);
    }
  }

  async create(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      if (!req.user) {
        throw new AppError('Unauthorized', 401, 'UNAUTHORIZED');
      }

      const {
        listingId,
        checkInDate,
        checkOutDate,
        guests,
        specialRequests,
        paymentMethod,
        mockCardLast4,
      } = req.body;

      const result = await bookingRepository.createBookingWithTransaction({
        listingId,
        guestId: req.user.id,
        checkInDate,
        checkOutDate,
        guests,
        specialRequests,
        paymentMethod: paymentMethod || 'credit_card',
        mockCardLast4: mockCardLast4 || '4242',
      });

      return sendSuccess(res, result, 201);
    } catch (error) {
      next(error);
    }
  }

  async getMyBookings(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      if (!req.user) {
        throw new AppError('Unauthorized', 401, 'UNAUTHORIZED');
      }

      const status = req.query.status as string | undefined;
      const bookings = await bookingRepository.getUserBookings(req.user.id, status);
      return sendSuccess(res, bookings);
    } catch (error) {
      next(error);
    }
  }

  async getBookingDetail(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      if (!req.user) {
        throw new AppError('Unauthorized', 401, 'UNAUTHORIZED');
      }

      const { id } = req.params;
      const booking = await bookingRepository.getBookingDetail(id, req.user.id);
      if (!booking) {
        throw new AppError('Booking not found or access denied', 404, 'NOT_FOUND');
      }

      return sendSuccess(res, booking);
    } catch (error) {
      next(error);
    }
  }

  async cancelBooking(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      if (!req.user) {
        throw new AppError('Unauthorized', 401, 'UNAUTHORIZED');
      }

      const { id } = req.params;
      const cancelledBooking = await bookingRepository.cancelBooking(id, req.user.id);
      return sendSuccess(res, cancelledBooking);
    } catch (error) {
      next(error);
    }
  }

  async downloadReceipt(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      if (!req.user) {
        throw new AppError('Unauthorized', 401, 'UNAUTHORIZED');
      }

      const { bookingId } = req.params;
      const booking = await bookingRepository.getBookingDetail(bookingId, req.user.id);

      if (!booking) {
        throw new AppError('Booking not found', 404, 'NOT_FOUND');
      }

      if (booking.booking_status !== 'confirmed') {
        throw new AppError('Receipt is only available for confirmed bookings', 400, 'INVALID_BOOKING_STATUS');
      }

      pdfService.generateReceipt(res, {
        bookingCode: booking.booking_code,
        transactionReference: booking.transaction_reference || `TXN-${booking.id.slice(0, 8)}`,
        guestName: booking.guest_name || req.user.full_name || 'Traveler',
        guestEmail: booking.guest_email || req.user.email,
        listingTitle: booking.listing_title,
        listingAddress: booking.listing_address || 'Address on file',
        city: booking.listing_city,
        country: booking.listing_country,
        checkInDate: new Date(booking.check_in_date).toISOString().split('T')[0],
        checkOutDate: new Date(booking.check_out_date).toISOString().split('T')[0],
        totalNights: booking.total_nights,
        guests: booking.number_of_guests,
        pricePerNight: parseFloat(booking.price_per_night),
        basePriceTotal: parseFloat(booking.base_price_total),
        cleaningFee: parseFloat(booking.cleaning_fee || '0'),
        serviceFee: parseFloat(booking.service_fee || '0'),
        totalPrice: parseFloat(booking.total_price),
        paymentMethod: booking.payment_method || 'credit_card',
        cardLast4: booking.mock_card_last4 || '4242',
        paidAt: booking.paid_at || booking.created_at,
        status: booking.booking_status,
      });
    } catch (error) {
      next(error);
    }
  }
}

export const bookingController = new BookingController();
