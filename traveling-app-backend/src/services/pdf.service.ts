import PDFDocument from 'pdfkit';
import { existsSync } from 'fs';
import { Response } from 'express';
const usd=(n:any)=>'$'+Number(n||0).toFixed(2);
export class PdfService {
  generateReceipt(res:Response,b:any) {
    const doc=new PDFDocument({size:'A4',margin:48});
    const font=process.env.RECEIPT_FONT || (process.platform==='win32'?'C:/Windows/Fonts/arial.ttf':'/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf');
    if(existsSync(font)) doc.font(font);
    res.setHeader('Content-Type','application/pdf');
    res.setHeader('Content-Disposition','attachment; filename="Receipt-'+b.booking_code+'.pdf"');
    res.setHeader('Cache-Control','private, no-store');
    doc.on('error',()=>res.destroy());
    doc.pipe(res);
    doc.fontSize(20).fillColor('#086B78').text('TRAVELING APP');
    doc.fontSize(12).fillColor('#222222').text('Booking and payment receipt').moveDown();
    const simulated=b.payments.filter((p:any)=>p.payment_status==='succeeded').every((p:any)=>p.is_simulated);
    doc.text(simulated?'SIMULATION - NO REAL PAYMENT':'TEST GATEWAY - NOT A LIVE PAYMENT').moveDown();
    doc.fontSize(10);
    for(const line of [
      'Reference: '+b.booking_code,'Guest: '+b.guest_name,'Email: '+b.guest_email,
      'Accommodation: '+b.listing_title,'Address: '+(b.listing_address||'')+', '+b.listing_city+', '+b.listing_country,
      'Stay: '+b.check_in_date+' to '+b.check_out_date+' ('+b.total_nights+' nights)',
      'Guests: '+b.number_of_guests,'Booking status: '+b.booking_status,
    ]) doc.text(line,{width:499}).moveDown(0.3);
    doc.moveDown().fontSize(12).text('Price breakdown (USD)').fontSize(10);
    for(const [name,amount] of [
      ['Nightly rate',b.price_per_night],['Room subtotal',b.base_price_total],['Cleaning fee',b.cleaning_fee],
      ['Service fee',b.service_fee],['Discount (-)',b.discount_amount],['Tax',b.tax_amount],['Trip total',b.total_price],
      ['Total payments received',b.amount_paid],['Refunds completed',b.amount_refunded],['Net received',b.net_paid],['Balance due',b.balance_due],
    ]) doc.text(name+': '+usd(amount)).moveDown(0.3);
    doc.moveDown().fontSize(12).text('Payment history').fontSize(9);
    for(const p of b.payments) doc.text([p.transaction_reference||p.id,p.provider,p.payment_status,usd(p.amount),p.paid_at||p.created_at].join(' | '),{width:499}).moveDown(0.4);
    if(b.refunds.length) {
      doc.moveDown().fontSize(12).text('Refund history').fontSize(9);
      for(const r of b.refunds) doc.text([r.provider_refund_id||r.id,r.status,usd(r.amount),r.succeeded_at||r.created_at].join(' | '),{width:499}).moveDown(0.4);
    }
    doc.moveDown().fontSize(8).text('Records only verified payment history. This receipt is not a statutory tax invoice.');
    doc.end();
  }
}
export const pdfService=new PdfService();
