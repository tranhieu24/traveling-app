import {pool} from '../config/database';
export class ReportRepository {
  async revenue(from:string,to:string) {
    const summary=(await pool.query(
      "WITH ledger AS (SELECT (coalesce(paid_at,created_at) AT TIME ZONE 'UTC')::date AS report_date,provider,is_simulated,amount AS gross,0::numeric AS refunded,1 AS payment_count,0 AS refund_count FROM payments WHERE payment_status='succeeded' UNION ALL SELECT (r.succeeded_at AT TIME ZONE 'UTC')::date,p.provider,p.is_simulated,0,r.amount,0,1 FROM refunds r JOIN payments p ON p.id=r.payment_id WHERE r.status='succeeded'), daily AS (SELECT report_date,provider,is_simulated,sum(gross) AS gross,sum(refunded) AS refunded,sum(payment_count) AS payment_count,sum(refund_count) AS refund_count FROM ledger WHERE report_date BETWEEN $1::date AND $2::date GROUP BY report_date,provider,is_simulated) SELECT coalesce(sum(gross),0)::text AS gross_payments,coalesce(sum(refunded),0)::text AS refunds,coalesce(sum(gross-refunded),0)::text AS net_revenue,coalesce(jsonb_agg(jsonb_build_object('day',report_date::text,'provider',provider,'is_simulated',is_simulated,'gross_payments',gross::text,'refunds',refunded::text,'net_revenue',(gross-refunded)::text,'successful_transactions',payment_count,'successful_refunds',refund_count) ORDER BY report_date,provider),'[]'::jsonb) AS items FROM daily",
      [from,to])).rows[0];
    return {from,to,timezone:'UTC',currency:'USD',scope:'test_and_mock_only',...summary};
  }
}
export const reportRepository=new ReportRepository();
