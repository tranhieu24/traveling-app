const {spawnSync}=require('node:child_process');
const fs=require('node:fs');
const started=Date.now();
const result=spawnSync(process.execPath,['--import','tsx','test/integration.ts'],{stdio:'inherit',windowsHide:true});
try {
 const evidence=JSON.parse(fs.readFileSync('../docs/test-results.json','utf8'));
 if(result.error || result.status!==0 || Date.parse(evidence.startedAt)<started-1000 || evidence.failed!==0 || evidence.passed<29) process.exitCode=1;
} catch(e) { console.error('Missing fresh test evidence',e.message);process.exitCode=1; }
