// Optional development check. Set PLAYWRIGHT_PATH if Playwright is not in node_modules.
const http=require('node:http'),fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const {chromium}=require(process.env.PLAYWRIGHT_PATH||'playwright');
const root=path.resolve(__dirname,'..'),out=process.env.FORM_SCREENSHOTS||require('node:os').tmpdir();
const types={'.html':'text/html','.js':'text/javascript','.css':'text/css','.svg':'image/svg+xml','.webmanifest':'application/manifest+json','.png':'image/png'};
const server=http.createServer((req,res)=>{const u=new URL(req.url,'http://localhost'),file=path.resolve(root,'.'+(u.pathname==='/'?'/index.html':u.pathname));if(!file.startsWith(root+path.sep)){res.writeHead(403).end();return;}fs.readFile(file,(e,b)=>{if(e){res.writeHead(404).end();return;}res.writeHead(200,{'content-type':types[path.extname(file)]||'application/octet-stream'}).end(b);});});
(async()=>{
 await new Promise(r=>server.listen(0,'127.0.0.1',r));
 const browser=await chromium.launch({headless:true,...(process.env.CHROME_PATH?{executablePath:process.env.CHROME_PATH}:{})});
 try{
 const context=await browser.newContext({viewport:{width:390,height:844},serviceWorkers:'block'});
 await context.addInitScript(()=>{
   class Speech {start(){window.recognition=this;queueMicrotask(()=>this.onstart?.());}stop(){this.onend?.();}abort(){window.micAborted=true;}result(text){const item=[{transcript:text}];item.isFinal=true;this.onresult?.({results:[item]});this.onend?.();}}
   window.SpeechRecognition=Speech;
 });
 const page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));
 const base=`http://127.0.0.1:${server.address().port}`;
 await page.goto(base);await page.locator('.lead-card').waitFor();await page.evaluate(()=>document.fonts.ready);
 const read=()=>page.evaluate(async()=>{const {state}=await import('/js/store.js');return JSON.parse(JSON.stringify({active:state.active,history:state.history,routines:state.routines}));});
 const type=async(text,wait=1750)=>{await page.locator('.dock [data-action=voice]').count();await page.evaluate(()=>document.querySelector('[data-action=type]')?.click());if(await page.locator('#voice-panel').isHidden()){await page.locator('.dock [data-action=voice]').click();}await page.locator('#command-input').fill(text);await page.locator('#voice-form').evaluate(f=>f.requestSubmit());await page.waitForTimeout(wait);};
 for(const width of [360,390,1440]){await page.setViewportSize({width,height:width>1000?1050:844});await page.waitForTimeout(750);assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),`overflow at ${width}`);await page.screenshot({path:path.join(out,`form-home-${width}.png`),fullPage:true});}
 await page.setViewportSize({width:390,height:844});
 await page.locator('.lead-card [data-action=start]').click();
 await page.evaluate(async()=>{const s=await import('/js/store.js');s.setSettings({spoken:'off',autoAdvance:false});});
 await type('80 kilos for 8');assert.equal((await read()).active.exercises[0].sets.filter(s=>s.done).length,1);
 await type('same again');assert.equal((await read()).active.exercises[0].sets.filter(s=>s.done).length,2);
 await type('add 2.5');assert.equal((await read()).active.exercises[0].sets[1].kg,82.5);
 await type('one more rep');assert.equal((await read()).active.exercises[0].sets[1].reps,9);
 await type('undo');assert.equal((await read()).active.exercises[0].sets[1].reps,8);
 await type('90 kilos for 9',0);await page.locator('[data-action=voice-close]').first().click();await page.waitForTimeout(1700);assert.equal((await read()).active.exercises[0].sets.filter(s=>s.done).length,2);
 await page.locator('[data-action=edit-set]').first().click();await page.locator('#edit-set [name=reps]').fill('10');await page.locator('#edit-set button[type=submit]').click();assert.equal((await read()).active.exercises[0].sets[0].reps,10);
 await type('next exercise');assert.equal((await read()).active.current,1);
 await type('skip rest');assert.equal((await read()).active.rest,null);
 await type('start rest for 90 seconds');assert.ok((await read()).active.rest.endsAt>Date.now());
 await type('how much rest is left?',100);assert.ok(await page.locator('#voice-text').innerText());
 await page.locator('[data-action=voice-close]').first().click();
 await page.locator('.dock [data-action=voice]').click();await page.waitForFunction(()=>window.recognition);assert.equal(await page.locator('#voice-panel').getAttribute('data-phase'),'recording');
 await page.evaluate(()=>window.recognition.result('30 kilos for 10'));await page.waitForTimeout(1750);assert.equal((await read()).active.exercises[1].sets.filter(s=>s.done).length,1);
 await page.locator('[data-action=voice-close]').first().click();await page.locator('.dock [data-action=voice]').click();
 await page.evaluate(()=>window.recognition.onerror({error:'not-allowed'}));await page.waitForTimeout(50);assert.match(await page.locator('#voice-text').innerText(),/blocked/);
 await page.locator('[data-action=voice-close]').first().click();
 await page.reload();await page.locator('#kg').waitFor();assert.equal((await read()).active.exercises[1].sets.filter(s=>s.done).length,1);
 // AI responses are mocked. A late response cannot overwrite an edited workout.
 await page.evaluate(async()=>{(await import('/js/keys.js')).setKey('google','test-only');});
 let release,arrived;const gate=new Promise(r=>release=r),request=new Promise(r=>arrived=r);
 await page.route('https://generativelanguage.googleapis.com/**',async route=>{
   if(!route.request().url().includes(':generateContent'))return route.fulfill({json:{models:[{name:'models/gemini-2.5-flash',supportedGenerationMethods:['generateContent']},{name:'models/gemini-2.5-flash-lite',supportedGenerationMethods:['generateContent']}]}});
   arrived();await gate;try{await route.fulfill({json:{candidates:[{content:{parts:[{text:JSON.stringify({type:'LogSet',exerciseId:'overhead-press',kg:35,reps:8})}]}}]}});}catch{}
 });
 await type('abracadabra training command',0);await request;
 await page.evaluate(async()=>{const s=await import('/js/store.js'),w=await import('/js/workout.js');s.update(x=>w.editLastDone(x,1,{kg:32.5,reps:10}));await s.flush();});release();await page.waitForTimeout(1800);
 assert.equal((await read()).active.exercises[1].sets.filter(s=>s.done).length,1);
 assert.equal(await page.locator('[data-action=confirm-command]').innerText(),'Confirm');
 await page.locator('[data-action=voice-close]').first().click();
 await page.evaluate(async()=>{(await import('/js/keys.js')).setKey('google','');});
 // Backgrounding closes the capture and ignores a late recognition callback.
 await page.locator('.dock [data-action=voice]').click();await page.evaluate(()=>{window.lateResult=window.recognition.onresult;Object.defineProperty(document,'hidden',{configurable:true,value:true});document.dispatchEvent(new Event('visibilitychange'));});
 assert.equal(await page.locator('#voice-panel').isHidden(),true);assert.equal(await page.evaluate(()=>window.micAborted),true);
 await page.evaluate(()=>{delete document.hidden;document.dispatchEvent(new Event('visibilitychange'));const item=[{transcript:'40 kilos for 9'}];item.isFinal=true;window.lateResult({results:[item]});});await page.waitForTimeout(1700);
 assert.equal((await read()).active.exercises[1].sets.filter(s=>s.done).length,1);
 await page.waitForTimeout(750);await page.screenshot({path:path.join(out,'form-workout-390.png'),fullPage:true});
 await page.locator('[data-action=finish]').click();await page.waitForTimeout(1800);assert.ok((await read()).active,'finish must not auto commit');
 await page.locator('.dock [data-action=voice]').click();await page.evaluate(()=>window.recognition.result('confirm'));await page.waitForTimeout(300);assert.equal((await read()).history.length,1);assert.equal((await read()).active,null);
 await page.locator('[data-action=close]').click();await page.locator('.dock [data-action=routines]').click();await page.locator('[data-action=new-routine]').click();await page.locator('#routine-name').fill('Test upper');await page.locator('[data-action=routine-add]').click();await page.locator('#exercise-search').fill('bench press');await page.locator('[data-pick=bench-press]').click();await page.locator('[data-action=routine-save]').click();assert.ok((await read()).routines.some(r=>r.name==='Test upper'));
 // An IndexedDB write failure remains visible and recoverable.
 await page.locator('.routine-card [data-action=start]').first().click();await page.evaluate(()=>{window.realPut=IDBObjectStore.prototype.put;IDBObjectStore.prototype.put=function(v,k){if(k==='activeWorkout')throw new DOMException('test','QuotaExceededError');return window.realPut.call(this,v,k);};});
 await page.locator('[data-action=log]').click();await page.locator('#save-warning').waitFor({state:'visible'});await page.evaluate(()=>{IDBObjectStore.prototype.put=window.realPut;});await page.locator('[data-action=retry-save]').click();await page.locator('#save-warning').waitFor({state:'hidden'});
 // Saved data survives a fresh document, including timer timestamps.
 const before=(await read()).active;await page.reload();await page.locator('#kg').waitFor();assert.deepEqual((await read()).active,before);
 if(process.env.FORM_PRIVATE_PROFILE){
   await page.locator('.dock [data-action=settings]').click();await page.locator('#personal-file').setInputFiles(process.env.FORM_PRIVATE_PROFILE);await page.locator('[data-action=personal-confirm-import]').click();await page.waitForTimeout(200);
   const saved=await read();assert.ok(saved.routines.some(r=>r.id==='personal-sunday-back'&&r.days[0]===0));assert.equal(saved.history.length,1);assert.deepEqual(saved.active,before);
   await page.evaluate(async()=>{await(await import('/js/store.js')).discard();});await page.locator('.dock [data-action=routines]').click();await page.locator('[data-action=start][data-id=personal-monday-legs]').click();
   assert.equal(await page.locator('#kg').inputValue(),'70');assert.equal(await page.locator('#reps').inputValue(),'');assert.match(await page.locator('label[for=kg]').innerText(),/ADDED/);
   await page.locator('[data-action=log]').click();assert.equal((await read()).active.exercises[0].sets.filter(s=>s.done).length,0,'missing reps cannot be invented');
   await page.locator('.dock [data-action=journal]').click();await page.locator('[data-action=personal-checkin]').click();await page.locator('[name=weightKg]').fill('90');await page.locator('[name=kcal]').fill('2300');await page.locator('[name=sleep]').fill('7');await page.locator('[name=wrestlingMinutes]').fill('60');await page.locator('#personal-checkin [type=submit]').click();
   await page.waitForTimeout(200);assert.match(await page.locator('.recovery-card').innerText(),/90.0/);
   const ctx=await page.evaluate(async()=>{const p=await import('/form/personal.js'),s=await import('/js/store.js');return p.personalContext(s.state.bodyweight);});assert.match(ctx,/wrestlingMinutes":60/);assert.match(ctx,/Do not invent calorie/);
 }
 assert.deepEqual(errors,[]);
 await context.close();
 // Real SW, no providers: shell and workout remain available offline.
 const offline=await browser.newContext();const p=await offline.newPage();await p.goto(base);await p.evaluate(()=>navigator.serviceWorker.ready);await p.waitForFunction(()=>navigator.serviceWorker.controller);await p.locator('.lead-card [data-action=start]').click();await p.locator('[data-action=log]').click();await p.waitForTimeout(100);await offline.setOffline(true);await p.reload();await p.locator('#kg').waitFor();assert.equal(await p.locator('.set-row:not(.planned)').count(),1);await offline.close();
 console.log('PASS: layouts, voice pipeline, corrections, cancellation, mocked microphone, permission error, voice finish confirmation, routine creation, failed save/retry, reload and offline persistence.');
 }finally{await browser.close();server.close();}
})().catch(e=>{console.error(e);process.exitCode=1;server.close();});
