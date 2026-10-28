import {Request,Response,NextFunction} from 'express';
import {AppError} from '../types';
export const errorHandler=(err:any,_req:Request,res:Response,_next:NextFunction)=>{
  if(res.headersSent) return res.end();
  if(err instanceof AppError)return res.status(err.statusCode).json({success:false,error:{code:err.errorCode,message:err.message,details:err.details||[]}});
  const mapped:Record<string,[number,string,string]>={
    '23505':[409,'DUPLICATE_ENTRY','A record with this unique value already exists'],
    '23503':[400,'FOREIGN_KEY_VIOLATION','Referenced resource does not exist or is still in use'],
    '23514':[409,'CONSTRAINT_VIOLATION','Operation violates a business rule'],
    '23P01':[409,'DATES_ALREADY_BOOKED','Accommodation already booked for these dates'],
    '22P02':[400,'VALIDATION_ERROR','Invalid value format'],
    '40001':[409,'RETRY_TRANSACTION','Concurrent update; retry request'],
    '40P01':[409,'RETRY_TRANSACTION','Concurrent update; retry request'],
  };
  if(err.type==='entity.parse.failed')return res.status(400).json({success:false,error:{code:'INVALID_JSON',message:'Invalid JSON body',details:[]}});
  if(err.type==='entity.too.large')return res.status(413).json({success:false,error:{code:'PAYLOAD_TOO_LARGE',message:'Request body too large',details:[]}});
  const known=mapped[err.code];if(known)return res.status(known[0]).json({success:false,error:{code:known[1],message:known[2],details:[]}});
  console.error('[Unhandled backend error]',{name:err.name,code:err.code,message:err.message});
  return res.status(500).json({success:false,error:{code:'INTERNAL_SERVER_ERROR',message:'An unexpected server error occurred',details:[]}});
};
