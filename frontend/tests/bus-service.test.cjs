const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const {stripTypeScriptTypes}=require('node:module');
const source=fs.readFileSync(path.join(__dirname,'../services/bus.service.ts'),'utf8');
function client(fetch){
 const code=stripTypeScriptTypes(source).replace(/import .*?;\s*/, 'const API_BASE_URL="https://example.test";\n').replace(/export /g,'');
 const context=vm.createContext({fetch});vm.runInContext(code,context);return context;
}
test('normal arrivals retain server values',async()=>{
 const data={arrivals:[{arrivalSec:600,remainingStops:5}]};
 assert.equal(await client(async()=>({ok:true,json:async()=>data})).getBusArrivals('s'),data);
});
test('successful empty list remains an empty result',async()=>{
 const data={arrivals:[]};
 assert.equal((await client(async()=>({ok:true,json:async()=>data})).getBusArrivals('s')).arrivals.length,0);
});
test('502 rejects instead of returning empty arrivals',async()=>{
 await assert.rejects(client(async()=>({ok:false,status:502})).getBusArrivals('s'),/도착 정보 조회 실패/);
});
test('network failure also rejects',async()=>{
 await assert.rejects(client(async()=>{throw new Error('network unavailable')}).getBusArrivals('s'),/network unavailable/);
});
