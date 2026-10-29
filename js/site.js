// Бейт — поведение сайта: интро, шапка, появление блоков, параллакс, бегущая строка, меню из data/menu.json

const root = document.documentElement;
const header = document.querySelector('.site-header');
const burger = document.querySelector('.burger');
const heroLogo = document.querySelector('.hero-logo');
const calm = matchMedia('(prefers-reduced-motion: reduce)').matches;
const wait = ms => new Promise(r => setTimeout(r, ms));

// ссылки по странице: закрываем мобильное меню, остальное делает браузер (scroll-behavior в CSS)
document.addEventListener('click', e => {
  const a = e.target.closest('a[href^="#"]');
  if (!a) return;
  setMenu(false);
  if (a.getAttribute('href') === '#top') {
    e.preventDefault();
    scrollTo({ top: 0, behavior: calm ? 'auto' : 'smooth' });
  }
});

// появление блоков при скролле
const reveal = new IntersectionObserver(entries => {
  entries.forEach(e => {
    if (!e.isIntersecting) return;
    e.target.classList.add('is-in');
    reveal.unobserve(e.target);
  });
}, { rootMargin: '0px 0px -8% 0px' });
const observeReveal = scope => scope.querySelectorAll('[data-reveal]:not(.is-in)').forEach(el => reveal.observe(el));

// интро: логотип проявляется на шторке, затем перелетает в первый экран и становится терракотовым
const intro = document.querySelector('.intro');
const runIntro = async () => {
  const logo = intro.querySelector('.intro-logo');
  history.scrollRestoration = 'manual';
  scrollTo(0, 0);

  // большой логотип сразу ставим в финальное состояние, он скрыт до приземления
  heroLogo.querySelector('svg').style.transition = 'none';
  heroLogo.classList.add('is-in');
  const r = heroLogo.getBoundingClientRect();
  const s = Math.min(400, innerWidth * 0.66) / r.width;
  logo.style.width = `${r.width}px`;
  logo.style.transform = `translate(${(innerWidth - r.width * s) / 2}px, ${(innerHeight - r.height * s) / 2}px) scale(${s})`;
  intro.classList.add('is-ready');

  // пока логотип проявляется, заранее декодируем фото первого экрана — иначе на посадке будет рывок
  const heroImg = document.querySelector('.hero-photo img');
  await Promise.all([wait(1350), heroImg.decode().catch(() => {})]);
  intro.classList.add('is-landing');
  logo.style.transform = `translate(${r.left}px, ${r.top}px) scale(1)`;

  // шторку снимаем, только когда логотип встал на место: по таймеру он иногда «прыгал» в конце
  await new Promise(done => {
    logo.addEventListener('transitionend', e => e.propertyName === 'transform' && done());
    setTimeout(done, 2000);
  });
  root.classList.remove('intro-on');
  intro.remove();
  // фото и текст первого экрана появляются после посадки логотипа и через пару кадров,
  // чтобы тяжёлая отрисовка фото не совпала с моментом подмены логотипа
  requestAnimationFrame(() => requestAnimationFrame(() => observeReveal(document)));
};
if (root.classList.contains('intro-on')) runIntro();
else {
  intro.remove();
  observeReveal(document);
}

// подсветка текущего раздела в навигации
const navLinks = [...document.querySelectorAll('.nav a')];
const setCurrent = id => navLinks.forEach(a => {
  if (a.hash === `#${id}`) a.setAttribute('aria-current', 'true');
  else a.removeAttribute('aria-current');
});
const spy = new IntersectionObserver(entries => {
  entries.forEach(e => e.isIntersecting && setCurrent(e.target.id));
}, { rootMargin: '-45% 0px -50% 0px' });
navLinks.forEach(a => {
  const section = document.querySelector(a.hash);
  if (section) spy.observe(section);
});

// маленький логотип в шапке появляется, когда большой ушёл из кадра
new IntersectionObserver(([e]) => header.classList.toggle('show-brand', !e.isIntersecting), { rootMargin: '-60px 0px 0px 0px' })
  .observe(heroLogo);

// мобильное меню
function setMenu(open) {
  root.classList.toggle('menu-open', open);
  burger.setAttribute('aria-expanded', open);
  burger.setAttribute('aria-label', open ? 'Закрыть меню' : 'Открыть меню');
  document.body.style.overflow = open ? 'hidden' : '';
  if (open) header.classList.remove('is-hidden');
}
burger.addEventListener('click', () => setMenu(!root.classList.contains('menu-open')));
addEventListener('keydown', e => e.key === 'Escape' && setMenu(false));

// бегущая строка: едет сама, ускоряется и разворачивается вслед за скроллом
const marquee = document.querySelector('.marquee');
const track = marquee.querySelector('.marquee-track');
let mx = 0, dir = 1, boost = 0, marqueeOn = false, hover = false;
let half = track.scrollWidth / 2;
addEventListener('resize', () => { half = track.scrollWidth / 2; });
document.fonts?.ready.then(() => { half = track.scrollWidth / 2; });
new IntersectionObserver(([e]) => { marqueeOn = e.isIntersecting; }).observe(marquee);
marquee.addEventListener('pointerenter', () => { hover = true; });
marquee.addEventListener('pointerleave', () => { hover = false; });

// параллакс фото и дрейф карточек галереи
const parallax = [...document.querySelectorAll('[data-parallax]')].map(el => ({ el, img: el.querySelector('img'), k: parseFloat(el.dataset.parallax) }));
const drift = [...document.querySelectorAll('[data-drift]')].map(el => ({ el, px: parseFloat(el.dataset.drift) }));
const progress = el => {
  const r = el.getBoundingClientRect();
  if (r.bottom < -100 || r.top > innerHeight + 100) return null;
  return (r.top + r.height / 2 - innerHeight / 2) / (innerHeight + r.height);
};

let lastY = scrollY;
let lastT = performance.now();
const frame = t => {
  const dt = Math.min(64, t - lastT);
  lastT = t;

  const y = scrollY;
  const dy = y - lastY;
  if (dy !== 0) {
    header.classList.toggle('is-scrolled', y > 24);
    if (!root.classList.contains('menu-open')) {
      if (dy > 2 && y > innerHeight * 0.8) header.classList.add('is-hidden');
      if (dy < -2) header.classList.remove('is-hidden');
    }
    if (y < innerHeight * 0.4) setCurrent(null);
    if (!calm) {
      dir = dy > 0 ? 1 : -1;
      boost = Math.min(boost + Math.abs(dy) * 0.35, 18);
    }
  }
  lastY = y;

  if (!calm) {
    parallax.forEach(({ img, el, k }) => {
      const p = progress(el);
      if (p !== null) img.style.translate = `0 ${(p * k * -100).toFixed(2)}%`;
    });
    if (innerWidth > 860) drift.forEach(({ el, px }) => {
      const p = progress(el);
      if (p !== null) el.style.translate = `0 ${(p * px).toFixed(1)}px`;
    });
    if (marqueeOn) {
      mx -= ((hover ? 0.12 : 0.55) + boost) * dir * (dt / 16);
      if (mx <= -half) mx += half;
      if (mx > 0) mx -= half;
      track.style.transform = `translate3d(${mx.toFixed(2)}px, 0, 0)`;
    }
    boost *= 0.92;
  }
  requestAnimationFrame(frame);
};
header.classList.toggle('is-scrolled', scrollY > 24);
requestAnimationFrame(frame);

// меню напитков с вкладками
const TAGS = { warm: 'тёплый', cold: 'холодный' };
// колонки доски меню; на телефоне они идут одна под другой
const LAYOUT = [['signature'], ['nostalgia'], ['classic', 'other'], ['cezve', 'extras']];
const desktop = matchMedia('(min-width: 861px)');
const TABS = [
  { id: 'all', label: 'Всё меню' },
  { id: 'signature', label: 'Авторские' },
  { id: 'nostalgia', label: 'Аромат ностальгии' },
  { id: 'classic', label: 'Классика' },
  { id: 'cezve', label: 'В турке' },
  { id: 'other', label: 'Разное' },
];
const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

const renderSection = s => `
  <div class="menu-cat">
    <h3><i class="mark-x"></i>${esc(s.title)}</h3>
    ${s.items.map((it, i) => `
      <div class="item" style="--i:${i}">
        <span class="n">${esc(it.name)}${it.tag ? `<span class="tag">${TAGS[it.tag]}</span>` : ''}</span>
        <span class="v">${(it.volume || []).join(' / ')}</span>
        <span class="p">${it.price.join(' / ')}</span>
        ${it.desc ? `<span class="d">${esc(it.desc)}</span>` : ''}
      </div>`).join('')}
  </div>`;

fetch('data/menu.json')
  .then(r => r.json())
  .then(menu => {
    const grid = document.getElementById('menu-grid');
    const tabs = document.getElementById('menu-tabs');
    const byId = id => menu.sections.find(s => s.id === id);
    const column = ids => `<div class="menu-col">${ids.map(byId).filter(Boolean).map(renderSection).join('')}</div>`;

    const show = id => {
      grid.innerHTML = id === 'all' ? LAYOUT.map(column).join('') : column([id]);
      grid.classList.toggle('is-single', id !== 'all');
      tabs.querySelectorAll('button').forEach(b => b.setAttribute('aria-pressed', b.dataset.id === id));
    };
    // на компьютере вкладок нет, всегда видно всё меню
    desktop.addEventListener('change', e => e.matches && show('all'));

    tabs.innerHTML = TABS.map(t => `<button type="button" data-id="${t.id}" aria-pressed="false">${t.label}</button>`).join('');
    tabs.addEventListener('click', async e => {
      const btn = e.target.closest('button');
      if (!btn || btn.getAttribute('aria-pressed') === 'true') return;
      if (calm) return show(btn.dataset.id);
      grid.classList.add('is-fading');
      await wait(300);
      grid.classList.add('is-switching');
      show(btn.dataset.id);
      grid.classList.remove('is-fading');
      await wait(1200);
      grid.classList.remove('is-switching');
    });
    show('all');
  });
