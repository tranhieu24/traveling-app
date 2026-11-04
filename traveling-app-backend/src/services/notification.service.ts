import { pool } from '../config/database';
import { ENV } from '../config/env';
import { transaction } from './transaction';

type OutboxRow={id:string;event_key:string;event_type:string;recipient_email:string;payload:Record<string,unknown>;attempts:number};
type Delivery={messageId:string};
export type NotificationSender=(row:OutboxRow)=>Promise<Delivery>;

const webhookSender:NotificationSender=async row=>{
  const response=await fetch(ENV.EMAIL_WEBHOOK_URL,{
    method:'POST',headers:{'content-type':'application/json',authorization:`Bearer ${ENV.EMAIL_WEBHOOK_SECRET}`},
    body:JSON.stringify({idempotencyKey:row.event_key,to:row.recipient_email,template:row.event_type,data:row.payload}),
    signal:AbortSignal.timeout(ENV.EMAIL_TIMEOUT_MS),
  });
  if(!response.ok) throw new Error(`Email provider HTTP ${response.status}`);
  const body=await response.json().catch(()=>({})) as {id?:unknown;messageId?:unknown};
  const id=body.messageId||body.id;
  if(typeof id!=='string'||!id) throw new Error('Email provider did not confirm a message ID');
  return {messageId:id};
};

export async function dispatchNotifications(limit=25,sender:NotificationSender=webhookSender) {
  if(ENV.EMAIL_MODE==='disabled') return {mode:'disabled',claimed:0,sent:0,failed:0};
  const rows=await transaction(async c=>(await c.query(
    `WITH picked AS (SELECT id FROM notification_outbox
       WHERE status IN ('pending','failed') AND next_attempt_at<=now() AND attempts<$1
       ORDER BY next_attempt_at,created_at FOR UPDATE SKIP LOCKED LIMIT $2)
     UPDATE notification_outbox o SET status='processing',locked_at=now(),attempts=attempts+1,updated_at=now()
     FROM picked WHERE o.id=picked.id RETURNING o.*`,[ENV.EMAIL_MAX_ATTEMPTS,limit])).rows as OutboxRow[]);
  let sent=0,failed=0;
  for(const row of rows){
    try{
      const delivered=await sender(row);
      await pool.query("UPDATE notification_outbox SET status='sent',provider_message_id=$2,sent_at=now(),locked_at=NULL,last_error=NULL,updated_at=now() WHERE id=$1 AND status='processing'",[row.id,delivered.messageId]);
      sent++;
    }catch(error){
      const message=error instanceof Error?error.message:'Unknown provider error';
      const delay=Math.min(3600,Math.pow(2,row.attempts)*30);
      await pool.query("UPDATE notification_outbox SET status='failed',next_attempt_at=now()+make_interval(secs=>$2),locked_at=NULL,last_error=left($3,500),updated_at=now() WHERE id=$1 AND status='processing'",[row.id,delay,message]);
      failed++;
    }
  }
  return {mode:ENV.EMAIL_MODE,claimed:rows.length,sent,failed};
}

