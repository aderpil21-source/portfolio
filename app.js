document.addEventListener("DOMContentLoaded", () => {
    let isRunning = true;

    // 1. 2D ДОЖДЬ
    const canvasRain = document.getElementById('matrix-rain');
    const ctxRain = canvasRain.getContext('2d');
    function resizeRain() { canvasRain.width = window.innerWidth; canvasRain.height = window.innerHeight; }
    window.addEventListener('resize', resizeRain); resizeRain();
    const rainSnippets = ["01001", "system.hack", "def exploit():", "0xFA21", "void()", "matrix.flow", "import python"];
    const fontSize = 14;
    const columns = Math.floor(canvasRain.width / fontSize);
    const drops = Array(columns).fill(1);
    function drawRain() {
        if(!isRunning) return;
        ctxRain.fillStyle = 'rgba(0, 0, 0, 0.15)'; ctxRain.fillRect(0, 0, canvasRain.width, canvasRain.height);
        ctxRain.font = fontSize + 'px monospace';
        for(let i = 0; i < drops.length; i++) {
            const char = rainSnippets[Math.floor(Math.random() * rainSnippets.length)];
            ctxRain.fillStyle = '#005555'; ctxRain.fillText(char, i * fontSize, drops[i] * fontSize);
            if(drops[i] * fontSize > canvasRain.height && Math.random() > 0.95) drops[i] = 0;
            drops[i]++;
        }
        requestAnimationFrame(drawRain);
    }
    drawRain();

    // 2. 3D ТЕКСТ
    const canvas3D = document.getElementById('matrix-3d');
    const ctx3D = canvas3D.getContext('2d');
    function resize3D() { canvas3D.width = window.innerWidth; canvas3D.height = window.innerHeight; }
    window.addEventListener('resize', resize3D); resize3D();
    const nlpTriggers = ["ВЫГОРАНИЕ", "ТОТАЛЬНЫЙ КОНТРОЛЬ", "НЕВИДИМАЯ РУКА", "НОВЫЙ ПОРЯДОК", "ИЛЛЮМИНАЦИЯ", "УПРАВЛЕНИЕ РАЗУМОМ"];
    const codeSnippets = ["import mass_control", "def eye_of_providence():", "yield silent_power", "sys.monopoly = True", "for x in range(100): scale()"];
    const particles = []; const meteors = []; const fov = 300; 
    for(let i = 0; i < 150; i++) {
        particles.push({ x: (Math.random() - 0.5) * 2500, y: (Math.random() - 0.5) * 2500, z: Math.random() * 2000, text: Math.random() > 0.85 ? nlpTriggers[Math.floor(Math.random() * nlpTriggers.length)] : codeSnippets[Math.floor(Math.random() * codeSnippets.length)], isNlp: Math.random() > 0.85 });
    }
    for(let i=0; i<10; i++) { meteors.push({ x: Math.random()*canvas3D.width*2, y: -200, length: Math.random()*150+50, speed: Math.random()*15+10, opacity: Math.random()*0.5+0.1 }); }
    function draw3D() {
        if(!isRunning) return;
        ctx3D.clearRect(0, 0, canvas3D.width, canvas3D.height);
        meteors.forEach(m => {
            m.x -= m.speed; m.y += m.speed;
            if(m.y > canvas3D.height + 200 || m.x < -200) { m.x = Math.random()*canvas3D.width*1.5; m.y = -200; }
            const grad = ctx3D.createLinearGradient(m.x, m.y, m.x + m.length, m.y - m.length);
            grad.addColorStop(0, `rgba(0, 243, 255, ${m.opacity})`); grad.addColorStop(1, 'rgba(0, 243, 255, 0)');
            ctx3D.beginPath(); ctx3D.moveTo(m.x, m.y); ctx3D.lineTo(m.x + m.length, m.y - m.length); ctx3D.strokeStyle = grad; ctx3D.lineWidth = 2; ctx3D.stroke();
        });
        particles.forEach(p => {
            p.z -= 12; if(p.z <= 0) { p.z = 2000; p.x = (Math.random() - 0.5) * 2500; p.y = (Math.random() - 0.5) * 2500; }
            const scale = fov / (fov + p.z); const x2d = (p.x * scale) + canvas3D.width / 2; const y2d = (p.y * scale) + canvas3D.height / 2;
            if (scale > 0 && scale < 8) {
                ctx3D.textAlign = "center";
                if(p.isNlp) { ctx3D.font = `${Math.floor(60 * scale)}px -apple-system, sans-serif`; ctx3D.fillStyle = Math.random() > 0.5 ? `rgba(255, 0, 100, ${scale/2})` : `rgba(150, 0, 255, ${scale/2})`; }
                else { ctx3D.font = `${Math.floor(20 * scale)}px monospace`; ctx3D.fillStyle = `rgba(0, 243, 255, ${scale/1.5})`; }
                ctx3D.fillText(p.text, x2d, y2d);
            }
        });
        requestAnimationFrame(draw3D);
    } draw3D();

    // 3. РЕЖИССУРА
    const hologram = document.getElementById('hologram-container');
    const bootTerminal = document.getElementById('boot-terminal');
    const skipBtn = document.getElementById('skip-btn');
    const blackHole = document.getElementById('black-hole-event');
    const bigBang = document.getElementById('big-bang-flash');
    const coreUI = document.getElementById('core-ui');
    const progressBar = document.getElementById('progress-bar');
    const progressText = document.getElementById('progress-text');
    let isFinished = false;

    function finishLoad() {
        if (isFinished) return;
        isFinished = true; isRunning = false;
        canvasRain.style.display = 'none'; canvas3D.style.display = 'none'; hologram.style.display = 'none'; bootTerminal.style.display = 'none';
        document.body.style.overflow = 'auto'; coreUI.classList.remove('hidden');
        coreUI.animate([{ opacity: 0, filter: 'blur(10px)' }, { opacity: 1, filter: 'blur(0)' }], { duration: 1000, easing: 'ease-out', fill: 'forwards' });
    }
    if (skipBtn) skipBtn.addEventListener('click', finishLoad);

    let loadValue = 0; const intervalTime = 45; const loadStep = 100 / (4500 / intervalTime);
    const loadTimer = setInterval(() => {
        if (isFinished) { clearInterval(loadTimer); return; }
        loadValue += loadStep;
        if(loadValue >= 100) { loadValue = 100; clearInterval(loadTimer); finishLoad(); }
        progressBar.style.width = loadValue + '%'; progressText.innerText = Math.floor(loadValue) + '%';
        if (loadValue >= 60) hologram.style.opacity = '0.75';
    }, intervalTime);
    setTimeout(() => { hologram.classList.add('smear-and-shatter'); }, 4000);
    setTimeout(() => { isRunning = false; canvasRain.style.display = 'none'; canvas3D.style.display = 'none'; hologram.style.display = 'none'; bootTerminal.style.display = 'none'; if(blackHole) blackHole.classList.add('collapse-anim'); }, 4500);
    setTimeout(() => { if(blackHole) blackHole.style.display = 'none'; if(bigBang) bigBang.classList.add('explode-anim'); }, 5800);
    setTimeout(() => { document.body.style.overflow = 'auto'; coreUI.classList.remove('hidden'); coreUI.animate([{ transform: 'scale(0.5) translateZ(-1000px)', opacity: 0, filter: 'blur(30px)' }, { transform: 'scale(1) translateZ(0)', opacity: 1, filter: 'blur(0)' }], { duration: 2000, easing: 'cubic-bezier(0.16, 1, 0.3, 1)', fill: 'forwards' }); }, 6000);

    // Валидация
    const qualForm = document.getElementById('qual-form');
    if (qualForm) {
        qualForm.addEventListener('submit', (e) => {
            const email = document.querySelector('input[name="Email"]').value;
            if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) { e.preventDefault(); alert('ОШИБКА: НЕВЕРНЫЙ EMAIL.'); }
        });
    }

    // 4. ТИЛТ КАРТОЧЕК
    document.querySelectorAll('.tilt-effect').forEach(card => {
        card.addEventListener('mousemove', (e) => {
            const rect = card.getBoundingClientRect(); const x = e.clientX - rect.left; const y = e.clientY - rect.top;
            card.style.setProperty('--x', `${x}px`); card.style.setProperty('--y', `${y}px`);
            const rotateX = ((y - rect.height/2) / (rect.height/2)) * -15; const rotateY = ((x - rect.width/2) / (rect.width/2)) * 15;
            card.style.transform = `perspective(1200px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) scale3d(1.05, 1.05, 1.05)`;
            card.style.boxShadow = `${-rotateY*2}px ${rotateX*2}px 40px rgba(0, 243, 255, 0.3)`;
        });
        card.addEventListener('mouseleave', () => { card.style.transform = `perspective(1200px) rotateX(0deg) rotateY(0deg) scale3d(1, 1, 1)`; card.style.boxShadow = `0 30px 60px rgba(0,0,0,0.9)`; });
    });

    // 5. КОНТЕНТНАЯ БАЗА И МОДАЛЬНЫЕ ОКНА
    const projectData = {
        'ranhigs': {
            title: 'РАНХИГС: ЗАПАД',
            body: `
                <h3>СИСТЕМНЫЙ АТЛАС</h3>
                <p>Задача: Тотальное доминирование в приемной кампании.</p>
                <table class="modal-data-table">
                    <tr><td>Уникальных заявителей</td><td>8 000+</td></tr>
                    <tr><td>Всего заявлений</td><td>20 000+</td></tr>
                    <tr><td>Рост конверсии</td><td>+29% год к году</td></tr>
                    <tr><td>Снижение CPL</td><td>-18%</td></tr>
                </table>
                <p style="margin-top:20px; color: var(--neon-cyan);"><b>РЕАКЦИЯ ЗАКАЗЧИКА:</b> «Ты гений» (цитата из рабочих чатов при виде итоговых цифр по воронке).</p>
                <p style="margin-top:10px;">Реализована 100% digital-архитектура: от алгоритмического парсинга 1.8 млн ID до виральных ИИ-роликов и точечного микрогео-таргетинга.</p>
            `
        },
        'cat': {
            title: 'КОТ ПРИЕМНОЙ КОМИССИИ',
            body: `
                <h3>АРХИТЕКТУРА ИИ-АГЕНТА</h3>
                <p>Автономный бот-администратор, заменивший штат колл-центра.</p>
                <table class="modal-data-table">
                    <tr><td>Автоматических операций</td><td>10 000+</td></tr>
                    <tr><td>Доступность системы</td><td>24 / 7 / 365</td></tr>
                    <tr><td>Экономия ФОТ</td><td>5+ операторов</td></tr>
                    <tr><td>Лояльность аудитории</td><td>95%</td></tr>
                </table>
                <p style="margin-top:20px;">Реализован прямой парсинг таблиц Google Sheets, выдача статусов по ФИО, сверка баллов ЕГЭ и шлюз прямой связи с живой комиссией через команду «Позвать кота».</p>
            `
        },
        'college': {
            title: 'КОЛЛЕДЖ НЕЙРОСЕТЕЙ',
            body: `
                <h3>ПРОЕКТ НОВОГО ПОРЯДКА</h3>
                <p>Статус: <b>Секретный архив / Разработка концепции.</b></p>
                <p style="margin-top:15px;">Фундамент будущей монополии на подготовку кадров на стыке маркетинга, ИИ и прикладной психологии в Калининграде.</p>
            `
        }
    };

    const modal = document.getElementById('modal-overlay');
    const modalInner = document.getElementById('modal-inner');

    document.querySelectorAll('.xray-card').forEach((card, index) => {
        const ids = ['ranhigs', 'cat', 'college'];
        card.addEventListener('click', () => {
            const data = projectData[ids[index]];
            if (data && modalInner && modal) {
                modalInner.innerHTML = `<h2>${data.title}</h2>${data.body}`;
                modal.classList.remove('hidden');
            }
        });
    });

    const closeModal = document.getElementById('close-modal');
    if (closeModal) {
        closeModal.addEventListener('click', () => modal.classList.add('hidden'));
    }
    if (modal) {
        modal.addEventListener('click', (e) => { if(e.target === modal) modal.classList.add('hidden'); });
    }
});