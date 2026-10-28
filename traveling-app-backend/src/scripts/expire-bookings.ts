import {bookingRepository} from '../repositories/booking.repository';
import {pool} from '../config/database';
async function run(){
  if(process.env.CONFIRM_EXPIRY_JOB!=='yes')throw new Error('Set CONFIRM_EXPIRY_JOB=yes after reviewing the target DATABASE_URL');
  console.log(await bookingRepository.expirePending());
}
run().catch(e=>{console.error(e.message);process.exitCode=1;}).finally(()=>pool.end());
