import type { SupabaseClient } from '@supabase/supabase-js';
import { getRecoveryRedirectUri,isRecoveryCallback,clearRecoveryCallback } from '../config/auth';
export const RECOVERY_SENT_MESSAGE='Nếu email đủ điều kiện khôi phục, bạn sẽ nhận được liên kết đặt lại mật khẩu. Kiểm tra cả thư rác và mở liên kết trên cùng trình duyệt hoặc thiết bị vừa gửi yêu cầu.';
const expired=()=>new Error('Liên kết hết hạn, đã dùng hoặc không khớp thiết bị. Vui lòng gửi yêu cầu khôi phục mới.');
export function createPasswordRecovery(auth:SupabaseClient['auth']) {
  let currentUrl='',completion:Promise<void>|null=null,recoveredUser:string|null=null,started=0,updating=false;
  return {
    async request(email:string) {
      if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim()))throw new Error('Vui lòng nhập email hợp lệ.');
      const redirectTo=getRecoveryRedirectUri();
      let error;
      try{({error}=await auth.resetPasswordForEmail(email.trim(),{redirectTo}));}catch{throw new Error('Chưa gửi được yêu cầu. Kiểm tra kết nối và thử lại.');}
      if(error&&['over_request_rate_limit','over_email_send_rate_limit'].includes(error.code||''))throw new Error('Bạn gửi quá nhiều lần. Vui lòng chờ rồi thử lại.');
      if(error&&error.code!=='user_not_found')throw new Error('Chưa gửi được yêu cầu khôi phục. Vui lòng thử lại sau.');
      return RECOVERY_SENT_MESSAGE;
    },
    async open(url:string) {
      if(!isRecoveryCallback(url))throw expired();
      if(completion&&url===currentUrl)return completion;
      currentUrl=url;recoveredUser=null;
      completion=(async()=>{
        const parsed=new URL(url),params=parsed.searchParams;
        if(params.has('error')||parsed.hash.includes('error'))throw expired();
        const code=params.get('code');if(!code)throw expired();
        const flowId=params.get('sb_flow_id');
        const {data,error}=await auth.exchangeCodeForSession(code,flowId?{flowId}:undefined);
        // Do not treat an ordinary login session as a recovery callback.
        if(error||!data.session||(data as {redirectType?:string}).redirectType!=='recovery')throw expired();
        if(currentUrl!==url)throw expired();
        recoveredUser=data.session.user.id;started=performance.now();
      })().catch(()=>{throw expired();});
      try{await completion;}catch{throw expired();}
    },
    async update(password:string) {
      if(updating)throw new Error('Đang cập nhật mật khẩu.');
      if(!recoveredUser||performance.now()-started>10*60*1000)throw expired();
      if(password.length<8||password.length>128)throw new Error('Mật khẩu mới cần từ 8 đến 128 ký tự.');
      updating=true;
      try {
        const {data,error}=await auth.getUser();
        if(error||data.user?.id!==recoveredUser)throw expired();
        const result=await auth.updateUser({password});
        if(result.error)throw new Error('Chưa đổi được mật khẩu. Chọn mật khẩu mạnh hơn hoặc gửi lại liên kết nếu phiên đã hết hạn.');
        recoveredUser=null;completion=null;currentUrl='';clearRecoveryCallback();
        // Local sign-out returns the user to the normal login flow. Provider errors
        // are not evidence that updating the password failed.
        try {const signedOut=await auth.signOut({scope:'local'});return {signedOut:!signedOut.error};}
        catch{return {signedOut:false};}
      }finally{updating=false;}
    }
  };
}
