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
    const target = document.getElementById(link.hash.slice(1));
    if (!target) return;
    event.preventDefault();
    const distance = Math.abs(target.getBoundingClientRect().top);
    const navigate = () => {
      history.pushState(null, '', link.hash);
      target.scrollIntoView({ behavior: reduced.matches || distance > innerHeight * 1.5 ? 'instant' : 'smooth', block: 'start' });
      if (!target.hasAttribute('tabindex')) target.setAttribute('tabindex', '-1');
      target.focus({ preventScroll: true });
    };
    // Short crossfade for distant chapters; supported browsers handle it natively.
    if (!reduced.matches && distance > innerHeight * 1.5 && document.startViewTransition) document.startViewTransition(navigate);
    else navigate();
  });
  if (!window.gsap || !window.ScrollTrigger) return;
  gsap.registerPlugin(ScrollTrigger);
  const media = gsap.matchMedia();
  media.add('(prefers-reduced-motion: no-preference)', () => {
    gsap.from('.hero > :is(.eyebrow,h1,.lead,.actions,.hero-subnote)', { y: 20, autoAlpha: 0, duration: 1, stagger: .1, ease: 'power3.out', clearProps: 'all' });
    document.querySelectorAll('.premium-text').forEach(paragraph => {
      const original = paragraph.textContent;
      paragraph.setAttribute('aria-label', original);
      paragraph.replaceChildren(...original.trim().split(/\s+/).flatMap(word => {
        const span = document.createElement('span'); span.className = 'word'; span.textContent = word; span.setAttribute('aria-hidden', 'true');
        return [span, document.createTextNode(' ')];
      }));
      gsap.fromTo(paragraph.querySelectorAll('.word'), { opacity: .25 }, { opacity: 1, stagger: .08, ease: 'none', scrollTrigger: { trigger: paragraph, start: 'top 85%', end: 'bottom 48%', scrub: .4 } });
    });
    const desktop = gsap.matchMedia();
    desktop.add('(min-width: 900px)', () => {
      document.querySelectorAll('.project.case > :is(.cat-visual,.site-visual,.form-visual,.pay-visual,.guide-visual,.creative-visual)').forEach(visual => {
        gsap.fromTo(visual, { scale: .97 }, { scale: 1, ease: 'none', scrollTrigger: { trigger: visual, start: 'top bottom', end: 'center center', scrub: .6 } });
      });
    });
    return () => desktop.revert();
  });
  // Refresh geometry after locally hosted media has resolved.
  document.querySelectorAll('img').forEach(img => { if (!img.complete) img.addEventListener('load', () => ScrollTrigger.refresh(), { once: true }); });
})();
