import { z } from 'zod';
import { zodToJsonSchema } from 'zod-to-json-schema';
import { AI_CONFIG, aiAvailable } from '../config/ai';

export class AiUnavailable extends Error {
  constructor(public reason:'disabled'|'quota'|'provider_error'|'invalid_output') {super(reason);}
}
export interface AiProvider {
  complete<T>(instructions:string,input:unknown,schema:z.ZodType<T>):Promise<{value:T;inputTokens:number;outputTokens:number}>;
}
export class OpenAiProvider implements AiProvider {
  constructor(private config=AI_CONFIG,private request:typeof fetch=fetch) {}
  async complete<T>(instructions:string,input:unknown,schema:z.ZodType<T>) {
    const controller=new AbortController(), timer=setTimeout(()=>controller.abort(),this.config.timeoutMs);
    try {
      const jsonSchema=zodToJsonSchema(schema as any,{$refStrategy:'none'}) as Record<string,unknown>;
      delete jsonSchema.$schema;
      const response=await this.request('https://api.openai.com/v1/responses',{
        method:'POST',signal:controller.signal,
        headers:{Authorization:'Bearer '+this.config.key,'Content-Type':'application/json'},
        body:JSON.stringify({model:this.config.model,store:false,instructions,input:JSON.stringify(input),
          max_output_tokens:this.config.maxOutputTokens,text:{format:{type:'json_schema',name:'traveling_result',strict:true,schema:jsonSchema}}}),
      });
      if(!response.ok)throw new AiUnavailable('provider_error');
      const reader=response.body?.getReader();if(!reader)throw new AiUnavailable('provider_error');
      let bytes=0,raw='';const decoder=new TextDecoder();
      try {while(true){const {done,value}=await reader.read();if(done)break;bytes+=value.byteLength;if(bytes>65536)throw new AiUnavailable('invalid_output');raw+=decoder.decode(value,{stream:true});}}finally{await reader.cancel();}
      const body=JSON.parse(raw+decoder.decode());
      if(body.status!=='completed')throw new AiUnavailable('invalid_output');
      const content=(body.output||[]).filter((item:any)=>item.type==='message').flatMap((item:any)=>item.content||[]);
      if(content.some((part:any)=>part.type==='refusal'))throw new AiUnavailable('invalid_output');
      const text=content.filter((part:any)=>part.type==='output_text').map((part:any)=>part.text).join('');
      return {value:schema.parse(JSON.parse(text)),inputTokens:Number(body.usage?.input_tokens)||0,outputTokens:Number(body.usage?.output_tokens)||0};
    } catch(error) {throw error instanceof AiUnavailable?error:new AiUnavailable('provider_error');}
    finally {clearTimeout(timer);}
  }
}
export { aiAvailable };
