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
const DESC_END_FRAME = 188;            // description panel fully gone from here on
const DESC_END = (DESC_END_FRAME - FIRST) / (TOTAL - 1); // ~0.87

const canvas = document.getElementById("frameCanvas");
const ctx = canvas.getContext("2d");
const stage = document.getElementById("stage");
const hint = document.getElementById("scrollHint");
const bar = document.getElementById("progressBar");
const dlBehind = document.getElementById("dlBehind");
const descPanel = document.getElementById("descPanel");

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

    // glass description panel: drifts up with scroll, fully gone by DESC_END (~frame 188)
    if (descPanel) {
      if (p <= 0.005) {
        descPanel.style.transform = "";
        descPanel.style.opacity = "";
      } else {
        const t = Math.min(1, p / DESC_END);      // 0..1 across the panel's lifetime
        // travel a bit more than its own height so it fully exits the top
        const travel = descPanel.offsetHeight + 80;
        descPanel.style.transform = "translate3d(0," + (-(t * travel)).toFixed(1) + "px,0)";
        // fade out over the last 25% of its travel
        const fade = t > 0.75 ? Math.max(0, 1 - (t - 0.75) / 0.25) : 1;
        descPanel.style.opacity = fade.toFixed(3);
      }
    }

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

/* ---------- follow gate: unlock download only after both channels are opened ---------- */
(function () {
  const dlBehind = document.getElementById("dlBehind");
  const modal = document.getElementById("gateModal");
  const closeBtn = document.getElementById("gateClose");
  const yt = document.getElementById("followYt");
  const ig = document.getElementById("followIg");
  const modalDl = document.getElementById("modalDownload");
  const note = document.getElementById("gateNote");
  const dlSub = document.getElementById("modalDlSub");

  const state = { yt: false, ig: false };

  // key used to remember the user already unlocked it (same browser)
  const STORAGE_KEY = "tutbend.followed";

  function refresh() {
    const done = state.yt && state.ig;
    document.getElementById("stateYt").textContent = state.yt ? "Following" : "Follow";
    document.getElementById("stateIg").textContent = state.ig ? "Following" : "Follow";
    yt.classList.toggle("done", state.yt);
    ig.classList.toggle("done", state.ig);
    modalDl.classList.toggle("unlocked", done);
    const n = (state.yt ? 1 : 0) + (state.ig ? 1 : 0);
    note.textContent = done ? "Unlocked — thank you!" : n + " of 2 done";
    note.classList.toggle("ready", done);
    dlSub.textContent = done ? "tut_bend_effect.zip · 133 KB · Blender 5.2+" : "Follow both channels to unlock";
    if (done) {
      try { localStorage.setItem(STORAGE_KEY, "1"); } catch (e) {}
    }
    return done;
  }

  function openGate(e) {
    // allow direct download if already unlocked before
    let already = false;
    try { already = localStorage.getItem(STORAGE_KEY) === "1"; } catch (e) {}
    if (already) return; // let the anchor download normally
    if (e) e.preventDefault();
    modal.hidden = false;
    refresh();
  }

  function closeGate() { modal.hidden = true; }

  dlBehind.addEventListener("click", openGate);
  closeBtn.addEventListener("click", closeGate);
  modal.addEventListener("click", (e) => { if (e.target === modal) closeGate(); });
  document.addEventListener("keydown", (e) => { if (e.key === "Escape") closeGate(); });

  yt.addEventListener("click", () => { state.yt = true; refresh(); });
  ig.addEventListener("click", () => { state.ig = true; refresh(); });

  // when unlocked inside the modal, allow the real download and close
  modalDl.addEventListener("click", (e) => {
    if (!state.yt || !state.ig) { e.preventDefault(); return; } // still locked, block download
    closeGate();
    // after unlocking once, the behind-canvas button downloads directly
    try { localStorage.setItem(STORAGE_KEY, "1"); } catch (e) {}
  });
})();
