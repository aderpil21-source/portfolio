const DATA = {
  ranepa: {
    tag: "FLAGSHIP / REAL",
    title: "РАНХиГС: шесть лет внутри цифрового контура",
    lead: "Приёмные кампании, digital, PR, бот, данные, ДПО и внутренние сервисы. Не один проект — длинная история системной работы внутри образовательной организации.",
    metrics: [["6 лет","практики"],["15 000+","заявлений в 2025*"],["+75%","рост заявлений г/г*"],["1 469","зачисленных в 2025*"]],
    files: ["zapad-bot / zapad-bot-v2","ranepa-dpo-site","ranepa-dpo-backend","cdo-staff-guide"],
    note: "* Публичные показатели относятся к Западному филиалу РАНХиГС в целом. Они показывают масштаб среды, внутри которой создавались digital- и коммуникационные решения."
  },
  cat: {
    tag: "ADMISSIONS / PRODUCTION",
    title: "Кот приёмной комиссии",
    lead: "Telegram-система для реальной приёмной: данные, fuzzy-поиск, баллы, списки, дедлайны, экзамены, история диалогов, исправления и передача оператору.",
    metrics: [["10 000+","вопросов"],["24/7","доступность"],["v2","эволюция"],["6 типов","контента"]],
    files: ["zapad-bot/bot.py","zapad-bot-v2/bot.py","Google Sheets data layer","RapidFuzz + pandas + Telegram"],
    note: "В публичной версии показываем только агрегированную механику и обезличенные примеры — без персональных данных абитуриентов."
  },
  landing: {
    tag: "ORIGIN",
    title: "DPO Landing: точка старта",
    lead: "Ранний самостоятельный слой ДПО: каталог программ, оффер и маршруты пользователя. Ценность кейса — в контрасте с тем, во что эта ветка выросла дальше.",
    metrics: [["v1","начало"],["catalog","программы"],["conversion","контакты"],["→","platform"]],
    files: ["ranepa-dpo-landing/index.html"],
    note: "На сайте это будет первый кадр эволюции: «было» рядом с полноценной современной платформой."
  },
  dpo: {
    tag: "PLATFORM / END-TO-END",
    title: "Автономное ДПО",
    lead: "Программы, новости, расписание, слушатели, оплата, AI, CMS, SEO, материалы и автоматизации собраны в единую пользовательскую среду.",
    metrics: [["End-to-end","маршрут"],["CMS","операционка"],["AI","Сова"],["tests","security / SEO / motion"]],
    files: ["ranepa-dpo-site/index.html","students.html + pay/index.html","site-admin-*","tests/*"],
    note: "Ключевой коммерческий кейс: сайт здесь — интерфейс системы, а не конечный продукт."
  },
  backend: {
    tag: "INFRA / PRODUCTION",
    title: "Production backend",
    lead: "Отдельный stateless API на Fastify/PostgreSQL: заявки, расписание, материалы, публичные снимки данных и обучение Совы.",
    metrics: [["Fastify 5","API"],["PostgreSQL","storage"],["200 conn","load-test config"],["rate-limit","security"]],
    files: ["ranepa-dpo-backend/README.md","src/routes/leads.js","src/routes/owl.js","migrations/*"],
    note: "Архитектура специально отделяет CDN-friendly публичный сайт от динамики и позволяет масштабировать API независимо."
  },
  owl: {
    tag: "AI / LEARNING / HANDOFF",
    title: "Сова: AI как часть процесса",
    lead: "Не отдельное окно с чатом. Сова встроена в платформу: распознаёт контекст, ищет программы, использует learned rules и умеет передать сложный случай оператору.",
    metrics: [["brain","контекст"],["learning","правила"],["handoff","оператор"],["semantic","program search"]],
    files: ["owl-engine.js","owl-brain.js","owl-learning.js","operator/app.py"],
    note: "На финальном сайте этот слой будет показан как визуальный brain-map: local resolve → AI → human."
  },
  admin: {
    tag: "CMS / OPS",
    title: "Контент без разработчика",
    lead: "Редактирование структуры, программ, медиа, SEO, preview и workflow вынесено в административный слой.",
    metrics: [["8+","admin modules"],["preview","before publish"],["SEO","built-in"],["workflow","operational"]],
    files: ["site-admin-workflow.js","site-admin-structure.js","site-admin-entities.js","site-admin-media.js"],
    note: "После внедрения система должна жить без постоянного вызова разработчика — это часть продукта, а не дополнительная услуга."
  },
  lecture: {
    tag: "AUTHOR R&D / REALTIME",
    title: "Immersive Lecture OS",
    lead: "Авторская live-платформа: большой экран, преподавательский control, телефоны участников и mic endpoint синхронизируются в одном сеансе.",
    metrics: [["4","surfaces"],["Next.js 15","platform"],["Supabase","realtime"],["AUTOPILOT","90-min mode"]],
    files: ["immersive-lecture-os/PROJECT_SPEC.md","app/stage/page.js","app/control/page.js","app/personal/page.js"],
    note: "Это отдельный продуктовый вектор: не автоматизация бэк-офиса, а новый интерактивный формат самого обучения."
  },
  guide: {
    tag: "INTERNAL UX",
    title: "Интерактивная инструкция ЦДО",
    lead: "Служебное руководство v3.2 с автопубликацией через GitHub Pages — внутренние знания превращены в кликабельный интерфейс.",
    metrics: [["v3.2","current"],["Pages","autopublish"],["0 secrets","repo policy"],["staff","UX"]],
    files: ["cdo-staff-guide/README.md","guide.zip"],
    note: "Сильный кейс внутренней цифровизации: автоматизировать можно не только клиента, но и путь сотрудника к нужному действию."
  },
  vk: {
    tag: "AUTOMATION",
    title: "VK publishing pipeline",
    lead: "Автоматизированный контур публикации: медиа, upload, VK API, worker и статусы заданий.",
    metrics: [["VK API","integration"],["media","upload"],["worker","jobs"],["status","flow"]],
    files: ["vk-poster-api/app.py","ranepa-dpo-site/vk_poster.py","worker/vk_worker.py"],
    note: "Не главный кейс, а supporting-proof: система умеет сама перемещать контент между инструментами."
  }
};

const $ = (s, root=document) => root.querySelector(s);
const $$ = (s, root=document) => [...root.querySelectorAll(s)];

function renderCase(key){
  const d = DATA[key];
  if(!d) return;
  const content = $("#dialog-content");
  content.innerHTML = `
    <p class="overline">${d.tag}</p>
    <h2 class="dialog-title">${d.title}</h2>
    <p class="dialog-lead">${d.lead}</p>
    <div class="dialog-grid">
      ${d.metrics.map(([v,l]) => `<div class="dialog-metric"><b>${v}</b><span>${l}</span></div>`).join("")}
    </div>
    <div class="dialog-files">
      <b>GITHUB / SYSTEM PROOF</b>
      ${d.files.map(f => `<code>${f}</code>`).join("")}
    </div>
    <p class="dialog-note">${d.note}</p>
  `;
  $("#case-dialog").showModal();
  document.body.classList.add("dialog-open");
}

$$("[data-case]").forEach(el => el.addEventListener("click", () => {
  if($("#system-dialog").open) $("#system-dialog").close();
  renderCase(el.dataset.case);
}));

$("[data-close-dialog]").addEventListener("click", () => {
  $("#case-dialog").close(); document.body.classList.remove("dialog-open");
});
$("#case-dialog").addEventListener("click", e => {
  if(e.target === $("#case-dialog")) { $("#case-dialog").close(); document.body.classList.remove("dialog-open"); }
});

$$("[data-open-system]").forEach(el => el.addEventListener("click", () => {
  $("#system-dialog").showModal(); document.body.classList.add("dialog-open");
}));
$("[data-close-system]").addEventListener("click", () => {
  $("#system-dialog").close(); document.body.classList.remove("dialog-open");
});
$("#system-dialog").addEventListener("click", e => {
  if(e.target === $("#system-dialog")) { $("#system-dialog").close(); document.body.classList.remove("dialog-open"); }
});

$$("[data-open-contact]").forEach(el => el.addEventListener("click", () => {
  $("#contact-dialog").showModal(); document.body.classList.add("dialog-open");
}));
$("[data-close-contact]").addEventListener("click", () => {
  $("#contact-dialog").close(); document.body.classList.remove("dialog-open");
});
$("#contact-dialog").addEventListener("click", e => {
  if(e.target === $("#contact-dialog")) { $("#contact-dialog").close(); document.body.classList.remove("dialog-open"); }
});

document.addEventListener("keydown", e => {
  if(e.key === "Escape") document.body.classList.remove("dialog-open");
});

function runTour(){
  const stops = ["#work",".chapter-dpo",".chapter-lecture","#capabilities"];
  let i = 0;
  const next = () => {
    if(i >= stops.length) return;
    const target = document.querySelector(stops[i++]);
    target?.scrollIntoView({behavior:"smooth",block:"start"});
    if(i < stops.length) setTimeout(next, 2600);
  };
  next();
}
$("[data-tour-start]").addEventListener("click", runTour);

const canvas = $("#ambient");
const ctx = canvas.getContext("2d", {alpha:true});
let W=0,H=0,DPR=1,points=[],raf=0,visible=true;
const reduceMotion = matchMedia("(prefers-reduced-motion: reduce)").matches;

function resize(){
  DPR = Math.min(devicePixelRatio || 1, 1.5);
  W = innerWidth; H = innerHeight;
  canvas.width = Math.round(W*DPR); canvas.height = Math.round(H*DPR);
  canvas.style.width = W+"px"; canvas.style.height = H+"px";
  ctx.setTransform(DPR,0,0,DPR,0,0);
  const count = reduceMotion ? 0 : Math.max(26, Math.min(W < 700 ? 38 : 72, Math.floor(W/18)));
  points = Array.from({length:count},()=>({
    x:Math.random()*W,y:Math.random()*H,
    vx:(Math.random()-.5)*.13,vy:(Math.random()-.5)*.13,
    r:Math.random()*1.4+.25,a:Math.random()*.35+.08
  }));
}
function draw(){
  if(!visible || reduceMotion) return;
  ctx.clearRect(0,0,W,H);
  const mx = W*.72, my = H*.28;
  for(const p of points){
    p.x+=p.vx;p.y+=p.vy;
    if(p.x<-20)p.x=W+20;if(p.x>W+20)p.x=-20;if(p.y<-20)p.y=H+20;if(p.y>H+20)p.y=-20;
    const dx=p.x-mx,dy=p.y-my,dist=Math.hypot(dx,dy);
    if(dist<260){
      ctx.strokeStyle=`rgba(125,118,255,${(1-dist/260)*.055})`;
      ctx.beginPath();ctx.moveTo(p.x,p.y);ctx.lineTo(mx,my);ctx.stroke();
    }
    ctx.fillStyle=`rgba(190,202,226,${p.a})`;ctx.beginPath();ctx.arc(p.x,p.y,p.r,0,Math.PI*2);ctx.fill();
  }
  raf=requestAnimationFrame(draw);
}
document.addEventListener("visibilitychange",()=>{
  visible=!document.hidden;
  if(visible && !reduceMotion){cancelAnimationFrame(raf);draw()}else cancelAnimationFrame(raf);
});
addEventListener("resize",()=>{clearTimeout(resize._t);resize._t=setTimeout(resize,140)},{passive:true});
resize(); if(!reduceMotion) draw();

import("https://cdn.jsdelivr.net/npm/motion@12.23.24/+esm").then(({animate,stagger})=>{
  animate(".hero-copy > *",{opacity:[0,1],y:[24,0]},{duration:.75,delay:stagger(.07),easing:[.2,.8,.2,1]});
  animate(".hero-proof > div",{opacity:[0,1],y:[14,0]},{duration:.65,delay:stagger(.06,{startDelay:.35})});
  $$(".map-node,.cap-list button").forEach(el=>{
    el.addEventListener("pointerenter",()=>animate(el,{scale:1.018},{duration:.22,easing:[.2,.8,.2,1]}));
    el.addEventListener("pointerleave",()=>animate(el,{scale:1},{duration:.3,easing:[.2,.8,.2,1]}));
  });
}).catch(()=>{});

if(window.gsap && window.ScrollTrigger && !reduceMotion){
  gsap.registerPlugin(ScrollTrigger);

  gsap.from(".manifesto-copy",{
    opacity:.18,y:70,filter:"blur(10px)",
    scrollTrigger:{trigger:".manifesto",start:"top 75%",end:"center 45%",scrub:.8}
  });

  $$(".chapter-film .film-frame").forEach((frame)=>{
    gsap.fromTo(frame,
      {scale:.88,opacity:.28,y:80},
      {scale:1,opacity:1,y:0,ease:"none",
       scrollTrigger:{trigger:frame,start:"top 90%",end:"center 55%",scrub:.7}}
    );
    gsap.to(frame,{
      opacity:.20,scale:.96,
      scrollTrigger:{trigger:frame,start:"bottom 52%",end:"bottom 12%",scrub:.55}
    });
  });

  gsap.from(".closing-copy",{
    scale:.9,opacity:.18,
    scrollTrigger:{trigger:".closing",start:"top 75%",end:"center 50%",scrub:.8}
  });
}

const io = new IntersectionObserver(entries=>{
  entries.forEach(entry=>{
    if(entry.isIntersecting) entry.target.classList.add("in-view");
  });
},{threshold:.12});
$$(".cap-list button,.film-frame,.chapter-copy").forEach(el=>io.observe(el));