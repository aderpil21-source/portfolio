/* Progressive enhancement: content remains available without motion libraries. */
(() => {
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  const progress = document.getElementById('page-journey-fill');
  const dockLinks = [...document.querySelectorAll('.premium-dock a')];
  const sections = ['solutions', 'work', 'about', 'contact'].map(id => document.getElementById(id)).filter(Boolean);
  let frame = 0;
  function update() {
    frame = 0;
    const maximum = document.documentElement.scrollHeight - innerHeight;
    if (progress) progress.style.transform = `scaleX(${maximum > 0 ? Math.min(1, scrollY / maximum) : 0})`;
    let active = 'solutions';
    for (const section of sections) if (section.getBoundingClientRect().top < innerHeight * .45) active = section.id;
    if (scrollY + innerHeight >= document.documentElement.scrollHeight - 80) active = 'contact';
    document.body.classList.toggle('contact-visible', active === 'contact');
    dockLinks.forEach(link => link.setAttribute('aria-current', String(link.hash === '#' + active)));
  }
  const queue = () => { if (!frame) frame = requestAnimationFrame(update); };
  addEventListener('scroll', queue, { passive: true });
  addEventListener('resize', queue, { passive: true });
  update();
  // Native history and anchor semantics are retained; no custom back/up/down controls.
  document.addEventListener('click', event => {
    if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    const link = event.target.closest('a[href^="#"]');
    if (!link || link.target || link.hasAttribute('download')) return;
    let id;
    try { id = decodeURIComponent(link.hash.slice(1)); } catch { return; }
    const target = document.getElementById(id);
    if (!target) return;
    event.preventDefault();
    const distance = Math.abs(target.getBoundingClientRect().top);
    const navigate = () => {
      if (location.hash !== link.hash) history.pushState(null, '', link.hash);
      const nav = document.querySelector('.nav');
      const offset = nav ? nav.getBoundingClientRect().bottom + 20 : 88;
      const top = target.id === 'top' ? 0 : Math.max(0, scrollY + target.getBoundingClientRect().top - offset);
      scrollTo({ top, behavior: reduced.matches || distance > innerHeight * 1.5 ? 'instant' : 'smooth' });
      if (!target.hasAttribute('tabindex')) target.setAttribute('tabindex', '-1');
      target.focus({ preventScroll: true });
    };
    // Short crossfade for distant chapters; supported browsers handle it natively.
    if (!reduced.matches && distance > innerHeight * 1.5 && document.startViewTransition) document.startViewTransition(navigate);
    else navigate();
  });
  if (!window.gsap || !window.ScrollTrigger) return;
  gsap.registerPlugin(ScrollTrigger);
  const paragraphOriginals = new Map([...document.querySelectorAll('.premium-text')].map(p => [p, p.textContent]));
  const media = gsap.matchMedia();
  media.add('(prefers-reduced-motion: no-preference)', () => {
    gsap.from('.hero > :is(.eyebrow,h1,.lead,.actions,.hero-subnote)', { y: 56, autoAlpha: 0, duration: 1.35, stagger: .16, ease: 'power3.out', clearProps: 'all' });
    // Keep the headline steady after its entrance; only one animation owns it.
    document.querySelectorAll('.section h2').forEach(heading => {
      if (heading.closest('.cinematic-scene')) return;
      gsap.fromTo(heading, { y: 48, opacity: .12 }, { y: 0, opacity: 1, duration: 1.05, ease: 'power3.out', scrollTrigger: { trigger: heading, start: 'top 91%', once: true } });
    });
    document.querySelectorAll('.sales-solutions-grid,.sales-offers-grid,.premium-process,.services-grid,.engineering-grid').forEach(grid => {
      [...grid.children].forEach((card, index) => {
        gsap.fromTo(card, { y: 44, opacity: .15 }, { y: 0, opacity: 1, duration: .95, delay: innerWidth >= 900 ? (index % 3) * .1 : 0, ease: 'power3.out', clearProps: 'transform,opacity', scrollTrigger: { trigger: card, start: 'top 90%', once: true } });
      });
    });
    document.querySelectorAll('.project.case .case-copy').forEach(copy => {
      gsap.fromTo(copy, { y: 38, opacity: .2 }, { y: 0, opacity: 1, duration: 1, ease: 'power3.out', clearProps: 'all', scrollTrigger: { trigger: copy, start: 'top 90%', once: true } });
    });
    document.querySelectorAll('.project.case > :is(.cat-visual,.site-visual,.form-visual,.pay-visual,.guide-visual,.creative-visual)').forEach(visual => {
      gsap.fromTo(visual, { opacity: .35 }, { opacity: 1, duration: .8, ease: 'power2.out', scrollTrigger: { trigger: visual, start: 'top 92%', once: true } });
    });
    document.querySelectorAll('.premium-text').forEach(paragraph => {
      const original = paragraphOriginals.get(paragraph);
      const accessible = document.createElement('span'); accessible.className = 'premium-sr-only'; accessible.textContent = original;
      paragraph.replaceChildren(accessible, ...original.trim().split(/\s+/).flatMap(word => {
        const span = document.createElement('span'); span.className = 'word'; span.textContent = word; span.setAttribute('aria-hidden', 'true');
        return [span, document.createTextNode(' ')];
      }));
      gsap.fromTo(paragraph.querySelectorAll('.word'), { opacity: .25 }, { opacity: 1, stagger: .08, ease: 'none', scrollTrigger: { trigger: paragraph, start: 'top 85%', end: 'bottom 48%', scrub: .4 } });
    });
    const scene = document.querySelector('.cinematic-scene');
    if (scene) {
      const film = gsap.timeline({ scrollTrigger: { trigger: scene, start: 'top 90%', end: 'center center', scrub: .7 } });
      film.fromTo(scene.querySelector('.cinematic-video'), { scale: 1.06 }, { scale: 1, ease: 'none' }, 0);
      film.fromTo(scene.querySelector('.cinematic-content'), { y: 24, opacity: .5 }, { y: 0, opacity: 1, ease: 'none' }, 0);
    }
    return () => {
      paragraphOriginals.forEach((text, paragraph) => { paragraph.textContent = text; });
    };
  });
  // Refresh geometry after locally hosted media has resolved.
  const refresh = gsap.delayedCall(.2, () => ScrollTrigger.refresh()).pause();
  document.querySelectorAll('img').forEach(img => { if (!img.complete) img.addEventListener('load', () => refresh.restart(true), { once: true }); });
})();
