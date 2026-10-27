import PDFDocument from 'pdfkit';
import { Response } from 'express';

export interface ReceiptData {
  bookingCode: string;
  transactionReference: string;
  guestName: string;
  guestEmail: string;
  listingTitle: string;
  listingAddress: string;
  city: string;
  country: string;
  checkInDate: string;
  checkOutDate: string;
  totalNights: number;
  guests: number;
  pricePerNight: number;
  basePriceTotal: number;
  cleaningFee: number;
  serviceFee: number;
  totalPrice: number;
  paymentMethod: string;
  cardLast4: string;
  paidAt: string;
  status: string;
}

export class PdfService {
  generateReceipt(res: Response, data: ReceiptData) {
    const doc = new PDFDocument({
      size: 'A4',
      margin: 48,
    });

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader(
      'Content-Disposition',
      `inline; filename=Receipt-${data.bookingCode}.pdf`
    );

    doc.pipe(res);

    // --- Header ---
    doc
      .fillColor('#00BCD4')
      .fontSize(22)
      .font('Helvetica-Bold')
      .text('TRAVELING APP', 48, 48);

    doc
      .fillColor('#666666')
      .fontSize(10)
      .font('Helvetica')
      .text('Official Booking Receipt & Invoice', 48, 74);

    // Badge "PAID - MOCK PAYMENT"
    doc
      .rect(400, 44, 150, 36)
      .lineWidth(1.5)
      .strokeColor('#00BCD4')
      .stroke();

    doc
      .fillColor('#00BCD4')
      .fontSize(11)
      .font('Helvetica-Bold')
      .text('PAID - MOCK PAYMENT', 400, 56, { width: 150, align: 'center' });

    doc
      .strokeColor('#E0E0E0')
      .lineWidth(1)
      .moveTo(48, 100)
      .lineTo(550, 100)
      .stroke();

    // --- Booking & Guest Information ---
    let y = 120;
    doc
      .fillColor('#222222')
      .fontSize(12)
      .font('Helvetica-Bold')
      .text('BOOKING REFERENCE', 48, y);
    doc
      .fillColor('#555555')
      .fontSize(11)
      .font('Helvetica')
      .text(`#${data.bookingCode}`, 48, y + 16);

    doc
      .fillColor('#222222')
      .fontSize(12)
      .font('Helvetica-Bold')
      .text('TRANSACTION REF', 320, y);
    doc
      .fillColor('#555555')
      .fontSize(11)
      .font('Helvetica')
      .text(data.transactionReference, 320, y + 16);

    y += 45;
    doc
      .fillColor('#222222')
      .fontSize(12)
      .font('Helvetica-Bold')
      .text('GUEST DETAILS', 48, y);
    doc
      .fillColor('#555555')
      .fontSize(10)
      .font('Helvetica')
      .text(`Name: ${data.guestName}`, 48, y + 16)
      .text(`Email: ${data.guestEmail}`, 48, y + 30);

    doc
      .fillColor('#222222')
      .fontSize(12)
      .font('Helvetica-Bold')
      .text('PAYMENT DETAILS', 320, y);
    doc
      .fillColor('#555555')
      .fontSize(10)
      .font('Helvetica')
      .text(`Method: ${data.paymentMethod.toUpperCase()}`, 320, y + 16)
      .text(`Card: •••• •••• •••• ${data.cardLast4}`, 320, y + 30)
      .text(`Date: ${new Date(data.paidAt).toLocaleDateString()}`, 320, y + 44);

    y += 75;
    // --- Listing Info ---
    doc
      .rect(48, y, 502, 60)
      .fillColor('#F8FAFC')
      .fill();

    doc
      .fillColor('#00BCD4')
      .fontSize(13)
      .font('Helvetica-Bold')
      .text(data.listingTitle, 60, y + 12);

    doc
      .fillColor('#666666')
      .fontSize(10)
      .font('Helvetica')
      .text(`${data.listingAddress}, ${data.city}, ${data.country}`, 60, y + 32);

    y += 80;
    // --- Stay Dates ---
    doc
      .fillColor('#222222')
      .fontSize(10)
      .font('Helvetica-Bold')
      .text('CHECK-IN', 48, y)
      .text('CHECK-OUT', 200, y)
      .text('TOTAL NIGHTS', 340, y)
      .text('GUESTS', 460, y);

    doc
      .fillColor('#444444')
      .fontSize(11)
      .font('Helvetica')
      .text(data.checkInDate, 48, y + 16)
      .text(data.checkOutDate, 200, y + 16)
      .text(`${data.totalNights} nights`, 340, y + 16)
      .text(`${data.guests} person(s)`, 460, y + 16);

    y += 50;
    doc
      .strokeColor('#E0E0E0')
      .lineWidth(1)
      .moveTo(48, y)
      .lineTo(550, y)
      .stroke();

    y += 15;
    // --- Pricing Breakdown Table ---
    doc
      .fillColor('#222222')
      .fontSize(12)
      .font('Helvetica-Bold')
      .text('PRICE BREAKDOWN', 48, y);

    y += 24;
    const items = [
      {
        desc: `$${data.pricePerNight.toFixed(2)} x ${data.totalNights} nights`,
        amount: `$${data.basePriceTotal.toFixed(2)}`,
      },
      {
        desc: 'Cleaning Fee',
        amount: `$${data.cleaningFee.toFixed(2)}`,
      },
      {
        desc: 'Service Fee',
        amount: `$${data.serviceFee.toFixed(2)}`,
      },
    ];

    items.forEach((item) => {
      doc
        .fillColor('#555555')
        .fontSize(10)
        .font('Helvetica')
        .text(item.desc, 48, y)
        .text(item.amount, 460, y, { width: 90, align: 'right' });
      y += 18;
    });

    y += 10;
    doc
      .strokeColor('#00BCD4')
      .lineWidth(1.5)
      .moveTo(48, y)
      .lineTo(550, y)
      .stroke();

    y += 12;
    // Total Amount
    doc
      .fillColor('#222222')
      .fontSize(14)
      .font('Helvetica-Bold')
      .text('TOTAL AMOUNT (USD)', 48, y)
      .fillColor('#00BCD4')
      .text(`$${data.totalPrice.toFixed(2)}`, 400, y, { width: 150, align: 'right' });

    // --- Footer ---
    doc
      .fillColor('#999999')
      .fontSize(9)
      .font('Helvetica')
      .text(
        'Thank you for traveling with Traveling App. This document serves as proof of reservation and receipt.',
        48,
        740,
        { width: 502, align: 'center' }
      );

    doc.end();
  }
}

export const pdfService = new PdfService();
