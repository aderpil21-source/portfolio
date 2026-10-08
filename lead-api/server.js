'use strict';
// Dedicated Telegram bridge. No tokens or personal Telegram identifiers in source.
const http=require('node:http');
const crypto=require('node:crypto');
const {URL}=require('node:url');
const PORT=Number(process.env.PORT||3000);
const ORIGIN=(process.env.ALLOWED_ORIGIN||'https://aderpil21-source.github.io').replace(/\/$/,'');
const TOKEN=(process.env.TELEGRAM_BOT_TOKEN||'').trim();
const OWNER=(process.env.TELEGRAM_CHAT_ID||'').trim();
const PUBLIC_URL=(process.env.PUBLIC_BASE_URL||'https://denis-kats-portfolio-chat.onrender.com').replace(/\/$/,'');
const configured=!!(TOKEN&&/^\d{5,20}$/.test(OWNER));
const webhookSecret=configured?crypto.createHmac('sha256',TOKEN).update('portfolio-chat-webhook-v1').digest('hex'):null;
const CHOICES=new Set(['Таргетированная реклама','Сайты и лендинги','AI-боты и ассистенты','Автоматизация заявок','CRM, API и интеграции','SEO и сопровождение','AI-видео и креативы','Образовательные проекты','Другая задача']);
const sessions=new Map(),telegramMessages=new Map(),ipBuckets=new Map();
const sessionLife=48*3600*1000;
let globalRate={start:Date.now(),count:0},webhookRegistered=false;
function sendJSON(res,status,data){
 res.writeHead(status,{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store','X-Content-Type-Options':'nosniff','Vary':'Origin'});
 res.end(JSON.stringify(data));
}
function allowOrigin(req,res){
 const origin=String(req.headers.origin||'');
 if(origin!==ORIGIN)return false;
 res.setHeader('Access-Control-Allow-Origin',ORIGIN);
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
}
function tooMany(req){
 const now=Date.now();
 if(now-globalRate.start>=60000)globalRate={start:now,count:0};
 if(++globalRate.count>40)return true;
 const addr=String(req.headers['x-forwarded-for']||req.socket.remoteAddress||'').split(',')[0].slice(0,100);
 const prior=ipBuckets.get(addr),r=prior&&now-prior.start<600000?prior:{start:now,count:0,last:0};
 const soon=now-r.last<4000;r.last=now;r.count++;ipBuckets.set(addr,r);
 return soon||r.count>8;
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
function adminLabel(s){return '💬 ПОРТФОЛИО · ЧАТ #'+s.id.slice(0,8).toUpperCase()}
async function notify(s,body,kind){
 const lines=[adminLabel(s),kind==='new'?'🆕 Новое обращение':'✉️ Новое сообщение посетителя',
  'Направление: '+s.category,
  kind==='new'&&s.name?'Имя/компания: '+s.name:'',
  kind==='new'&&s.contact?'Контакт: '+s.contact:'',
  'Сообщение:',body,
  '━━━━━━━━━━━━━━━━━━',
  '↩️ Нажми «Ответить» на это сообщение: ответ появится у посетителя на сайте.'];
 const msg=await telegram('sendMessage',{chat_id:OWNER,text:lines.filter(Boolean).join('\n'),disable_web_page_preview:true});
 if(msg.message_id){s.botMessages.add(msg.message_id);telegramMessages.set(msg.message_id,s.id)}
 return msg;
}
async function registerWebhook(){
 if(!configured)return;
 try{
  await telegram('setWebhook',{url:PUBLIC_URL+'/telegram/webhook',secret_token:webhookSecret,allowed_updates:['message'],drop_pending_updates:false});
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
 const message=update&&update.message;
 if(message&&String(message.chat?.id)===OWNER&&String(message.from?.id)===OWNER){
  const replyTo=message.reply_to_message?.message_id,sessionId=telegramMessages.get(replyTo);
  const s=sessionId&&sessions.get(sessionId);
  const text=clean(message.text||message.caption,2200);
  if(s&&text&&Date.now()-s.updated<sessionLife){
   s.seq++;
   s.messages.push({seq:s.seq,by:'owner',text,at:Date.now()});
   if(s.messages.length>50)s.messages.shift();
   s.updated=Date.now();
   // Ack is deliberately not mapped to a session, so a reply must target the visitor alert.
   telegram('sendMessage',{chat_id:OWNER,text:'✓ Ответ передан в чат #'+s.id.slice(0,8).toUpperCase()+'. Посетитель увидит его, когда откроет страницу (пока сеанс сохранён).'}).catch(()=>{});
  }
 }
 sendJSON(res,200,{ok:true});
}
async function handle(req,res){
 let path;
 try{path=new URL(req.url,'http://localhost').pathname}catch{sendJSON(res,400,{ok:false});return}
 if(path==='/health'&&req.method==='GET'){
  sendJSON(res,200,{ok:true,configured,webhookReady:webhookRegistered,activeConversations:sessions.size});
  return;
 }
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
  sendJSON(res,200,{ok:true,sessionId:id,sessionKey:secret,expiresInHours:48});
  return;
 }
 if(path==='/api/chat/poll'){
  const s=validSession(data);
  if(!s){sendJSON(res,404,{ok:false,error:'Переписка недоступна. Начните новую или напишите в Telegram.'});return}
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
  sendJSON(res,200,{ok:true,seq:s.seq});
  return;
 }
 sendJSON(res,404,{ok:false,error:'Неизвестный метод'});
}
const server=http.createServer((req,res)=>{handle(req,res).catch(()=>{if(!res.headersSent)sendJSON(res,500,{ok:false,error:'Внутренняя ошибка'});else res.end()})});
server.requestTimeout=20000;
server.listen(PORT,'0.0.0.0',()=>console.log('Portfolio chat API listening on '+PORT));
if(configured)registerWebhook();
setInterval(clearExpired,600000).unref();
