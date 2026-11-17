'use strict';
// Stage 8 audit probe. Read-only: loads the engine from index.html and reports numbers. It changes nothing.
// Run: node tests/tools/stage8-audit-ui.js
const path = require('path');
const ROOT = path.join(__dirname, '..', '..');
const {chromium}=require('playwright');
(async()=>{const b=await chromium.launch();
const full=(o)=>Object.assign({pname:'X',preset:'p308',cname:'',model:'G1',bc:'0.462',wt:'168',diam:'0.308',v0:'2650',v0src:'user',vref:'59',vsens:'0',zero:'100',h:'1.5',twist:'10',tdir:'R',click:'MOA:0.25',temp:'59',press:'',humidity:'50',alt:'0',lat:''},o);
const open=async(seed)=>{const p=await b.newPage();await p.addInitScript(d=>{if(!sessionStorage.g){localStorage.setItem('scopedope.v2',d);sessionStorage.g=1}},JSON.stringify(seed));await p.goto('file://' + path.join(ROOT, 'index.html'));await p.waitForTimeout(300);return p};
// P1 stale carry-over: second person's profile lacks 'twist' and 'h'
const a=full({pname:'A',twist:'7',h:'2.2'}); const c=full({pname:'B'}); delete c.twist; delete c.h;
let p=await open({schema:1,pi:0,people:[{name:'One',active:0,profiles:[a]},{name:'Two',active:0,profiles:[c]}],session:{}});
await p.evaluate(()=>{location.hash='#rifle'});await p.waitForTimeout(150);await p.selectOption('#person','1');await p.waitForTimeout(200);
console.log('P1 after switching to a profile lacking twist/h: twist=',await p.inputValue('#twist'),'h=',await p.inputValue('#h'),'(profile A had 7 and 2.2)');
// P9 pressure limit vs altitude
p=await open({schema:1,pi:0,people:[{name:'One',active:0,profiles:[full({alt:'15000',press:'16.9'})]}],session:{}});
console.log('P9 alt 15000 ft with station pressure 16.9 inHg ->', (await p.textContent('#notice')).slice(0,200));
// E10 unreachable zero from UI
p=await open({schema:1,pi:0,people:[{name:'One',active:0,profiles:[full({v0:'500',bc:'0.05',zero:'1000'})]}],session:{dist:'500'}});
console.log('E10 UI notice:', JSON.stringify(await p.textContent('#notice')), 'elev:', await p.textContent('#elevClicks'), await p.textContent('#elevDir'));
await b.close()})();
