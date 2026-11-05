import './env';
function integer(name:string, fallback:number, min:number, max:number) {
  const value=Number(process.env[name]??fallback);
  if(!Number.isInteger(value)||value<min||value>max) throw new Error(`Invalid ${name}`);
  return value;
}
const provider=process.env.AI_PROVIDER||'openai';
export const AI_CONFIG={
  enabled:process.env.AI_ENABLED==='true',
  provider,
  model:process.env.AI_MODEL||'',
  key:(provider==='gemini'?process.env.GEMINI_API_KEY:process.env.OPENAI_API_KEY)?.trim()||'',
  timeoutMs:integer('AI_TIMEOUT_MS',12000,1000,30000),
  maxOutputTokens:integer('AI_MAX_OUTPUT_TOKENS',1200,256,4000),
  dailyRequests:integer('AI_DAILY_REQUESTS_PER_USER',20,1,500),
  dailyTokens:integer('AI_DAILY_TOKEN_BUDGET',100000,1000,10000000),
};
if(process.env.AI_ENABLED&&!['true','false'].includes(process.env.AI_ENABLED)) throw new Error('Invalid AI_ENABLED');
if(!['openai','gemini'].includes(AI_CONFIG.provider)) throw new Error('AI_PROVIDER must be openai or gemini');
export const aiAvailable=()=>AI_CONFIG.enabled&&!!AI_CONFIG.key&&!!AI_CONFIG.model;
