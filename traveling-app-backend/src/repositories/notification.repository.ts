import { PoolClient } from 'pg';

type NotificationInput = {
  eventKey:string; eventType:string; userId:string; bookingId?:string; payload?:Record<string,unknown>;
};

export async function enqueueNotification(c:PoolClient,input:NotificationInput) {
  return (await c.query(
    `INSERT INTO notification_outbox(event_key,event_type,user_id,booking_id,recipient_email,payload)
     SELECT $1,$2,$3,$4,u.email,$5::jsonb FROM users u WHERE u.id=$3
     ON CONFLICT(event_key) DO NOTHING RETURNING *`,
    [input.eventKey,input.eventType,input.userId,input.bookingId||null,JSON.stringify(input.payload||{})]
  )).rows[0]||null;
}

