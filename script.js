// Tut Bend Effect — scroll-driven frame sequence
// Playback is a pure function of scroll position:
//   scroll down  -> frames advance (screen rolls away, button revealed)
//   scroll up    -> frames reverse (screen rolls back, button hidden)

const FIRST = 81, LAST = 204;
const TOTAL = LAST - FIRST + 1;        // 124 frames
const DIR = "frames/";
const EXT = ".webp";
const ALPHA_START = 181;               // first frame with transparency
const REVEAL = (ALPHA_START - FIRST) / (TOTAL - 1); // scroll progress where alpha begins

const canvas = document.getElementById("frameCanvas");
const ctx = canvas.getContext("2d");
const stage = document.getElementById("stage");
const hint = document.getElementById("scrollHint");
const bar = document.getElementById("progressBar");
const dlBehind = document.getElementById("dlBehind");

const cache = new Map();
let current = -1;
let requested = -1;

function frameUrl(n) {
  return DIR + String(n).padStart(4, "0") + EXT;
}

function loadFrame(n) {
  if (cache.has(n)) return Promise.resolve(cache.get(n));
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.decoding = "async";
    img.onload = () => { cache.set(n, img); resolve(img); };
    img.onerror = () => reject(new Error("failed " + n));
    img.src = frameUrl(n);
  });
}

function draw(n) {
  const img = cache.get(n);
  if (!img) return;
  ctx.clearRect(0, 0, canvas.width, canvas.height); // keep alpha (transparent = button shows)
  ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
  current = n;
}

// progress 0..1 across the dedicated scroll-space
function progress() {
  const spacer = document.querySelector(".scroll-space");
  if (!spacer) return 0;
  const rect = spacer.getBoundingClientRect();
  const total = rect.height - window.innerHeight;
  if (total <= 0) return 0;
  return Math.min(1, Math.max(0, -rect.top / total));
}

function frameFromProgress(p) {
  return FIRST + Math.round(p * (TOTAL - 1));
}

let ticking = false;
function onScroll() {
  if (ticking) return;
  ticking = true;
  requestAnimationFrame(() => {
    ticking = false;
    const p = progress();
    const target = frameFromProgress(p);

    bar.style.width = (p * 100).toFixed(1) + "%";

    // reveal/hide the download button through the alpha tear
    const shown = p >= REVEAL * 0.92;
    dlBehind.classList.toggle("ready", shown);
    const cap = document.getElementById("caption");
    if (cap) cap.style.opacity = shown ? "0" : "";

    if (progress() > 0.03) hint.style.opacity = "0";
    else hint.style.opacity = "";

    if (target !== current) {
      if (cache.has(target)) {
        draw(target);
      } else {
        requested = target;
        loadFrame(target).then(() => { if (requested === target) draw(target); }).catch(() => {});
      }
    }
  });
}

window.addEventListener("scroll", onScroll, { passive: true });

// Preload strategically: first frame, then the reveal frames, then the rest.
async function preload() {
  await loadFrame(FIRST);
  draw(FIRST);
  const burst = [];
  for (let i = 0; i < 10; i++) burst.push(loadFrame(FIRST + i));
  // reveal neighborhood (where the tear opens)
  for (let n = ALPHA_START; n <= Math.min(ALPHA_START + 8, LAST); n++) burst.push(loadFrame(n));
  await Promise.all(burst);
  // remaining frames at low priority
  for (let n = FIRST; n <= LAST; n++) {
    if (!cache.has(n)) await loadFrame(n);
  }
}
preload().then(onScroll);
window.addEventListener("resize", onScroll);
