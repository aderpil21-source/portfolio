'use strict';
// Dedicated Telegram bridge. No tokens or personal Telegram identifiers in source.
const http=require('node:http');
const crypto=require('node:crypto');
const net=require('node:net');
const {URL}=require('node:url');
const PORT=Number(process.env.PORT||3000);
const ORIGIN=(process.env.ALLOWED_ORIGIN||'https://aderpil21-source.github.io').replace(/\/$/,'');
const ALLOWED_ORIGINS=new Set([ORIGIN,'https://aderpil21-source.github.io','https://katsstudio.eu.org']);
for(const value of (process.env.ALLOWED_ORIGINS||'').split(',')){const normalized=value.trim().replace(/\/$/,'');if(/^https:\/\/[^/]+$/.test(normalized))ALLOWED_ORIGINS.add(normalized);}
const STORE_URL=(process.env.PORTFOLIO_STORE_URL||'').trim();
const STORE_KEY=(process.env.PORTFOLIO_STORE_KEY||'').trim();
const storageEnabled=!!(STORE_URL&&STORE_KEY);
const storageRequired=process.env.PORTFOLIO_REQUIRE_STORAGE!=='false';
const TOKEN=(process.env.TELEGRAM_BOT_TOKEN||'').trim();
const OWNER=(process.env.TELEGRAM_CHAT_ID||'').trim();
const PUBLIC_URL=(process.env.PUBLIC_BASE_URL||'https://denis-kats-portfolio-chat.onrender.com').replace(/\/$/,'');
const configured=!!(TOKEN&&/^\d{5,20}$/.test(OWNER));
const webhookSecret=configured?crypto.createHmac('sha256',TOKEN).update('portfolio-chat-webhook-v1').digest('hex'):null;
const CHOICES=new Set(['Таргетированная реклама','Сайты и лендинги','AI-боты и ассистенты','Автоматизация заявок','CRM, API и интеграции','SEO и сопровождение','AI-видео и креативы','Образовательные проекты','Другая задача']);
const sessions=new Map(),telegramMessages=new Map(),ipBuckets=new Map(),invalidPollBuckets=new Map(),saveQueues=new Map();
let storageLoaded=!storageEnabled&&!storageRequired,loading=null;
async function storageCall(action,fields={}){
 if(!storageEnabled)return null;
 const response=await fetch(STORE_URL,{method:'POST',headers:{'content-type':'application/json','x-portfolio-storage-key':STORE_KEY},body:JSON.stringify({action,...fields}),signal:AbortSignal.timeout(13000)});
 if(!response.ok)throw Error('Portfolio storage HTTP '+response.status);
 const body=await response.json();
 if(!body?.ok)throw Error('Portfolio storage rejected '+action);
 return body;
}
async function restoreChats(){
 const data=await storageCall('load');
 const items=Array.isArray(data.sessions)?data.sessions:[];
 for(const record of items){
  if(!record||typeof record.id!=='string'||typeof record.keyHash!=='string'||!Array.isArray(record.messages)||!Array.isArray(record.botMessages)||!Number.isFinite(record.updated))continue;
  if(Date.now()-record.updated>48*3600*1000)continue;
  const s={...record,botMessages:new Set(record.botMessages.filter(Number.isInteger))};
  sessions.set(s.id,s);
  for(const messageId of s.botMessages)telegramMessages.set(messageId,s.id);
 }
 storageLoaded=true;
 console.log('Restored portfolio chats:',sessions.size);
}
async function ensureStorageReady(){
 if(storageLoaded)return true;
 if(!loading)loading=restoreChats().finally(()=>{loading=null});
 try{await loading;return storageLoaded}catch(e){console.error('Portfolio storage unavailable:',e.message);return false}
}
async function saveSession(s){
 if(!storageEnabled){if(storageRequired)throw Error('Persistent storage is required');return}
 // Preserve database write order if visitor and owner update a conversation concurrently.
 const previous=saveQueues.get(s.id)||Promise.resolve();
 const next=previous.catch(()=>{}).then(async()=>{
  const record={...s,messages:s.messages.map(item=>({...item})),botMessages:[...s.botMessages]};
  await storageCall('save',{session:record});
 });
 saveQueues.set(s.id,next);
 try{await next}finally{if(saveQueues.get(s.id)===next)saveQueues.delete(s.id)}
}
const markerColors=['🔵','🟣','🟢','🟠','🟡','🔴','⚪️','🟤'];
const DIRECT_USERNAME='dnk_pr03';
const sessionLife=48*3600*1000;
let globalRate={start:Date.now(),count:0},webhookRegistered=false;
function sendJSON(res,status,data){
 res.writeHead(status,{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store','X-Content-Type-Options':'nosniff','Referrer-Policy':'no-referrer','X-Frame-Options':'DENY','Cross-Origin-Resource-Policy':'cross-origin','Vary':'Origin'});
 res.end(JSON.stringify(data));
}
function allowOrigin(req,res){
 const origin=String(req.headers.origin||'');
 if(!ALLOWED_ORIGINS.has(origin))return false;
 res.setHeader('Access-Control-Allow-Origin',origin);
 res.setHeader('Access-Control-Allow-Methods','POST, OPTIONS');
 res.setHeader('Access-Control-Allow-Headers','Content-Type');
 res.setHeader('Access-Control-Max-Age','600');
 return true;
}
function clean(s,n){return typeof s==='string'?s.replace(/[\u0000-\u001f\u007f]/g,' ').trim().slice(0,n):''}
function clearExpired(){
 const now=Date.now();
 for(const [id,session] of sessions){
  if(now-session.updated>sessionLife){
   for(const mid of session.botMessages)telegramMessages.delete(mid);
   sessions.delete(id);
  }
 }
 for(const [ip,b] of ipBuckets)if(now-b.start>600000)ipBuckets.delete(ip);
 for(const [ip,b] of invalidPollBuckets)if(now-b.start>60000)invalidPollBuckets.delete(ip);
}
function clientAddress(req){
 // Only use the last syntactically valid forwarded address: the first entry may
 // be supplied by an untrusted client before the hosting proxy appends its own.
 const forwarded=String(req.headers['x-forwarded-for']||'').split(',').map(v=>v.trim()).filter(v=>net.isIP(v));
 const address=forwarded.at(-1)||String(req.socket.remoteAddress||'unknown');
 return crypto.createHash('sha256').update(address.slice(0,100)).digest('hex').slice(0,32);
}
function tooMany(req){
 const now=Date.now();
 if(now-globalRate.start>=60000)globalRate={start:now,count:0};
 if(++globalRate.count>40)return true;
 const addr=clientAddress(req);
 const prior=ipBuckets.get(addr),r=prior&&now-prior.start<600000?prior:{start:now,count:0,last:0};
 const soon=now-r.last<4000;r.last=now;r.count++;ipBuckets.set(addr,r);
 return soon||r.count>8;
}
function tooManyInvalidPoll(req){
 const key=clientAddress(req),now=Date.now();
 const prior=invalidPollBuckets.get(key),item=prior&&now-prior.start<60000?prior:{start:now,count:0};
 item.count++;invalidPollBuckets.set(key,item);
 return item.count>40;
}
function readBody(req,max=6500){
 return new Promise((resolve,reject)=>{
  const chunks=[];let bytes=0;let settled=false;
  function bad(){if(!settled){settled=true;reject(new Error('Invalid body'))}}
  req.on('data',chunk=>{bytes+=chunk.length;if(bytes>max){bad();req.destroy();return}chunks.push(chunk)});
  req.on('end',()=>{if(settled)return;settled=true;try{resolve(JSON.parse(Buffer.concat(chunks).toString('utf8')))}catch{reject(new Error('Invalid JSON'))}});
  req.on('error',bad);
 });
}
function timingMatch(a,b){
 const ba=Buffer.from(String(a||'')),bb=Buffer.from(String(b||''));
 return ba.length===bb.length&&crypto.timingSafeEqual(ba,bb);
}
function validSession(d){
 if(!d||typeof d!=='object'||Array.isArray(d))return null;
 const id=clean(d.sessionId,85),key=clean(d.sessionKey,150);
 const s=sessions.get(id);
 if(!s||!timingMatch(crypto.createHash('sha256').update(key).digest('hex'),s.keyHash))return null;
 if(Date.now()-s.updated>sessionLife)return null;
 return s;
}
async function telegram(method,data){
 const r=await fetch('https://api.telegram.org/bot'+TOKEN+'/'+method,{
  method:'POST',headers:{'Content-Type':'application/json'},
  body:JSON.stringify(data),signal:AbortSignal.timeout(11000)
 });
 const result=await r.json().catch(()=>({ok:false}));
 if(!r.ok||result.ok!==true)throw new Error('Telegram request failed');
 return result.result;
}
function clientTag(s){
 // Short code + stable visual marker make simultaneous conversations distinguishable.
 return s.id.slice(0,8).toUpperCase();
}
function markerFor(s){
 const value=Number.parseInt(s.id.slice(0,8),16)>>>0;
 return markerColors[value%markerColors.length];
}
function clientName(s){return s.name||'Посетитель без имени'}
function adminLabel(s){return markerFor(s)+' ЧАТ #'+clientTag(s)+' · '+clientName(s)}
function linkReply(msgId,s){
 if(Number.isInteger(msgId)){s.botMessages.add(msgId);telegramMessages.set(msgId,s.id)}
}
function directDraft(s){
 const short=(value,size)=>clean(value||'',size).replace(/[.!?\s]+$/u,'');
 const first=s.messages.find(m=>m.by==='visitor')?.text||'';
 const latest=s.messages.filter(m=>m.by==='visitor').slice(-1)[0]?.text||'';
 const lastOwner=s.messages.filter(m=>m.by==='owner').slice(-1)[0]?.text||'';
 const who=s.name?'Я '+short(s.name,70):'Я посетитель твоего портфолио';
 const intro='Здравствуйте, Денис! '+who+', мы переписывались на сайте (чат #'+clientTag(s)+').';
 const issue='Меня интересует «'+short(s.category,70)+'»; моя задача: '+short(first,190)+'.';
 let followup='Продолжим общение здесь.';
 if(lastOwner)followup='Последнее обсуждали: '+short(lastOwner,115)+'.';
 else if(latest!==first)followup='Последнее уточнение: '+short(latest,115)+'.';
 const draft=[intro,issue,followup].join('\n');
 return {draft,url:'https://t.me/'+DIRECT_USERNAME+'?text='+encodeURIComponent(draft)};
}
function telegramKeyboard(s){
 return {inline_keyboard:[[{text:'↗ Предложить переход в Telegram',callback_data:'handoff:'+s.id}]]};
}
async function notify(s,body,kind){
 const lines=[adminLabel(s),kind==='new'?'🆕 НОВЫЙ КЛИЕНТ':'✉️ ПРОДОЛЖЕНИЕ ДИАЛОГА',
  'Направление: '+s.category,
  '👤 Имя / компания: '+clientName(s),
  s.contact?'📲 Контакт: '+s.contact:'',
  'Сообщение:',body,
  '━━━━━━━━━━━━━━━━━━',
  '↩️ Нажми «Ответить» на ЭТО сообщение — ответ попадёт только в чат #'+clientTag(s)+'.',
  'Ответы на следующие сообщения этого диалога тоже привязаны к этому клиенту.'];
 const msg=await telegram('sendMessage',{chat_id:OWNER,text:lines.filter(Boolean).join('\n'),disable_web_page_preview:true,reply_markup:telegramKeyboard(s)});
 linkReply(msg.message_id,s);
 return msg;
}
async function registerWebhook(){
 if(!configured)return;
 try{
  await telegram('setWebhook',{url:PUBLIC_URL+'/telegram/webhook',secret_token:webhookSecret,allowed_updates:['message','callback_query'],drop_pending_updates:false});
  webhookRegistered=true;
  console.log('Telegram webhook configured');
 }catch{
  webhookRegistered=false;
  console.error('Telegram webhook registration failed, retrying later');
  setTimeout(registerWebhook,60000).unref();
 }
}
async function webhook(req,res){
 if(!configured){sendJSON(res,503,{ok:false});return}
 if(!timingMatch(req.headers['x-telegram-bot-api-secret-token'],webhookSecret)){sendJSON(res,403,{ok:false});return}
 let update;try{update=await readBody(req,26000)}catch{sendJSON(res,400,{ok:false});return}
 // Inline button: only the account that owns the bot is authorized to issue invitations.
 const callback=update&&update.callback_query;
 if(callback){
  const isOwner=String(callback.from?.id)===OWNER&&String(callback.message?.chat?.id)===OWNER;
  const match=typeof callback.data==='string'?/^handoff:([0-9a-f-]{36})$/.exec(callback.data):null;
  const s=isOwner&&match?sessions.get(match[1]):null;
  let response='Эта беседа больше не активна.';
  if(s&&Date.now()-s.updated<sessionLife){
   if(s.handoffSeq===s.seq){
    response='Приглашение уже отправлено. Клиент видит кнопку на сайте.';
   }else{
    const prepared=directDraft(s);
    s.seq++;
    s.messages.push({seq:s.seq,by:'system',kind:'telegram_invite',text:'Денис предлагает продолжить переписку в личном Telegram.',url:prepared.url,draft:prepared.draft,at:Date.now()});
    if(s.messages.length>50)s.messages.shift();
    s.updated=Date.now();s.handoffSeq=s.seq;
    try{await saveSession(s);response='✓ Приглашение отправлено клиенту в чат #'+clientTag(s)+'.';}
    catch(e){console.error('Invite persistence failed',e.message);response='Ошибка сохранения приглашения. Повторите позже.';}
   }
  }
  try{await telegram('answerCallbackQuery',{callback_query_id:callback.id,text:response,show_alert:false,cache_time:0})}catch{}
  sendJSON(res,200,{ok:true});return;
 }
 const message=update&&update.message;
 if(message&&String(message.chat?.id)===OWNER&&String(message.from?.id)===OWNER){
  const replyTo=message.reply_to_message?.message_id,sessionId=telegramMessages.get(replyTo);
  const s=sessionId&&sessions.get(sessionId);
  const text=clean(message.text||message.caption,2200);
  if(s&&text&&Date.now()-s.updated<sessionLife){
   if(s.botMessages.has(message.message_id)){sendJSON(res,200,{ok:true,duplicate:true});return}
   s.seq++;
   s.messages.push({seq:s.seq,by:'owner',text,at:Date.now()});
   if(s.messages.length>50)s.messages.shift();
   s.updated=Date.now();
   // Accept a reply to ANY message in the same dialogue: visitor notices,
   // the owner's own prior replies, and these confirmation messages.
   linkReply(message.message_id,s);
   try{await saveSession(s)}catch(e){console.error('Owner reply persistence failed',e.message);sendJSON(res,503,{ok:false});return}
   try{
    const ack=await telegram('sendMessage',{
     chat_id:OWNER,
     text:markerFor(s)+' ✓ Ответ доставлен в '+clientName(s)+' · чат #'+clientTag(s)+'.\n↩️ Можешь ответить и на это подтверждение, чтобы продолжить тот же разговор.',
     reply_parameters:{message_id:message.message_id},
     reply_markup:telegramKeyboard(s)
    });
    linkReply(ack.message_id,s);
    await saveSession(s);
   }catch{
    // Reply is already saved; failed acknowledgement remains non-fatal.
   }
  }else if(message.reply_to_message&&text){
   // Never silently redirect to another visitor if the referenced session expired.
   try{await telegram('sendMessage',{chat_id:OWNER,text:'⚠️ Не удалось найти этот диалог — возможно, сервис перезапускался или сессия истекла. Ответ не отправлен никому. Попроси клиента написать снова.'})}catch{}
  }
 }
 sendJSON(res,200,{ok:true});
}
async function handle(req,res){
 let path;
 try{path=new URL(req.url,'http://localhost').pathname}catch{sendJSON(res,400,{ok:false});return}
 if(path==='/health'&&(req.method==='GET'||req.method==='HEAD')){
  if(storageEnabled&&!storageLoaded)await ensureStorageReady();
  const healthy=configured&&webhookRegistered&&storageLoaded&&(!storageRequired||storageEnabled);
  sendJSON(res,healthy?200:503,{ok:healthy,configured,webhookReady:webhookRegistered,persistenceConfigured:storageEnabled,persistenceReady:storageLoaded});
  return;
 }
 if((storageRequired&&!storageEnabled)||(storageEnabled&&!(await ensureStorageReady()))){sendJSON(res,503,{ok:false,error:'Хранилище временно недоступно'});return}
 if(path==='/telegram/webhook'&&req.method==='POST'){await webhook(req,res);return}
 if(!path.startsWith('/api/chat/')){sendJSON(res,404,{ok:false,error:'Не найдено'});return}
 if(!allowOrigin(req,res)){sendJSON(res,403,{ok:false,error:'Недопустимый источник'});return}
 if(req.method==='OPTIONS'){res.writeHead(204);res.end();return}
 if(req.method!=='POST'){sendJSON(res,405,{ok:false,error:'Недопустимый метод'});return}
 if(!String(req.headers['content-type']||'').startsWith('application/json')){
  sendJSON(res,415,{ok:false,error:'Ожидается JSON'});return;
 }
 if(!configured){sendJSON(res,503,{ok:false,error:'Бот ещё подключается. Напишите Денису напрямую в Telegram.'});return}
 if(Number(req.headers['content-length']||0)>6500){sendJSON(res,413,{ok:false,error:'Слишком длинный запрос'});return}
 let data;
 try{data=await readBody(req)}catch{if(!res.writableEnded)sendJSON(res,400,{ok:false,error:'Не удалось прочитать сообщение'});return}
 if(path==='/api/chat/start'){
  if(tooMany(req)){sendJSON(res,429,{ok:false,error:'Слишком много обращений. Попробуйте позже.'});return}
  if(clean(data.website,140)){sendJSON(res,200,{ok:true,ignored:true});return}
  const category=clean(data.category,100),message=clean(data.message,1600),name=clean(data.name,120),contact=clean(data.contact,160);
  if(!CHOICES.has(category)||message.length<12||message.length>1500||data.consent!==true){
   sendJSON(res,400,{ok:false,error:'Выберите направление, опишите задачу и подтвердите согласие.'});return;
  }
  clearExpired();
  if(sessions.size>=550){sendJSON(res,503,{ok:false,error:'Приём сообщений временно ограничен. Используйте Telegram.'});return}
  const id=crypto.randomUUID(),secret=crypto.randomBytes(24).toString('hex');
  const s={id,keyHash:crypto.createHash('sha256').update(secret).digest('hex'),name,contact,category,messages:[{seq:1,by:'visitor',text:message,at:Date.now()}],seq:1,updated:Date.now(),botMessages:new Set()};
  // Never acknowledge successful delivery before Telegram confirms it.
  try{await notify(s,message,'new')}catch{
   sendJSON(res,502,{ok:false,error:'Telegram не принял сообщение. Попробуйте ещё раз или перейдите в личный чат.'});return;
  }
  sessions.set(id,s);
  try{await saveSession(s)}catch(e){console.error('New chat persistence failed',e.message);sendJSON(res,503,{ok:false,error:'Не удалось сохранить диалог. Попробуйте позже.'});return}
  sendJSON(res,200,{ok:true,sessionId:id,sessionKey:secret,expiresInHours:48});
  return;
 }
 if(path==='/api/chat/poll'){
  const s=validSession(data);
  if(!s){if(tooManyInvalidPoll(req)){sendJSON(res,429,{ok:false,error:'Слишком много запросов.'});return}sendJSON(res,404,{ok:false,error:'Переписка недоступна. Начните новую или напишите в Telegram.'});return}
  const after=Math.max(0,Math.min(1000000,Number(data.after)||0));
  sendJSON(res,200,{ok:true,messages:s.messages.filter(m=>m.seq>after),lastSeq:s.seq});
  return;
 }
 if(path==='/api/chat/message'){
  if(tooMany(req)){sendJSON(res,429,{ok:false,error:'Пожалуйста, отправляйте сообщения реже.'});return}
  const s=validSession(data),text=clean(data.text,1500);
  if(!s||!text||text.length<2){sendJSON(res,400,{ok:false,error:'Нет активного чата или текста сообщения.'});return}
  if(s.messages.filter(m=>m.by==='visitor').length>=20){sendJSON(res,429,{ok:false,error:'Достигнут лимит сообщений. Продолжите переписку в Telegram.'});return}
  try{await notify(s,text,'followup')}catch{sendJSON(res,502,{ok:false,error:'Сообщение не доставлено. Попробуйте снова.'});return}
  s.seq++;s.updated=Date.now();
  s.messages.push({seq:s.seq,by:'visitor',text,at:Date.now()});
  if(s.messages.length>50)s.messages.shift();
  try{await saveSession(s)}catch(e){console.error('Visitor message persistence failed',e.message);sendJSON(res,503,{ok:false,error:'Сообщение не удалось сохранить. Попробуйте позже.'});return}
  sendJSON(res,200,{ok:true,seq:s.seq});
  return;
 }
 sendJSON(res,404,{ok:false,error:'Неизвестный метод'});
}
const server=http.createServer((req,res)=>{handle(req,res).catch(()=>{if(!res.headersSent)sendJSON(res,500,{ok:false,error:'Внутренняя ошибка'});else res.end()})});
server.requestTimeout=20000;
server.listen(PORT,'0.0.0.0',()=>console.log('Portfolio chat API listening on '+PORT));
ensureStorageReady().catch(()=>{});
if(configured)registerWebhook();
setInterval(clearExpired,600000).unref();
