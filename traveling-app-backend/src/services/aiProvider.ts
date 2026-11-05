import { z } from 'zod';
import { zodToJsonSchema } from 'zod-to-json-schema';
import { AI_CONFIG, aiAvailable } from '../config/ai';

export class AiUnavailable extends Error {
  constructor(public reason:'disabled'|'quota'|'provider_error'|'invalid_output') {super(reason);}
}
export interface AiProvider {
  complete<T>(instructions:string,input:unknown,schema:z.ZodType<T>):Promise<{value:T;inputTokens:number;outputTokens:number}>;
}

async function readProviderJson(response:Response) {
  if(!response.ok)throw new AiUnavailable('provider_error');
  const reader=response.body?.getReader();
  if(!reader)throw new AiUnavailable('provider_error');
  let bytes=0,raw='';const decoder=new TextDecoder();
  try {
    while(true){
      const {done,value}=await reader.read();if(done)break;
      bytes+=value.byteLength;
      if(bytes>65536)throw new AiUnavailable('invalid_output');
      raw+=decoder.decode(value,{stream:true});
    }
  }finally{await reader.cancel();}
  try{return JSON.parse(raw+decoder.decode());}
  catch{throw new AiUnavailable('invalid_output');}
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
      const body=await readProviderJson(response);
      if(body.status!=='completed')throw new AiUnavailable('invalid_output');
      const content=(body.output||[]).filter((item:any)=>item.type==='message').flatMap((item:any)=>item.content||[]);
      if(content.some((part:any)=>part.type==='refusal'))throw new AiUnavailable('invalid_output');
      const text=content.filter((part:any)=>part.type==='output_text').map((part:any)=>part.text).join('');
      return {value:schema.parse(JSON.parse(text)),inputTokens:Number(body.usage?.input_tokens)||0,outputTokens:Number(body.usage?.output_tokens)||0};
    } catch(error) {throw error instanceof AiUnavailable?error:new AiUnavailable('provider_error');}
    finally {clearTimeout(timer);}
  }
}

export class GeminiProvider implements AiProvider {
  constructor(private config=AI_CONFIG,private request:typeof fetch=fetch) {}
  async complete<T>(instructions:string,input:unknown,schema:z.ZodType<T>) {
    if(!/^gemini-[a-zA-Z0-9._-]+$/.test(this.config.model))throw new AiUnavailable('provider_error');
    const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),this.config.timeoutMs);
    try {
      const jsonSchema=zodToJsonSchema(schema as any,{$refStrategy:'none'}) as Record<string,unknown>;
      delete jsonSchema.$schema;
      // These extraction tasks do not need a large thinking budget. Version 2.5
      // uses token budgets; Flash 3 uses thinking levels instead.
      const thinkingConfig=this.config.model.startsWith('gemini-2.5-flash')
        ?{thinkingBudget:0}
        :/^gemini-3(?:\.|-).*flash/.test(this.config.model)?{thinkingLevel:'minimal'}:undefined;
      const response=await this.request(
        `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(this.config.model)}:generateContent`,
        {
          method:'POST',signal:controller.signal,
          headers:{'x-goog-api-key':this.config.key,'Content-Type':'application/json'},
          body:JSON.stringify({
            systemInstruction:{parts:[{text:instructions}]},
            contents:[{role:'user',parts:[{text:JSON.stringify(input)}]}],
            generationConfig:{responseMimeType:'application/json',responseJsonSchema:jsonSchema,
              maxOutputTokens:this.config.maxOutputTokens,...(thinkingConfig?{thinkingConfig}:{})},
          }),
        }
      );
      const body=await readProviderJson(response);
      if(body.promptFeedback?.blockReason&&body.promptFeedback.blockReason!=='BLOCK_REASON_UNSPECIFIED')throw new AiUnavailable('invalid_output');
      if(!Array.isArray(body.candidates)||body.candidates.length!==1)throw new AiUnavailable('invalid_output');
      const candidate=body.candidates[0];
      if(candidate.finishReason!=='STOP'||!Array.isArray(candidate.content?.parts))throw new AiUnavailable('invalid_output');
      const parts=candidate.content.parts;
      if(parts.some((part:any)=>!part.thought&&typeof part.text!=='string'))throw new AiUnavailable('invalid_output');
      const text=parts.filter((part:any)=>!part.thought).map((part:any)=>part.text).join('');
      let value:T;
      try{value=schema.parse(JSON.parse(text));}catch{throw new AiUnavailable('invalid_output');}
      const tokens=(count:unknown)=>typeof count==='number'&&Number.isSafeInteger(count)&&count>=0?count:0;
      return {value,inputTokens:tokens(body.usageMetadata?.promptTokenCount),
        outputTokens:tokens(body.usageMetadata?.candidatesTokenCount)+tokens(body.usageMetadata?.thoughtsTokenCount)};
    }catch(error){throw error instanceof AiUnavailable?error:new AiUnavailable('provider_error');}
    finally{clearTimeout(timer);}
  }
}

export function createAiProvider(config=AI_CONFIG,request:typeof fetch=fetch):AiProvider {
  return config.provider==='gemini'?new GeminiProvider(config,request):new OpenAiProvider(config,request);
}
export { aiAvailable };
