'use strict';
// Public source code; NO Telegram token or chat ID is ever stored here.
const http=require('node:http');
const { URL }=require('node:url');
const PORT=Number(process.env.PORT||3000);
const ORIGIN=(process.env.ALLOWED_ORIGIN||'https://aderpil21-source.github.io').replace(/\/$/,'');
const TOKEN=process.env.TELEGRAM_BOT_TOKEN||'';
const CHAT_ID=process.env.TELEGRAM_CHAT_ID||'';
const allowed=new Set([
 'Таргетированная реклама',
 'Сайты и лендинги',
 'AI-боты и ассистенты',
 'Автоматизация заявок',
 'CRM, API и интеграции',
 'SEO и сопровождение',
 'AI-видео и креативы',
 'Образовательные проекты',
 'Другая задача'
]);
const buckets=new Map();
let globalWindow={start:Date.now(),count:0};
function reply(res,status,obj){
 res.writeHead(status,{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store','X-Content-Type-Options':'nosniff','Vary':'Origin'});
 res.end(JSON.stringify(obj));
}
function cors(res,origin){
 if(origin===ORIGIN){
   res.setHeader('Access-Control-Allow-Origin',ORIGIN);
   res.setHeader('Access-Control-Allow-Methods','POST, OPTIONS');
   res.setHeader('Access-Control-Allow-Headers','Content-Type');
   res.setHeader('Access-Control-Max-Age','600');
   return true;
 }
 return false;
}
function clean(value,limit){
 return typeof value==='string'?value.replace(/[\u0000-\u001f\u007f]/g,' ').trim().slice(0,limit):'';
}
function limitExceeded(req){
 const now=Date.now();
 // 30 requests total per 60 seconds on this instance; individual visitors have a lower limit.
 if(now-globalWindow.start>60000)globalWindow={start:now,count:0};
 globalWindow.count++;
 if(globalWindow.count>30)return true;
 const forwarded=String(req.headers['x-forwarded-for']||'');
 const ip=forwarded.split(',')[0].trim().slice(0,65)||req.socket.remoteAddress||'unknown';
 const old=buckets.get(ip);
 const bucket=!old||now-old.start>600000?{start:now,count:0,last:0}:old;
 const fast=now-bucket.last<12000;
 bucket.count++;bucket.last=now;buckets.set(ip,bucket);
 if(buckets.size>500){for(const [key,val] of buckets){if(now-val.start>600000)buckets.delete(key)}}
 return fast||bucket.count>4;
}
const server=http.createServer(async(req,res)=>{
 let url;
 try{url=new URL(req.url,'http://localhost')}catch{reply(res,400,{ok:false,error:'Некорректный запрос.'});return}
 const origin=String(req.headers.origin||'');
 if(req.method==='GET'&&url.pathname==='/health'){
   reply(res,200,{ok:true,configured:!!(TOKEN&&CHAT_ID)});
   return;
 }
 if(url.pathname!=='/api/leads'){reply(res,404,{ok:false,error:'Не найдено.'});return}
 if(!cors(res,origin)){reply(res,403,{ok:false,error:'Запрос с этого сайта не разрешён.'});return}
 if(req.method==='OPTIONS'){res.writeHead(204);res.end();return}
 if(req.method!=='POST'){reply(res,405,{ok:false,error:'Метод не поддерживается.'});return}
 if(!TOKEN||!CHAT_ID){reply(res,503,{ok:false,error:'Отправка временно недоступна. Напишите Денису в Telegram напрямую.'});return}
 if(!String(req.headers['content-type']||'').startsWith('application/json')){reply(res,415,{ok:false,error:'Ожидался JSON.'});return}
 const size=Number(req.headers['content-length']||0);
 if(size>5500){reply(res,413,{ok:false,error:'Сообщение слишком длинное.'});return}
 if(limitExceeded(req)){reply(res,429,{ok:false,error:'Слишком много запросов. Повторите позже.'});return}
 let raw='';
 try{
   for await(const part of req){
     raw+=part;
     if(raw.length>5500)throw new Error('too long');
   }
 }catch{reply(res,413,{ok:false,error:'Сообщение слишком длинное.'});return}
 let data;try{data=JSON.parse(raw)}catch{reply(res,400,{ok:false,error:'Не удалось прочитать сообщение.'});return}
 if(typeof data!=='object'||!data||Array.isArray(data)){reply(res,400,{ok:false,error:'Некорректные данные.'});return}
 // Honeypot: automated form fillers get no Telegram delivery.
 if(clean(data.website,140)){reply(res,200,{ok:true});return}
 const category=clean(data.category,80),message=clean(data.message,1550),contact=clean(data.contact,140),name=clean(data.name,90);
 if(!allowed.has(category)||message.length<12||message.length>1500||contact.length<3||contact.length>130||data.consent!==true){
   reply(res,400,{ok:false,error:'Выберите услугу, опишите задачу, оставьте контакт и подтвердите согласие.'});return;
 }
 const lines=[
  '📩 ЗАЯВКА С ПОРТФОЛИО',
  '━━━━━━━━━━━━━━━━━━',
  '📌 Направление: '+category,
  '📝 Задача: '+message,
  name?'👤 Имя / компания: '+name:'',
  '☎️ Контакт для ответа: '+contact,
  '🌐 Источник: сайт-портфолио',
  '━━━━━━━━━━━━━━━━━━',
  'Отправлено из формы по согласию посетителя.'
 ].filter(Boolean);
 try{
   const response=await fetch('https://api.telegram.org/bot'+TOKEN+'/sendMessage',{
     method:'POST',headers:{'Content-Type':'application/json'},
     body:JSON.stringify({chat_id:CHAT_ID,text:lines.join('\n'),disable_web_page_preview:true}),
     signal:AbortSignal.timeout(12000)
   });
   const telegram=await response.json().catch(()=>({ok:false}));
   if(!response.ok||telegram.ok!==true){reply(res,502,{ok:false,error:'Telegram сейчас не принял сообщение. Попробуйте ещё раз или напишите напрямую.'});return}
   reply(res,200,{ok:true});
 }catch{
   reply(res,502,{ok:false,error:'Не удалось связаться с Telegram. Попробуйте позже или напишите напрямую.'});
 }
});
server.requestTimeout=16000;
server.listen(PORT,'0.0.0.0',()=>{console.log('Portfolio leads API listening on port '+PORT)});
