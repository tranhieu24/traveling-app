import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { optionalAuth } from '../middlewares/auth.middleware';
import { validate } from '../middlewares/validate.middleware';
import { aiSearchRequest,aiHelpRequest,aiChatRequest } from '../domain/ai';
import { aiChatService } from '../services/aiChat.service';
import { aiService } from '../services/ai.service';
import { AuthenticatedRequest,sendSuccess } from '../types';

const router=Router();
const limited={success:false,error:{code:'AI_RATE_LIMIT',message:'Bạn gửi quá nhanh. Hãy đợi một phút hoặc tiếp tục thủ công.',details:[]}};
router.use(rateLimit({windowMs:60000,max:10,standardHeaders:true,legacyHeaders:false,message:limited}));
router.use(optionalAuth);
router.use(rateLimit({windowMs:60000,max:6,standardHeaders:true,legacyHeaders:false,keyGenerator:(req:AuthenticatedRequest)=>req.user?.id||req.ip||'unknown',message:limited}));
router.use((_req,res,next)=>{res.setHeader('Cache-Control','private, no-store');next();});
router.post('/chat',validate(aiChatRequest),async(req:AuthenticatedRequest,res,next)=>{
  try {return sendSuccess(res,await aiChatService.reply(req.body.message,req.user?'user:'+req.user.id:'ip:'+req.ip,req.user?.id,req.body.listingId,req.body.searchContext,req.body.timeZone));}catch(error){next(error);}
});
router.post('/search',validate(aiSearchRequest),async(req:AuthenticatedRequest,res,next)=>{
  try {return sendSuccess(res,await aiService.search(req.body.message,req.body.timeZone,req.user?'user:'+req.user.id:'ip:'+req.ip,req.user?.id));}catch(error){next(error);}
});
router.post('/help',validate(aiHelpRequest),async(req:AuthenticatedRequest,res,next)=>{
  try {return sendSuccess(res,await aiService.help(req.body.message,req.user?'user:'+req.user.id:'ip:'+req.ip,req.user?.id,req.body.bookingId));}catch(error){next(error);}
});
export default router;
