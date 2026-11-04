import { pool } from '../config/database';
import { dispatchNotifications } from '../services/notification.service';

dispatchNotifications(Number(process.argv[2]||25))
  .then(result=>{ console.log(JSON.stringify(result)); process.exitCode=result.failed?1:0; })
  .catch(error=>{ console.error(error instanceof Error?error.message:'Notification worker failed'); process.exitCode=1; })
  .finally(()=>pool.end());

