
/* Eight services + reply-enabled Telegram bridge, no public bot secrets */
(function(){
 const el=id=>document.getElementById(id),root=el('dk-lead-assistant'),panel=el('dk-la-panel');
 const launch=el('dk-la-launch'),close=el('dk-la-close'),choices=el('dk-la-tasks'),answer=el('dk-la-answer'),form=el('dk-la-form');
 const msg=el('dk-la-message'),contact=el('dk-la-contact'),name=el('dk-la-name'),consent=el('dk-la-consent'),status=el('dk-la-status'),send=el('dk-la-send');
 const chat=el('dk-la-chat'),messages=el('dk-la-messages'),liveStatus=el('dk-la-live-status'),followup=el('dk-la-followup'),followupText=el('dk-la-followup-text'),followupButton=el('dk-la-followup-send');
 if(!root||!chat)return;
 const api=(root.dataset.leadsApi||'').trim().replace(/\/$/,'');
 const KEY='portfolio_telegram_session_v1';
 const turnstileBox=el('dk-la-turnstile'),turnstileSlot=el('dk-la-turnstile-slot');
 let turnstileConfig=null,turnstileSetup=null,turnstileWidget=null,turnstileToken='';
 async function initTurnstile(){
  if(turnstileSetup)return turnstileSetup;
  turnstileSetup=(async()=>{
   const controller=new AbortController(),timeout=setTimeout(()=>controller.abort(),20000);
   let config;
   try{
    const response=await fetch(api+'/api/chat/config',{method:'GET',mode:'cors',cache:'no-store',signal:controller.signal});
    config=await response.json();
    if(!response.ok||!config?.ok)throw Error('Turnstile config unavailable');
   }finally{clearTimeout(timeout)}
   turnstileConfig=config;
   if(!config.turnstileEnabled)return config;
   if(typeof config.siteKey!=='string'||!config.siteKey)throw Error('Turnstile sitekey not set');
   if(!window.turnstile){
    await new Promise((resolve,reject)=>{
     const script=document.createElement('script');
     script.src='https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit';
     script.async=true;
     const timeout=setTimeout(()=>{script.remove();reject(Error('Turnstile load timeout'))},15000);
     script.onload=()=>{clearTimeout(timeout);resolve()};
     script.onerror=()=>{clearTimeout(timeout);reject(Error('Turnstile load error'))};
     document.head.appendChild(script);
    });
   }
   if(typeof window.turnstile?.render!=='function')throw Error('Turnstile script unavailable');
   turnstileBox.hidden=false;
   turnstileWidget=window.turnstile.render(turnstileSlot,{
    sitekey:config.siteKey,action:'portfolio_lead',theme:'auto',size:'flexible',
    appearance:'interaction-only','response-field':false,
    callback:token=>{turnstileToken=token;},
    'expired-callback':()=>{turnstileToken='';},
    'error-callback':()=>{turnstileToken='';return true}
   });
   return config;
  })().catch(error=>{turnstileSetup=null;throw error});
  return turnstileSetup;
 }
 function resetTurnstile(){
  turnstileToken='';
  if(turnstileWidget!==null&&window.turnstile?.reset){
   try{window.turnstile.reset(turnstileWidget)}catch{}
  }
 }
 const replies={
  'Таргетированная реклама':'Продвижение: аудитории, стратегия, креативы и обработка заявок. Расскажите, какой продукт нужно продвигать.',
  'Сайты и лендинги':'Сайт под ключ: структура, дизайн, формы, оплата, хостинг и поддержка. Нужен новый сайт или доработка существующего?',
  'AI-боты и ассистенты':'AI-помощник для сайта или Telegram, ответы, запись, сопровождение клиентов. Откуда сейчас поступают вопросы?',
  'Автоматизация заявок':'Формы, документы, уведомления, оплаты, CRM. Какие действия сотрудники сейчас выполняют вручную?',
  'CRM, API и интеграции':'Интеграции между сайтом, ботом, CRM и сервисами. Какие системы нужно связать?',
  'SEO и сопровождение':'Оптимизация поиска, скорости, хостинг, поддержка. У вас уже есть сайт?',
  'AI-видео и креативы':'Рекламные видео, изображения, AI-постеры, посевы и контент. Что планируете запустить?',
  'Образовательные проекты':'Системы для вузов и ДПО: абитуриенты, боты, расписания, запись на программы. Какой процесс нуждается в улучшении?',
  'Другая задача':'Опишите задачу простыми словами — подберём решение.'
 };
 let category='',session=null,last=0,seen=new Set(),timer=0,polling=false,expired=false;
 const note=(target,text,kind)=>{target.textContent=text;target.dataset.state=kind||''};
 function stop(){if(timer){clearTimeout(timer);timer=0}}
 function schedule(){stop();if(session&&!panel.hidden&&!document.hidden&&!expired)timer=setTimeout(poll,4500)}
 function scrollInner(){requestAnimationFrame(()=>{const pane=el('dk-la-body');if(pane)pane.scrollTop=pane.scrollHeight;messages.scrollTop=messages.scrollHeight})}
 function show(open){root.dataset.open=String(open);panel.hidden=!open;launch.setAttribute('aria-expanded',String(open));if(open){close.focus({preventScroll:true});if(session)poll()}else{stop();launch.focus({preventScroll:true})}}
 launch.addEventListener('click',()=>show(panel.hidden));close.addEventListener('click',()=>show(false));
 document.addEventListener('keydown',e=>{if(e.key==='Escape'&&!panel.hidden)show(false)});
 function select(v){category=v;choices.querySelectorAll('[data-la-task]').forEach(b=>{const active=b.dataset.laTask===v;b.classList.toggle('is-active',active);b.setAttribute('aria-pressed',String(active))});el('dk-la-choice-label').textContent=v==='Другая задача'?'Своя задача':v;el('dk-la-answer-text').textContent=replies[v]||replies['Другая задача'];answer.hidden=false;note(status,'Опишите задачу. Ответ Дениса появится в этом чате.');send.textContent='Отправить Денису в Telegram →';initTurnstile().catch(()=>{});scrollInner()}
 choices.addEventListener('click',e=>{const b=e.target.closest('[data-la-task]');if(b)select(b.dataset.laTask)});
 el('dk-la-custom').addEventListener('click',()=>select('Другая задача'));
 el('dk-la-change-choice').addEventListener('click',()=>{category='';answer.hidden=true;choices.querySelectorAll('button').forEach(b=>b.classList.remove('is-active'))});
 const privacy=el('dk-la-privacy');el('dk-la-privacy-link').addEventListener('click',e=>{e.preventDefault();privacy.hidden=!privacy.hidden});
 async function request(path,data){
  const controller=new AbortController(),t=setTimeout(()=>controller.abort(),17000);
  try{const r=await fetch(api+path,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(data),signal:controller.signal,cache:'no-store'});
    const out=await r.json().catch(()=>({ok:false,error:'Нет ответа'}));if(!r.ok||!out.ok){const err=new Error(out.error||'Ошибка отправки');err.status=r.status;throw err}return out;
  }finally{clearTimeout(t)}
 }
 function bubble(m){
  if(seen.has(m.seq))return;
  seen.add(m.seq);last=Math.max(last,m.seq);
  const isInvitation=m.kind==='telegram_invite'&&m.by==='system';
  if(isInvitation){
    // The server constructs an official t.me/<username>?text= link; never trust arbitrary redirect URLs.
    let url=null;
    try{const parsed=new URL(m.url);if(parsed.protocol==='https:'&&parsed.hostname==='t.me'&&parsed.pathname==='/dnk_pr03'&&parsed.searchParams.has('text'))url=parsed.href}catch{}
    const card=document.createElement('div');card.className='dk-la-invite';
    const heading=document.createElement('div');heading.className='dk-la-invite-header';
    const icon=document.createElement('i');icon.textContent='↗';
    const label=document.createElement('span');label.textContent='Денис приглашает в Telegram';
    heading.append(icon,label);
    const explanation=document.createElement('p');explanation.textContent='Можно продолжить общение в личной переписке. Мы уже подготовили короткое сообщение, чтобы тебе не пришлось повторять задачу.';
    card.append(heading,explanation);
    if(typeof m.draft==='string'&&m.draft.length){
      const preview=document.createElement('div');preview.className='dk-la-invite-preview';
      const caption=document.createElement('strong');caption.textContent='ВАШЕ ГОТОВОЕ СООБЩЕНИЕ';
      const body=document.createElement('p');body.textContent=m.draft;
      preview.append(caption,body);card.appendChild(preview);
    }
    if(url){
      const open=document.createElement('a');open.className='dk-la-invite-go';
      open.href=url;open.target='_blank';open.rel='noopener noreferrer';
      open.textContent='Перейти в чат с Денисом в Telegram ↗';
      card.appendChild(open);
      const staticLink=el('dk-la-live-tg');
      if(staticLink){staticLink.href=url;staticLink.classList.add('is-invited');staticLink.textContent='↗ Перейти в Telegram с готовым сообщением';}
    }
    const hint=document.createElement('small');hint.className='dk-la-invite-hint';
    hint.textContent='Telegram откроет личный чат с черновиком. Его можно изменить; сообщение не отправится без твоего подтверждения.';
    card.appendChild(hint);
    messages.appendChild(card);
  }else{
    const n=document.createElement('div');n.className='dk-la-msg';n.dataset.from=m.by==='owner'?'owner':'visitor';
    const k=document.createElement('small');k.textContent=m.by==='owner'?'Денис · Telegram':'Вы · сайт';
    const p=document.createElement('span');p.textContent=m.text;
    n.append(k,p);messages.append(n);
  }
  if(messages.children.length>50)messages.firstChild.remove();
  scrollInner();
}
 function chatMode(){
  el('dk-la-greeting').hidden=true;choices.hidden=true;el('dk-la-section-label').hidden=true;
  el('dk-la-custom').hidden=true;answer.hidden=true;chat.hidden=false;
  const id=el('dk-la-chat-id'),description=el('dk-la-chat-subtitle');
  if(id&&session?.id)id.textContent='#'+session.id.slice(0,8).toUpperCase();
  if(description)description.textContent=session?.name?'Ваш разговор с Денисом · '+session.name:'Ответы из Telegram появляются прямо здесь';
  scrollInner();
}
 async function poll(){
  if(!session||polling||panel.hidden||document.hidden||expired)return;polling=true;
  try{const out=await request('/api/chat/poll',{sessionId:session.id,sessionKey:session.key,after:last});for(const m of out.messages||[])bubble(m);note(liveStatus,'Соединено с Telegram · ожидаем ответ Дениса');}
  catch(e){if(e.status===404){expired=true;note(liveStatus,'Диалог завершён на сервере. Начните новый или напишите Денису в Telegram.','error');}
   else note(liveStatus,'Соединение временно недоступно. Пробуем снова…','error');}
  finally{polling=false;schedule()}
 }
 form.addEventListener('submit',async e=>{
  e.preventDefault();
  const payload={category:category||'Другая задача',message:msg.value.trim(),contact:contact.value.trim(),name:name.value.trim(),website:el('dk-la-website').value.trim(),consent:consent.checked};
  if(payload.message.length<12){note(status,'Опишите задачу хотя бы в одном предложении.','error');msg.focus();return}
  if(!payload.consent){note(status,'Подтвердите согласие на передачу обращения.','error');consent.focus();return}
  send.disabled=true;
  try{
   const security=await initTurnstile();
   if(security.turnstileEnabled){
    if(!turnstileToken){note(status,'Подождите окончания проверки безопасности и нажмите «Отправить» снова.','error');turnstileBox?.scrollIntoView({block:'nearest',behavior:'smooth'});return}
    payload.turnstileToken=turnstileToken;
   }
   note(status,'Передаю задачу в Telegram…');
   const out=await request('/api/chat/start',payload);if(!out.sessionId||!out.sessionKey)throw Error('Invalid session');session={id:out.sessionId,key:out.sessionKey,name:payload.name||''};try{sessionStorage.setItem(KEY,JSON.stringify(session))}catch{};seen.clear();last=0;messages.replaceChildren();bubble({seq:1,by:'visitor',text:payload.message});chatMode();note(liveStatus,'✓ Сообщение доставлено Денису. Ожидаем ответа…');msg.value='';consent.checked=false;poll();}
  catch(error){
   note(status,error?.status===403?'Проверка безопасности не пройдена. Повторите проверку и отправьте ещё раз.':'Не удалось подтвердить отправку. Попробуйте снова или напишите напрямую в Telegram.','error');
  }
  finally{if(turnstileConfig?.turnstileEnabled)resetTurnstile();send.disabled=false}
 });
 followup.addEventListener('submit',async e=>{e.preventDefault();if(!session||expired)return;const text=followupText.value.trim();if(text.length<2)return;followupButton.disabled=true;note(liveStatus,'Отправляем…');try{const out=await request('/api/chat/message',{sessionId:session.id,sessionKey:session.key,text});bubble({seq:out.seq,by:'visitor',text});followupText.value='';note(liveStatus,'✓ Сообщение доставлено Денису.');}catch{note(liveStatus,'Сообщение не дошло. Повторите или перейдите в личный Telegram.','error')}finally{followupButton.disabled=false}});
 el('dk-la-new-chat').addEventListener('click',()=>{if(!window.confirm('Начать новый разговор?'))return;stop();session=null;expired=false;seen.clear();last=0;messages.replaceChildren();
  const directLink=el('dk-la-live-tg');
  if(directLink){directLink.href='https://t.me/dnk_pr03';directLink.textContent='↗ Перейти в личный Telegram к Денису';directLink.classList.remove('is-invited');}
  try{sessionStorage.removeItem(KEY)}catch{};chat.hidden=true;el('dk-la-greeting').hidden=false;choices.hidden=false;el('dk-la-section-label').hidden=false;el('dk-la-custom').hidden=false;answer.hidden=true;scrollInner()});
 document.addEventListener('visibilitychange',()=>{if(document.hidden)stop();else if(session&&!panel.hidden)poll()});
 try{const v=JSON.parse(sessionStorage.getItem(KEY)||'null');if(v&&typeof v.id==='string'&&typeof v.key==='string'&&v.id.length>20&&v.key.length>30)session=v}catch{}
 if(session){chatMode();if(!panel.hidden)poll()}
})();

