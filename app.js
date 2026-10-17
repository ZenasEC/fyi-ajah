/* THE PAGE, well log. One rAF loop: the depth gauge, the ruler and the bit,
   the two marquee bands, the permit card's exit from the surface, entrance
   reveals, counted numerals, the running chips, and the console's deadpan
   status line. Transform and opacity only; a reduced-motion fallback that
   keeps every number. */
(() => {
  "use strict";

  const html = document.documentElement;
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));

  const clamp01 = (v) => (v < 0 ? 0 : v > 1 ? 1 : v);
  const smooth = (a, b, x) => { const t = clamp01((x - a) / (b - a)); return t * t * (3 - 2 * t); };
  const easeOut = (t) => 1 - Math.pow(1 - t, 3);
  const nf = (n, d = 0) => n.toLocaleString("en-US", { minimumFractionDigits: d, maximumFractionDigits: d });

  const mqReduce = matchMedia("(prefers-reduced-motion: reduce)");
  let reduced = mqReduce.matches;
  mqReduce.addEventListener?.("change", (e) => {
    reduced = e.matches;
    if (reduced) resetMotion();
  });

  /* ---------- instruments ---------- */

  const gaugeNum = $("#gauge-num");
  const gaugeUnit = $("#gauge-unit");
  const gaugeStatus = $("#gauge-status");
  const rulerTicks = $("#ruler-ticks");
  const rulerBit = $("#ruler-bit");

  const TICKS = 32;
  for (let i = 0; i < TICKS; i++) {
    const t = document.createElement("i");
    t.className = "ruler__tick";
    rulerTicks.appendChild(t);
  }
  const ticks = $$(".ruler__tick", rulerTicks);

  /* ---------- the page's parts ---------- */

  const secs = $$("[data-depth]").map((el) => ({
    el,
    depth: el.dataset.depth === "inf" ? Infinity : parseFloat(el.dataset.depth),
    ink: el.dataset.ink || "dark",
    status: el.dataset.status || "",
    top: 0,
    h: 1,
  }));
  const hero = $(".hero");
  const heroPin = $(".hero__pin");
  const heroPhoto = $("#hero-photo");
  const heroTitle = $("#hero-title");
  const card = $("#permit");
  const bands = $$(".band").map((el) => ({
    el,
    track: $(".band__track", el),
    words: $$(".band__word", el).map((w) => ({ el: w, cx: 0 })),
    top: 0,
    h: 1,
    travel: 0,
  }));
  const counters = $$("[data-count]");
  const chips = $$("[data-left]").map((el) => ({ el, sec: el.closest("[data-depth]"), top: 0, last: "" }));
  const fields = $$(".s--bg").map((el) => ({
    el,
    img: $(".s__bg img", el),
    seam: $(".s__bg", el),
    top: 0,
    h: 1,
    ty: 1e9,
    sx: -1,
  }));
  const gaugeEl = $(".gauge");

  let docH = 1, vh = innerHeight, vw = innerWidth;
  let heroH = 1, pinH = 1, cardX = 0, cardY = 0, cardH = 1;
  let tickTop = 0, tickTravel = 1;

  const measure = () => {
    vh = innerHeight;
    vw = innerWidth;
    const y = scrollY;
    docH = Math.max(html.scrollHeight, document.body.scrollHeight);
    for (const s of secs) {
      const r = s.el.getBoundingClientRect();
      s.top = r.top + y;
      s.h = Math.max(1, r.height);
    }
    heroH = hero.offsetHeight;
    pinH = heroPin.clientHeight || vh;
    cardX = card.offsetLeft;
    cardY = card.offsetTop;
    cardH = card.offsetHeight;
    tickTop = rulerTicks.offsetTop;
    tickTravel = Math.max(1, rulerTicks.offsetHeight - 16);
    for (const b of bands) {
      const r = b.el.getBoundingClientRect();
      b.top = r.top + y;
      b.h = Math.max(1, r.height);
      b.travel = Math.max(0, b.track.scrollWidth - vw);
      for (const w of b.words) w.cx = w.el.offsetLeft + w.el.offsetWidth / 2;
    }
    for (const c of chips) c.top = c.el.getBoundingClientRect().top + y;
    for (const f of fields) {
      const r = f.el.getBoundingClientRect();
      f.top = r.top + y;
      f.h = Math.max(1, r.height);
      f.ty = 1e9;
      f.sx = -1;
    }
  };

  const resetMotion = () => {
    for (const el of [card, heroTitle, heroPhoto]) {
      el.style.transform = "";
      el.style.opacity = "";
    }
    for (const b of bands) {
      b.track.style.transform = "";
      for (const w of b.words) w.el.style.opacity = "";
    }
    for (const f of fields) {
      f.seam.style.removeProperty("--seam");
      if (f.img) f.img.style.transform = "";
    }
    rulerBit.style.transform = "";
  };

  /* ---------- entrance reveals and counted numerals ---------- */

  const runCount = (el) => {
    const v = el.querySelector(".v");
    if (!v) return;
    const target = parseFloat(el.dataset.count);
    const dec = parseInt(el.dataset.decimals || "0", 10);
    if (reduced) { v.textContent = nf(target, dec); return; }
    const t0 = performance.now();
    const dur = 1000;
    const step = (now) => {
      const t = clamp01((now - t0) / dur);
      v.textContent = nf(target * easeOut(t), dec);
      if (t < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  };

  const seen = new WeakSet();
  const io = new IntersectionObserver((list) => {
    for (const e of list) {
      if (!e.isIntersecting) continue;
      const t = e.target;
      t.classList.add("is-in");
      if (t.hasAttribute("data-count") && !seen.has(t)) { seen.add(t); runCount(t); }
      io.unobserve(t);
    }
  }, { rootMargin: "0px 0px -10% 0px" });
  for (const el of new Set([...$$("[data-rise]"), ...$$(".shutter"), ...counters])) io.observe(el);

  /* ---------- the console's vocabulary ---------- */

  const FAST = [
    "slow down. the rock cannot keep up.",
    "this is not a race. this is a page.",
    "no hurry. there are 6,371 kilometres of it.",
  ];
  const IDLE = [
    "you stopped. he is patient.",
    "you stopped. the page keeps time.",
    "you stopped. everything down here is slow anyway.",
  ];
  let key = "", lastIdx = -1, lastIdxPulse = -1, fastN = 0, idleN = 0;

  /* ---------- the wind ---------- */
  let wind = 0, windState = "none", windT0 = 0;

  /* ---------- loop state ---------- */
  let lastY = scrollY, lastMove = performance.now(), ema = 0;
  let lastDepthTxt = "", lastUnitTxt = "", lastInk = "", lastPassed = -1, lastBit = -1e9;

  const setStatus = (txt) => {
    if (gaugeStatus.textContent === txt) return;
    gaugeStatus.textContent = txt;
    if (!reduced) {
      gaugeStatus.classList.remove("is-swap");
      void gaugeStatus.offsetWidth;
      gaugeStatus.classList.add("is-swap");
    }
  };

  const frame = (now) => {
    requestAnimationFrame(frame);

    const y = scrollY;
    const dy = y - lastY;
    if (dy !== 0) { lastY = y; lastMove = now; }
    ema = dy !== 0 ? ema * 0.65 + Math.abs(dy) * 0.35 : ema * 0.82;

    /* where are we: the section under the middle of the screen */
    const probe = y + vh * 0.5;
    let idx = 0;
    for (let i = 1; i < secs.length; i++) { if (secs[i].top <= probe) idx = i; else break; }
    const cur = secs[idx];
    const nxt = secs[idx + 1];

    /* depth, interpolated between landmarks */
    let depth = cur.depth;
    if (isFinite(depth) && nxt && isFinite(nxt.depth) && nxt.top > cur.top) {
      const t = clamp01((probe - cur.top) / (nxt.top - cur.top));
      depth = cur.depth + (nxt.depth - cur.depth) * t;
    }
    let txt, unit;
    if (!isFinite(depth)) { txt = "\u221E"; unit = "m"; }
    else if (depth < 1000) { txt = String(Math.round(depth)); unit = "m"; }
    else if (depth < 100000) { txt = String(+((depth / 1000).toFixed(1))); unit = "km"; }
    else { txt = nf(Math.round(depth / 1000)); unit = "km"; }
    if (txt !== lastDepthTxt) { gaugeNum.textContent = txt; lastDepthTxt = txt; }
    if (unit !== lastUnitTxt) { gaugeUnit.textContent = unit; lastUnitTxt = unit; }

    /* chrome ink follows the chapter */
    if (cur.ink !== lastInk) { html.dataset.ink = cur.ink; lastInk = cur.ink; }

    /* the ruler, the bit, and the one-time headwind */
    const p = clamp01(docH > vh ? y / (docH - vh) : 0);
    if (windState === "none" && p > 0.45) { windState = "active"; windT0 = now; }
    if (windState === "active" && now - windT0 >= 2900) windState = "passed";
    if (windState === "active" && !reduced) {
      const t = now - windT0;
      wind = t < 600 ? -0.06 * easeOut(t / 600)
        : t < 1700 ? -0.06
        : -0.06 * (1 - easeOut((t - 1700) / 1200));
    } else wind = 0;

    if (vw > 760) {
      const passed = Math.round(clamp01(p) * TICKS);
      if (passed !== lastPassed) {
        for (let i = 0; i < TICKS; i++) ticks[i].classList.toggle("is-passed", i < passed);
        lastPassed = passed;
      }
      const bit = tickTop + (p + wind) * tickTravel;
      if (Math.abs(bit - lastBit) > 0.15) {
        rulerBit.style.transform = "translateY(" + bit.toFixed(1) + "px)";
        lastBit = bit;
      }
    }

    /* the permit card leaves the surface; the title and the photo follow it down */
    if (!reduced && y < heroH) {
      const q = clamp01(y / Math.max(1, heroH - vh));

      const e = smooth(0, 1, q);
      const s = 0.16;
      const tx = 20 - cardX;
      const ty = pinH - 24 - cardH * s - cardY;
      card.style.transform = "translate(" + (tx * e).toFixed(1) + "px, " + (ty * e).toFixed(1) +
        "px) scale(" + (1 + (s - 1) * e).toFixed(3) + ")";
      card.style.opacity = String(1 - smooth(0.62, 0.88, q));

      const t = smooth(0.3, 0.75, q);
      heroTitle.style.transform = "translateY(" + (-0.16 * vh * t).toFixed(1) + "px)";
      heroTitle.style.opacity = String(1 - smooth(0.35, 0.7, q));

      heroPhoto.style.transform = "scale(" + (1 + 0.06 * q).toFixed(4) +
        ") translateY(" + (-2 * q).toFixed(2) + "%)";
    }

    /* the marquee bands: travel sideways, brighten near the middle */
    for (const b of bands) {
      if (y + vh < b.top - vh || y > b.top + b.h + vh) continue;
      if (reduced) continue;
      const q = clamp01((y - b.top) / Math.max(1, b.h - vh));
      b.track.style.transform = "translateX(" + (-q * b.travel).toFixed(1) + "px)";
      for (const w of b.words) {
        const d = (w.cx - q * b.travel - vw / 2) / vw;
        const o = clamp01(Math.min(1, Math.max(0.12, 1.15 - Math.abs(d) * 1.9)));
        w.el.style.opacity = String(Math.max(0.12, o));
      }
    }

    /* the material fields: the pinned backdrop drifts, the bedding plane draws */
    for (const f of fields) {
      if (y > f.top + f.h + vh || y + vh * 2 < f.top) continue;
      if (reduced) continue;
      const gap = f.top - y;                                   /* the sheet's top against the viewport top */
      const enter = clamp01((vh - gap) / vh);                  /* 0 below the fold, 1 once the sheet tops out */
      const ride = clamp01((y + vh - f.top) / (f.h + vh));     /* the whole ride of the sheet */
      if (f.img) {
        const ty = (0.03 - 0.06 * ride) * 100;                 /* percent of the image height */
        const sc = 1.12 - 0.06 * enter;                        /* an arriving sheet settles */
        if (Math.abs(ty - f.ty) > 0.04) {
          f.img.style.transform = "translate3d(0," + ty.toFixed(2) + "%,0) scale(" + sc.toFixed(3) + ")";
          f.ty = ty;
        }
      }
      const sx = clamp01((vh * 0.94 - gap) / (vh * 0.46));     /* drawn while the sheet rises to mid-screen */
      if (Math.abs(sx - f.sx) > 0.01) {
        f.seam.style.setProperty("--seam", sx.toFixed(3));
        f.sx = sx;
      }
    }

    /* every stratum change ticks the gauge */
    if (idx !== lastIdxPulse) {
      if (lastIdxPulse !== -1 && !reduced) {
        gaugeEl.classList.remove("is-tick");
        void gaugeEl.offsetWidth;
        gaugeEl.classList.add("is-tick");
      }
      lastIdxPulse = idx;
    }

    /* the running chips */
    for (const c of chips) {
      if (c.top < y - vh * 0.5 || c.top > y + vh * 2.2) continue;
      const d = parseFloat(c.sec?.dataset.depth);
      if (!isFinite(d)) continue;
      const str = nf(Math.max(0, Math.round((6371000 - d) / 1000))) + " km to go";
      if (str !== c.last) { c.el.textContent = str; c.last = str; }
    }

    /* the console's line */
    let k;
    if (windState === "active") k = "wind";
    else if (windState === "passed" && now - windT0 < 6000) k = "windpass";
    else if (ema > 38 && y > 8) k = "fast";
    else if (now - lastMove > 2200 && y > 600 && !cur.status) k = "idle";
    else k = "base";
    if (k !== key || (k === "base" && idx !== lastIdx)) {
      key = k;
      lastIdx = idx;
      setStatus(
        k === "wind" ? "impossible headwind."
          : k === "windpass" ? "the wind has passed."
            : k === "fast" ? FAST[fastN++ % FAST.length]
              : k === "idle" ? IDLE[idleN++ % IDLE.length]
                : (cur.status || "keep scrolling.")
      );
    }
  };

  for (const ev of ["wheel", "touchstart", "keydown", "pointerdown"]) {
    addEventListener(ev, () => { lastMove = performance.now(); }, { passive: true });
  }

  let rT;
  const onResize = () => { clearTimeout(rT); rT = setTimeout(measure, 120); };
  addEventListener("resize", onResize, { passive: true });
  addEventListener("orientationchange", onResize, { passive: true });
  addEventListener("load", () => { measure(); });
  if (document.fonts?.ready) document.fonts.ready.then(() => { measure(); });

  measure();
  requestAnimationFrame(frame);
})();
