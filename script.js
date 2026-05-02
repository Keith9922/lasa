/* ===========================================
   翼をください — Interactions
   =========================================== */

// ---------- 飘动羽毛 ----------
const featherChars = ['𓆩', '✦', '◌', '𓆪', '·', '✧'];
const featherContainer = document.getElementById('feathers');
const FEATHER_COUNT = 14;

for (let i = 0; i < FEATHER_COUNT; i++) {
  const f = document.createElement('span');
  f.className = 'feather';
  f.textContent = featherChars[Math.floor(Math.random() * featherChars.length)];
  f.style.left = Math.random() * 100 + 'vw';
  f.style.fontSize = (14 + Math.random() * 18) + 'px';
  f.style.animationDuration = (16 + Math.random() * 18) + 's';
  f.style.animationDelay = -(Math.random() * 24) + 's';
  f.style.opacity = 0.5 + Math.random() * 0.5;
  featherContainer.appendChild(f);
}

// ---------- 导航滚动状态 ----------
const nav = document.querySelector('.nav');
let lastScroll = 0;

window.addEventListener('scroll', () => {
  const y = window.scrollY;
  if (y > 60) nav.classList.add('scrolled');
  else nav.classList.remove('scrolled');
  lastScroll = y;
}, { passive: true });

// ---------- 滚动进入动画 ----------
const revealEls = document.querySelectorAll(
  '.section-head, .about-grid, .work-card, .letter-paper'
);
revealEls.forEach((el) => el.classList.add('reveal'));

const io = new IntersectionObserver(
  (entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        entry.target.classList.add('in');
        io.unobserve(entry.target);
      }
    });
  },
  { threshold: 0.15, rootMargin: '0px 0px -60px 0px' }
);
revealEls.forEach((el) => io.observe(el));

// ---------- 音乐播放器 ----------
const musicWrap = document.getElementById('musicWrap');
const musicToggle = document.getElementById('musicToggle');
const musicFrame = document.getElementById('musicFrame');
const MUSIC_SRC =
  'https://music.163.com/outchain/player?type=2&id=2163191091&auto=1&height=66';

let musicVisible = false;
let musicLoaded = false;

function loadMusic() {
  if (musicLoaded) return;
  musicFrame.src = MUSIC_SRC;
  musicLoaded = true;
  musicToggle.classList.add('active');
}

musicToggle.addEventListener('click', () => {
  if (!musicLoaded) loadMusic();
  musicVisible = !musicVisible;
  musicWrap.classList.toggle('show', musicVisible);
});

// ---------- 入口门：点击后解锁音频自动播放 ----------
const enterGate = document.getElementById('enterGate');
const enterBtn = document.getElementById('enterBtn');

enterBtn.addEventListener('click', () => {
  loadMusic();
  enterGate.classList.add('hide');
  setTimeout(() => {
    enterGate.style.display = 'none';
  }, 1500);
});

// ---------- 平滑导航锚点 ----------
document.querySelectorAll('.nav-links a').forEach((a) => {
  a.addEventListener('click', (e) => {
    const href = a.getAttribute('href');
    if (href && href.startsWith('#')) {
      e.preventDefault();
      const target = document.querySelector(href);
      if (target) {
        target.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    }
  });
});

// ---------- 鼠标移动微视差 ----------
const portraitCircle = document.querySelector('.portrait-circle');
window.addEventListener('mousemove', (e) => {
  const x = (e.clientX / window.innerWidth - 0.5) * 14;
  const y = (e.clientY / window.innerHeight - 0.5) * 14;
  if (portraitCircle) {
    portraitCircle.style.transform = `translate(${x}px, ${y}px)`;
  }
});

// ---------- 控制台彩蛋 ----------
console.log(
  '%c翼をください',
  'font-family: "Noto Serif JP", serif; font-size: 28px; color: #4a6b88; letter-spacing: 0.4em;'
);
console.log(
  '%cこの大空に　翼をひろげ\n飛んで行きたいよ\n— 願你也擁有屬於自己的天空 —',
  'font-family: serif; font-size: 13px; color: #5b6c7d; line-height: 1.8;'
);
