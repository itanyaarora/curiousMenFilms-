// ===== Accessibility: reduced motion detection =====
// Single source of truth for JS animations that should be disabled
// when the user has set `prefers-reduced-motion: reduce` at the OS
// level. Mouse-parallax, particle effects, and scroll-driven visual
// extras check this before doing work.
const prefersReducedMotion = window.matchMedia
  ? window.matchMedia('(prefers-reduced-motion: reduce)').matches
  : false;

// ===== Responsive: narrow-width detection =====
// Below 900px we switch from "pinned/sticky scroll-driven" desktop
// layouts to normal-flow stacked mobile layouts. The CSS handles the
// visual rearrangement; JS scroll handlers check this flag and no-op
// (or clear any inline transforms/opacity they may have written earlier
// so a user resizing the window mid-session gets a clean layout).
const NARROW_BREAKPOINT = 900;
function isNarrow() { return window.innerWidth <= NARROW_BREAKPOINT; }


// ===== Intro Loader — Slide-up masked text =====
(function() {
  var loader = document.getElementById('swLoader');
  if (!loader) return;

  document.body.classList.add('loader-active');

  var lines = loader.querySelectorAll('.sw-line');
  var gradientEls = loader.querySelectorAll('.sw-line-gradient');

  // Animate gradient on "Curious Man" and "Films."
  var gradAnimId = null;
  var gradStart = performance.now();

  function animateGrad(now) {
    var elapsed = (now - gradStart) / 1000;
    var pos = Math.sin((elapsed / 2.5) * Math.PI * 2) * 50;
    gradientEls.forEach(function(el) {
      el.style.backgroundPosition = (50 + pos) + '% ' + (50 + pos) + '%';
    });
    gradAnimId = requestAnimationFrame(animateGrad);
  }

  // Step 1: Fade in borders
  setTimeout(function() {
    document.body.classList.add('sw-borders-active');
  }, 100);

  // Step 2: Slide lines up into view, staggered
  var stagger = 120;
  lines.forEach(function(line, i) {
    setTimeout(function() {
      line.classList.add('show');
    }, 400 + i * stagger);
  });

  // Start gradient animation
  gradAnimId = requestAnimationFrame(animateGrad);

  // Step 3: Hold, then slide lines out upward
  setTimeout(function() {
    lines.forEach(function(line, i) {
      setTimeout(function() {
        line.classList.remove('show');
        line.classList.add('hide');
      }, i * 80);
    });
  }, 2800);

  // Step 4: Fade out loader + borders
  setTimeout(function() {
    document.body.classList.remove('sw-borders-active');
    loader.classList.add('fade-out');
    document.body.classList.remove('loader-active');

    setTimeout(function() {
      cancelAnimationFrame(gradAnimId);
      loader.remove();
      document.querySelectorAll('.sw-border-top, .sw-border-right, .sw-border-bottom, .sw-border-left')
        .forEach(function(b) { b.remove(); });
    }, 900);
  }, 3400);

  // Step 5: Animate hero heading lines (slide-up, staggered) — after loader fades
  setTimeout(function() {
    var heroLines = document.querySelectorAll('.hero-line');
    var heroSub = document.getElementById('heroSub');
    var staggerDelay = 120;
    heroLines.forEach(function(line, i) {
      setTimeout(function() {
        line.classList.add('show');
      }, i * staggerDelay);
    });
    // Animate sub-paragraph after all lines
    if (heroSub) {
      setTimeout(function() {
        heroSub.classList.add('show');
      }, heroLines.length * staggerDelay + 100);
    }
  }, 3600);
})();

// ===== Hero "entrepreneurship" gradient animation =====
(function() {
  var word = document.getElementById('heroGradientWord');
  if (!word) return;

  var start = performance.now();
  function animate(now) {
    var elapsed = (now - start) / 1000;
    var pos = Math.sin((elapsed / 3) * Math.PI * 2) * 50;
    word.style.backgroundPosition = (50 + pos) + '% ' + (50 + pos) + '%';
    requestAnimationFrame(animate);
  }
  requestAnimationFrame(animate);
})();

// ===== What We Do — pill columns: scroll trigger + click interaction =====
(function() {
  var section = document.getElementById('what-we-do');
  var colProd = document.getElementById('wwdCardProd');
  var colDist = document.getElementById('wwdCardDist');
  if (!section || !colProd || !colDist) return;

  var userClicked = false; // tracks if user has manually clicked

  function activate(target) {
    var other = (target === colProd) ? colDist : colProd;
    target.classList.add('is-active');
    target.classList.remove('is-inactive');
    other.classList.add('is-inactive');
    other.classList.remove('is-active');
  }

  function resetBoth() {
    colProd.classList.remove('is-active', 'is-inactive');
    colDist.classList.remove('is-active', 'is-inactive');
  }

  // Click interaction
  colProd.addEventListener('click', function() {
    userClicked = true;
    if (colProd.classList.contains('is-active')) {
      resetBoth();
    } else {
      activate(colProd);
    }
  });

  colDist.addEventListener('click', function() {
    userClicked = true;
    if (colDist.classList.contains('is-active')) {
      resetBoth();
    } else {
      activate(colDist);
    }
  });

  // Scroll trigger: auto-expand Production when section enters viewport
  function onScroll() {
    if (userClicked) return; // don't override user's click
    var rect = section.getBoundingClientRect();
    var vh = window.innerHeight;
    var scrolled = -rect.top;

    if (scrolled > vh * 0.3 && scrolled < vh * 2.5) {
      if (!colProd.classList.contains('is-active') && !colDist.classList.contains('is-active')) {
        activate(colProd);
      }
    } else if (scrolled <= 0) {
      resetBoth();
      userClicked = false; // reset when scrolled away
    }
  }

  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();
})();

// ===== Hero scrolls up as card, reveals studio image, zoom into monitor → Our Journey =====
// No video expansion. Hero is a simple 100vh card that scrolls away.
// Behind it: studio image in history-master. Zoom into monitor white screen → crossfade to journey.

// ===== Mouse Spark Effect on Hero =====
(function() {
  // Accessibility: skip entirely when reduced motion is requested —
  // continuous particle effects can trigger vestibular disorders.
  if (prefersReducedMotion) return;
  const canvas = document.getElementById('heroSparkCanvas');
  const hero = document.getElementById('hero');
  if (!canvas || !hero) return;

  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  // Full theme palette
  const colors = ['#4A20B0', '#7B4FE0', '#6C5CE7', '#A29BFE', '#FF6B6B', '#74B9FF', '#9B59B6', '#D4AC0D', '#E04F7B'];

  let particles = [];
  let animId = null;

  function resize() {
    canvas.width = hero.offsetWidth;
    canvas.height = hero.offsetHeight;
  }
  resize();
  window.addEventListener('resize', resize);

  function spawnParticles(x, y) {
    for (let i = 0; i < 4; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = Math.random() * 3.5 + 0.8;
      particles.push({
        x: x,
        y: y,
        dx: Math.cos(angle) * speed,
        dy: Math.sin(angle) * speed,
        color: colors[Math.floor(Math.random() * colors.length)],
        size: Math.random() * 3 + 2,
        alpha: 1
      });
    }
  }

  hero.addEventListener('mousemove', function(e) {
    const rect = hero.getBoundingClientRect();
    spawnParticles(e.clientX - rect.left, e.clientY - rect.top);
  });

  function animate() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    for (let i = particles.length - 1; i >= 0; i--) {
      const p = particles[i];
      p.x += p.dx;
      p.y += p.dy;
      p.dx *= 0.94;
      p.dy *= 0.94;
      p.alpha -= 0.015;

      if (p.alpha <= 0) {
        particles.splice(i, 1);
        continue;
      }

      ctx.globalAlpha = p.alpha;
      ctx.fillStyle = p.color;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.globalAlpha = 1;
    animId = requestAnimationFrame(animate);
  }

  animate();
})();

// ===== Journey Card Glow — mouse tracking =====
// Gated by prefers-reduced-motion (continuous parallax can trigger
// motion sickness for some users).
if (!prefersReducedMotion) {
  document.querySelectorAll('.tl-img').forEach(img => {
    img.addEventListener('mousemove', e => {
      const rect = img.getBoundingClientRect();
      const x = ((e.clientX - rect.left) / rect.width) * 100;
      const y = ((e.clientY - rect.top) / rect.height) * 100;
      img.style.setProperty('--glow-x', x + '%');
      img.style.setProperty('--glow-y', y + '%');
    });
    img.addEventListener('mouseleave', () => {
      img.style.setProperty('--glow-x', '50%');
      img.style.setProperty('--glow-y', '50%');
    });
  });
}

// ===== Nav scroll effect =====
// Navbar is position:absolute — scrolls away with the hero naturally.

// ===== Fade-in on scroll =====
const faders = document.querySelectorAll('.fade-in');
const fadeObserver = new IntersectionObserver((entries) => {
  entries.forEach(entry => {
    if (entry.isIntersecting) entry.target.classList.add('visible');
  });
}, { threshold: 0.05 });
faders.forEach(el => fadeObserver.observe(el));

// ===== History: Horizontal scroll (intro handled by hero video) =====
const historyMaster = document.getElementById('about');
const introLayer = document.getElementById('historyIntroLayer');
const hscrollLayer = document.getElementById('historyHscrollLayer');
const historyTrack = document.getElementById('historyTrack');
// India map layer removed — replaced by dedicated map timeline piece (see below)
const indiaMapObj = document.getElementById('indiaMapSvg');

// Cached refs + last-applied values — avoids redundant DOM writes every scroll
// frame and keeps the journey animation smooth.
const historyRefs = {
  tlSvg: null, tlBg: null, tlFill: null, tlDot: null,
};
let historyPathCache = { d: '', length: 0, points: [] };
// Layout measurements cached at setup time — avoids recomputing scrollWidth
// and element counts every scroll frame, and lets the scroll handler stay
// content-relative (not viewport-height-relative).
const historyCache = { cardsPhase: 0, hScrollDistance: 0, numCards: 0 };
const historyLast = {
  hProgress: -1,
  introScale: -1,
  introOpacity: -1,
  introSvgFade: -1,
  hscrollOpacity: -1,
  zoomVisible: null,
  activeIdx: -2, // -2 means "unknown", -1 means "none active"
};
let historyTicking = false;

function setupHistory() {
  if (!historyMaster || !historyTrack) return;
  // Narrow-width: CSS converts the horizontal timeline to a vertical
  // stack, so we release the height override and clear any transform
  // the track may have accumulated from a previous (wider) layout.
  if (isNarrow()) {
    historyMaster.style.height = '';
    historyTrack.style.transform = '';
    if (introLayer) {
      introLayer.style.transform = '';
      introLayer.style.opacity = '';
      introLayer.style.display = '';
    }
    if (hscrollLayer) hscrollLayer.style.opacity = '';
    // Clear all timeline-piece active classes
    const pcs = historyTrack.querySelectorAll('.tl-piece');
    pcs.forEach(p => p.classList.remove('tl-active'));
    historyLast.hProgress = -1;
    historyLast.activeIdx = -2;

    // Mobile: IntersectionObserver to animate cards in on scroll
    if (!window._tlMobileObserver) {
      window._tlMobileObserver = new IntersectionObserver(function(entries) {
        entries.forEach(function(entry) {
          if (entry.isIntersecting) {
            entry.target.classList.add('tl-mobile-visible');
          }
        });
      }, { threshold: 0.15 });
    }
    pcs.forEach(function(p) { window._tlMobileObserver.observe(p); });

    // Show/hide skip button only while journey section is in view
    var skipBtn = document.querySelector('.tl-skip-btn');
    if (skipBtn && !window._tlSkipObserver) {
      window._tlSkipObserver = new IntersectionObserver(function(entries) {
        entries.forEach(function(entry) {
          if (entry.isIntersecting) {
            skipBtn.classList.add('tl-skip-visible');
          } else {
            skipBtn.classList.remove('tl-skip-visible');
          }
        });
      }, { threshold: 0.05 });
      window._tlSkipObserver.observe(historyMaster);
    }
    return;
  }
  const trackWidth = historyTrack.scrollWidth;
  const viewportWidth = window.innerWidth;
  const vh = window.innerHeight;
  const hScrollDistance = Math.max(0, trackWidth - viewportWidth);

  // Sequential card allowance: each timeline card gets a fixed slice of
  // vertical scroll so the journey reads as "one card per scroll beat"
  // REGARDLESS of whether the horizontal track fits inside the viewport.
  //
  // Why: on big displays (4K TV, ultrawide) the 6 timeline cards fit
  // entirely in one viewport, so hScrollDistance = 0 and the old logic
  // left the user with no meaningful scroll phase — the nearest-to-
  // viewport-center detection would instantly snap to card 3 or 4 and
  // skip the first 1–2 cards. By enforcing a minimum cards-phase
  // length proportional to the number of cards, every display gets a
  // full sequential walk through the timeline.
  const pieces = historyTrack.querySelectorAll('.tl-piece');
  const numCards = pieces.length;
  const cardsPhase = Math.max(hScrollDistance, numCards * vh * 0.65);

  // Height = zoom phase (1vh) + cards phase + breathing room (1.5vh) + viewport (sticky)
  // The 1.5vh breathing room ensures the last card is fully visible before
  // the next section starts scrolling in.
  historyMaster.style.height = (vh + cardsPhase + vh * 1.5 + vh) + 'px';
  historyCache.cardsPhase = cardsPhase;
  historyCache.hScrollDistance = hScrollDistance;
  historyCache.numCards = numCards;

  // Cache SVG element refs once
  if (!historyRefs.tlSvg) {
    historyRefs.tlSvg = document.getElementById('tlThreadSvg');
    historyRefs.tlBg = document.getElementById('tlThreadBg');
    historyRefs.tlFill = document.getElementById('tlThreadFill');
    historyRefs.tlDot = document.getElementById('tlThreadDot');
  }

  // Rebuild the timeline thread path once per layout change. Card positions
  // inside the horizontal track are stable (only the track's translateX
  // changes on scroll), so the path itself never needs to be rebuilt on
  // scroll — we only need to move the dashoffset + dot along it.
  cacheHistoryPath();

  // Invalidate last-applied so the next updateHistory() re-pushes values
  historyLast.hProgress = -1;
  historyLast.introScale = -1;
  historyLast.introOpacity = -1;
  historyLast.introSvgFade = -1;
  historyLast.hscrollOpacity = -1;
  historyLast.zoomVisible = null;
  historyLast.activeIdx = -2;
}

function cacheHistoryPath() {
  const { tlBg, tlFill } = historyRefs;
  if (!historyTrack || !tlBg || !tlFill) return;
  const pieces = Array.from(historyTrack.querySelectorAll('.tl-piece'));
  if (pieces.length < 2) return;

  // Temporarily neutralise the track transform so getBoundingClientRect gives
  // us layout coordinates, not post-scroll ones.
  const prevTransform = historyTrack.style.transform;
  historyTrack.style.transform = 'none';
  const trackRect = historyTrack.getBoundingClientRect();
  const points = [];
  pieces.forEach((piece) => {
    const img = piece.querySelector('.tl-img');
    if (!img) return;
    const imgRect = img.getBoundingClientRect();
    const cx = imgRect.left + imgRect.width / 2 - trackRect.left;
    const cy = imgRect.top + imgRect.height * 0.5 - trackRect.top;
    points.push({ x: cx, y: cy });
  });
  historyTrack.style.transform = prevTransform;

  if (points.length < 2) return;

  // Extend thread: add a leading point at the left edge and a trailing
  // point at the right edge so the dotted line spans the full visible area.
  // The right extension must reach the viewport's right edge even when
  // the track has been fully scrolled left — that means we need to go
  // (trackWidth - scrollDistance + viewportWidth) in track coordinates,
  // i.e. hScrollDistance + viewportWidth. We add extra padding for safety.
  const lastPt = points[points.length - 1];
  const firstPt = points[0];
  const viewportW = window.innerWidth;
  const edgeRight = Math.max(trackRect.width + 200, lastPt.x + viewportW);
  // Extend left well past the viewport edge so the line "enters" from off-screen
  const edgeLeft = -200;
  points.unshift({ x: edgeLeft, y: firstPt.y });
  points.push({ x: edgeRight, y: lastPt.y });

  let d = `M ${points[0].x} ${points[0].y}`;
  for (let i = 0; i < points.length - 1; i++) {
    const p0 = points[i];
    const p1 = points[i + 1];
    const dx = (p1.x - p0.x) * 0.45;
    d += ` C ${p0.x + dx} ${p0.y}, ${p1.x - dx} ${p1.y}, ${p1.x} ${p1.y}`;
  }

  tlBg.setAttribute('d', d);
  tlFill.setAttribute('d', d);
  tlBg.style.strokeDasharray = '8 10';
  const length = tlFill.getTotalLength();
  tlFill.style.strokeDasharray = length;

  // Calculate the fractional path position of each original card.
  // points[0] = left extension, points[1..N] = cards, points[N+1] = right extension.
  // We binary-search along the path to find the length fraction where x matches each card's x.
  const cardFractions = [];
  for (let ci = 1; ci < points.length - 1; ci++) { // skip extensions
    const targetX = points[ci].x;
    // Walk the path in small steps to find the fraction
    let bestFrac = 0;
    let bestDist = Infinity;
    const steps = 200;
    for (let s = 0; s <= steps; s++) {
      const frac = s / steps;
      const pt = tlFill.getPointAtLength(length * frac);
      const dist = Math.abs(pt.x - targetX);
      if (dist < bestDist) { bestDist = dist; bestFrac = frac; }
    }
    cardFractions.push(bestFrac);
  }

  historyPathCache = { d, length, points, cardFractions };
}

function updateHistory() {
  if (!historyMaster || !hscrollLayer || !historyTrack) return;
  // Narrow-width: CSS drives the vertical timeline; JS no-ops so we
  // never write a scroll-derived transform onto the track (which would
  // push it off-screen or overlap cards).
  if (isNarrow()) return;

  const rect = historyMaster.getBoundingClientRect();
  const scrolled = -rect.top;
  const totalHeight = historyMaster.offsetHeight - window.innerHeight;
  if (totalHeight <= 0) return;

  const vh = window.innerHeight;
  const viewportWidth = window.innerWidth;

  // Phase 1: Studio image is visible (hero has scrolled away), then zoom into monitor
  // Zoom phase: 0 → 1vh of scroll into the history section
  const zoomEnd = vh * 1.0;
  const zoomRaw = Math.max(0, Math.min(1, scrolled / zoomEnd));
  const zoomT = zoomRaw * zoomRaw * (3 - 2 * zoomRaw); // smoothstep

  if (introLayer) {
    if (zoomRaw < 1) {
      if (historyLast.zoomVisible !== true) {
        introLayer.style.display = '';
        historyLast.zoomVisible = true;
      }
      const introScale = 1 + zoomT * 4;
      const introOpacity = zoomT > 0.7 ? 1 - ((zoomT - 0.7) / 0.3) : 1;
      const svgFade = zoomT < 0.5 ? 1 : Math.max(0, 1 - (zoomT - 0.5) / 0.2);

      if (Math.abs(introScale - historyLast.introScale) > 0.001) {
        introLayer.style.transform = `scale(${introScale})`;
        introLayer.style.setProperty('--intro-zoom', introScale);
        historyLast.introScale = introScale;
      }
      if (Math.abs(introOpacity - historyLast.introOpacity) > 0.005) {
        introLayer.style.opacity = introOpacity;
        historyLast.introOpacity = introOpacity;
      }
      if (Math.abs(svgFade - historyLast.introSvgFade) > 0.005) {
        introLayer.style.setProperty('--intro-svg-opacity', svgFade);
        historyLast.introSvgFade = svgFade;
      }
    } else if (historyLast.zoomVisible !== false) {
      introLayer.style.display = 'none';
      historyLast.zoomVisible = false;
    }
  }

  // Journey content fades in during last 50% of zoom
  if (hscrollLayer) {
    let op;
    if (zoomRaw < 0.5) op = 0;
    else if (zoomRaw < 1) op = (zoomRaw - 0.5) / 0.5;
    else op = 1;
    if (Math.abs(op - historyLast.hscrollOpacity) > 0.005) {
      hscrollLayer.style.opacity = op;
      historyLast.hscrollOpacity = op;
    }
  }

  // ---- Sequential cards phase ----
  // Progress is measured against the cached cardsPhase (not vh multiples),
  // so the timing is content-relative: each card gets exactly the same
  // slice of scroll regardless of display size.
  const cardsScrolled = Math.max(0, scrolled - zoomEnd);
  const cardsPhase = historyCache.cardsPhase || 1;
  const hScrollDistance = historyCache.hScrollDistance;
  const numCards = historyCache.numCards || 0;
  const hProgress = Math.min(1, cardsScrolled / cardsPhase);

  // Only do the heavy per-frame work when hProgress actually changes.
  if (Math.abs(hProgress - historyLast.hProgress) < 0.0004) return;

  // ---- 3-phase scroll: lead-in → horizontal scroll → lead-out ----
  // cardFractions[0]  = path fraction where first card sits
  // cardFractions[N-1] = path fraction where last card sits
  // Phase A (hProgress 0 → frac0): Dot enters from left to first card. NO track movement.
  // Phase B (frac0 → fracN): Track scrolls horizontally, dot advances through cards.
  // Phase C (fracN → 1): Dot exits to right edge. Track stays at max translation.
  const cardFractions = historyPathCache.cardFractions;
  const frac0 = (cardFractions && cardFractions.length > 0) ? cardFractions[0] : 0;
  const fracN = (cardFractions && cardFractions.length > 0) ? cardFractions[cardFractions.length - 1] : 1;

  let trackTranslateX = 0;
  if (hScrollDistance > 0) {
    if (hProgress <= frac0) {
      // Phase A: no horizontal movement
      trackTranslateX = 0;
    } else if (hProgress >= fracN) {
      // Phase C: track stays at max scroll
      trackTranslateX = -hScrollDistance;
    } else {
      // Phase B: map hProgress linearly over [frac0, fracN] → [0, hScrollDistance]
      const scrollFrac = (hProgress - frac0) / (fracN - frac0);
      trackTranslateX = -scrollFrac * hScrollDistance;
    }
    historyTrack.style.transform = `translate3d(${trackTranslateX}px, 0, 0)`;
  } else if (historyLast.hProgress < 0) {
    historyTrack.style.transform = 'translate3d(0, 0, 0)';
  }

  // Move the thread dashoffset + dot along the cached path using hProgress.
  const { tlFill, tlDot } = historyRefs;
  const pathLength = historyPathCache.length;
  if (tlFill && pathLength > 0) {
    tlFill.style.strokeDashoffset = pathLength * (1 - hProgress);
    if (tlDot) {
      if (hProgress > 0.005) {
        const pt = tlFill.getPointAtLength(pathLength * hProgress);
        tlDot.setAttribute('cx', pt.x);
        tlDot.setAttribute('cy', pt.y);
        tlDot.setAttribute('opacity', '1');
      } else {
        tlDot.setAttribute('opacity', '0');
      }
    }
  }

  // ---- Card activation synced to dot position ----
  if (numCards > 0 && cardFractions && cardFractions.length > 0) {
    let newIdx = -1;
    for (let i = cardFractions.length - 1; i >= 0; i--) {
      if (hProgress >= cardFractions[i] - 0.008) {
        newIdx = i;
        break;
      }
    }

    if (newIdx !== historyLast.activeIdx) {
      const pieces = historyTrack.querySelectorAll('.tl-piece');
      for (let i = 0; i < pieces.length; i++) {
        // All cards up to newIdx stay colored; cards ahead lose color
        if (i <= newIdx) pieces[i].classList.add('tl-active');
        else pieces[i].classList.remove('tl-active');
      }
      historyLast.activeIdx = newIdx;
    }
  }

  historyLast.hProgress = hProgress;
}

// ===== Main scroll handler (rAF-throttled) =====
// Scroll events can fire 120+ times per second on modern trackpads. Throttling
// to the animation frame keeps the journey timeline buttery smooth — we only
// do layout work once per paint, not per input event.
function onScroll() {
  if (historyTicking) return;
  historyTicking = true;
  requestAnimationFrame(() => {
    updateHistory();
    historyTicking = false;
  });
}

window.addEventListener('scroll', onScroll, { passive: true });
window.addEventListener('resize', () => {
  setupHistory();
  // Force an immediate update on resize, bypassing the rAF gate
  updateHistory();
});

// Init
setupHistory();
updateHistory();


// ===== Founders: scroll-driven counter + ScrollFadeText-style scatter =====
(function() {
  const section = document.querySelector('.founders-scatter');
  const stickyEl = document.querySelector('.founders-scatter-sticky');
  const heroText = document.querySelector('.fs-hero-text');
  const counterEl = document.getElementById('fsCounter');
  const cards = document.querySelectorAll('.founders-scatter-sticky .fs-card');
  if (!section || !stickyEl || !heroText || !counterEl) return;

  // Founders scatter — 5×5-ish grid with the center cells removed so the
  // "100+ Founders Filmed" hero gets a clean focal hole in the middle.
  // Cards hug close to the heading horizontally (no big empty side
  // gutters) but the central column above/below the number is left clear.
  //
  // Card prominence is encoded in HTML order — slot 0 = most-prominent
  // (closest to heading), slot 20 = farthest corner. High-profile founders
  // (Dheeraj/Khadim/Yamini/Karan) live in slots 0..3.
  //
  // Positions are stored as fractions of viewport. computePositions()
  // multiplies them up AND clamps every card to the viewport bounds, so
  // even at small window sizes NO card is ever cut off by the screen edge.
  const scatterData = [
    // ----- Tier 1 (most prominent) — hugging the heading -----
    { x: -0.19, y: -0.24, rot: -3 },   // 0  Dheeraj  (upper left close)
    { x:  0.19, y: -0.24, rot:  3 },   // 1  Khadim   (upper right close)
    { x: -0.19, y:  0.26, rot:  2 },   // 2  Yamini   (lower left close)
    { x:  0.19, y:  0.26, rot: -2 },   // 3  Karan    (lower right close)
    { x: -0.40, y:  0.00, rot:  3 },   // 4  Shradha  (left flank, beside number)
    { x:  0.40, y:  0.00, rot: -3 },   // 5  Saravana (right flank)
    { x:  0.00, y:  0.26, rot:  2 },   // 6  Sunil    (dead center below subtitle)

    // ----- Tier 2 — outer-row close to heading -----
    { x: -0.38, y: -0.24, rot:  3 },   // 7  Manoj    (outer upper left)
    { x:  0.38, y: -0.24, rot: -3 },   // 8  Manasij  (outer upper right)
    { x: -0.38, y:  0.26, rot: -2 },   // 9  Louis    (outer lower left)
    { x:  0.38, y:  0.26, rot:  2 },   // 10 Bhanu    (outer lower right)

    // ----- Tier 3 — top row -----
    { x:  0.00, y: -0.42, rot:  2 },   // 11 Gaurav   (top center)
    { x: -0.19, y: -0.42, rot: -3 },   // 12 Siddharth (top mid-left)
    { x:  0.19, y: -0.42, rot:  3 },   // 13 Paramdeep (top mid-right)
    { x: -0.38, y: -0.42, rot: -2 },   // 14 Atoba    (top corner left)
    { x:  0.38, y: -0.42, rot:  2 },   // 15 Neeraj   (top corner right)

    // ----- Tier 4 — bottom row -----
    { x:  0.00, y:  0.42, rot: -2 },   // 16 Nimish   (bottom center)
    { x: -0.19, y:  0.42, rot:  3 },   // 17 Kalyan   (bottom mid-left)
    { x:  0.19, y:  0.42, rot: -3 },   // 18 Ayush    (bottom mid-right)
    { x: -0.38, y:  0.42, rot:  2 },   // 19 Pravat   (bottom corner left)
    { x:  0.38, y:  0.42, rot: -2 }    // 20 Vikash   (bottom corner right)
  ];

  const positions = [];
  function computePositions() {
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    // Clamp using HOVER dimensions (the bigger of the two states) so the
    // card stays inside the viewport even when expanded under the cursor.
    // Whatever scatterData fraction would push the card off-screen gets
    // hard-clamped to the safe edge — the card moves inward instead.
    const isMobile = vw <= 768;
    const cardHalfW = isMobile ? 110 : 118;   // hover width / 2 + a hair
    const cardHalfH = isMobile ?  62 :  68;   // hover height / 2 + a hair
    const margin = 14;
    const maxX = Math.max(0, vw / 2 - cardHalfW - margin);
    const maxY = Math.max(0, vh / 2 - cardHalfH - margin);

    const n = Math.min(cards.length, scatterData.length);
    for (let i = 0; i < n; i++) {
      const s = scatterData[i];
      let px = Math.round(s.x * vw);
      let py = Math.round(s.y * vh);
      // Hard clamp — guarantees no card is ever cut off by the screen edge
      px = Math.max(-maxX, Math.min(maxX, px));
      py = Math.max(-maxY, Math.min(maxY, py));
      positions[i] = { x: px, y: py, rot: s.rot };
    }
  }
  computePositions();

  // Smoothstep easing helper
  const smoothstep = (t) => t * t * (3 - 2 * t);

  // Clears any inline styles the handler may have written — so CSS
  // can take over cleanly when the viewport drops below the narrow
  // breakpoint (cards become a vertical grid, no scatter animation).
  function clearScatterInline() {
    stickyEl.style.position = '';
    stickyEl.style.top = '';
    stickyEl.style.left = '';
    stickyEl.style.right = '';
    stickyEl.style.visibility = '';
    if (heroText) heroText.style.transform = '';
    cards.forEach(c => {
      c.style.removeProperty('--scatter-transform');
      c.style.opacity = '';
    });
    // Counter still needs to reach 100 on phones — set it directly.
    if (counterEl) {
      counterEl.textContent = '100+';
      counterEl.classList.add('fs-gradient');
    }
    if (heroText) heroText.classList.add('visible');
  }

  function update() {
    // Narrow-width: CSS converts the scatter into a 2-col grid. The
    // scroll-driven scatter animation can't work when cards are in a
    // normal-flow grid, so we just clear inline styles and bail.
    if (isNarrow()) { clearScatterInline(); return; }
    const rect = section.getBoundingClientRect();
    const scrolled = -rect.top;
    const totalScroll = section.offsetHeight - window.innerHeight;
    if (totalScroll <= 0) return;

    // JS-driven sticky — hide when not in view to prevent bleed-through
    if (scrolled <= 0) {
      stickyEl.style.position = 'relative';
      stickyEl.style.top = '0';
      stickyEl.style.visibility = 'hidden';
    } else if (scrolled < totalScroll) {
      stickyEl.style.position = 'fixed';
      stickyEl.style.top = '0';
      stickyEl.style.left = '0';
      stickyEl.style.right = '0';
      stickyEl.style.visibility = 'visible';
    } else {
      stickyEl.style.position = 'absolute';
      stickyEl.style.top = totalScroll + 'px';
      stickyEl.style.left = '0';
      stickyEl.style.right = '0';
      stickyEl.style.visibility = 'visible';
    }

    const rawProgress = Math.max(0, Math.min(1, scrolled / totalScroll));

    // Phase 1: Counter (0→18% scroll = 0→100) — very fast
    const counterProgress = Math.min(1, rawProgress / 0.18);
    const counterEase = 1 - Math.pow(1 - counterProgress, 2);
    const counterVal = Math.round(counterEase * 100);

    if (rawProgress > 0.01) heroText.classList.add('visible');

    counterEl.textContent = counterVal + '+';
    if (counterVal >= 100) {
      counterEl.classList.add('fs-gradient');
    } else {
      counterEl.classList.remove('fs-gradient');
    }

    // Phase 2: ScrollFadeText-style scatter (10% → 45%). Finishing the
    // scatter at 45% leaves a big idle buffer so the team section can
    // slide up over the bottom of this section without clipping cards.
    const scatterPhaseStart = 0.10;
    const scatterPhaseEnd = 0.45;
    const phaseLen = scatterPhaseEnd - scatterPhaseStart;

    // Hero text stays visible but shrinks slightly as cards scatter out
    const overallScatter = Math.max(0, Math.min(1,
      (rawProgress - scatterPhaseStart) / phaseLen));
    const heroShrink = 1 - overallScatter * 0.28;
    heroText.style.transform = `scale(${heroShrink}) translateY(0)`;

    // SYNCHRONOUS: every card uses the SAME [scatterPhaseStart..End]
    // window so they fly out together as a single composed motion. This
    // is the explicit ask — no per-card stagger, no sequential cascade.
    const tRawAll = Math.max(0, Math.min(1,
      (rawProgress - scatterPhaseStart) / phaseLen));
    const tAll = smoothstep(tRawAll);

    cards.forEach((card, i) => {
      const pos = positions[i] || { x: 0, y: 0, rot: 0 };
      const tRaw = tRawAll;
      const t = tAll;

      // Translate outward to scatter position
      const x = pos.x * t;
      const y = pos.y * t;
      // Rotation settles to its small near-horizontal angle (no full spin)
      const rot = pos.rot * t;
      // Scale: cards start slightly larger (1.1) and settle at 1.0
      const scale = 1.1 - 0.1 * t;
      // Opacity: fade in during the first third of the card's window
      const opacity = Math.min(1, tRaw * 3);

      const transformStr = `translate(${x}px, ${y}px) rotate(${rot}deg) scale(${scale})`;
      // Note: the CSS has `transform: translate(-50%, -50%) var(--scatter-transform)`
      // so we set the CSS var and let CSS compose the base centering.
      card.style.setProperty('--scatter-transform', transformStr);
      card.style.opacity = opacity;
    });
  }

  window.addEventListener('scroll', update, { passive: true });
  window.addEventListener('resize', () => {
    computePositions();
    update();
  });
  update();
})();

// ===== Hero lift-up effect =====
// Hero is position:sticky + z-index:5 on top of the pinned wmi-section.
// As the user scrolls, we translate the hero upward so it peels off the
// rounded-card wmi page underneath, which stays completely stationary.
// Timing: lift starts immediately on scroll and completes by 100vh.
(function() {
  const hero = document.querySelector('.hero');
  if (!hero) return;

  function onHeroLift() {
    // Narrow-width: hero is a static section in normal flow, so the
    // lift effect must be disabled. Clear any previous transform.
    if (isNarrow()) {
      if (hero.style.transform) hero.style.transform = '';
      return;
    }
    const vh = window.innerHeight;
    const scrollY = window.scrollY;
    // Lift across the first full viewport of scroll — a short cushion at
    // the very start so a 1px nudge doesn't instantly move the card.
    const start = vh * 0.04;
    const end = vh * 1.0;
    const t = Math.max(0, Math.min(1, (scrollY - start) / (end - start)));
    // Ease-out cubic for a natural "lift off" feel
    const eased = 1 - Math.pow(1 - t, 3);
    hero.style.transform = `translateY(${-eased * vh}px)`;
  }

  window.addEventListener('scroll', onHeroLift, { passive: true });
  window.addEventListener('resize', onHeroLift);
  onHeroLift();
})();

// ===== We Make It / We Take It — staged text reveal =====
// Triggered once, when the hero has lifted fully off revealing the pinned
// wmi page (scroll >= ~95% of viewport). Each line slides up from its mask
// (like the hero loader "Hello, we are Curious Men Films" intro), painted
// directly in the brand gradient. After the last line finishes, the
// subtext ("Two pillars. One mission. Nothing in between.") fades in.
(function() {
  const lines = document.querySelectorAll('.wmi-section .wmi-line');
  const sub = document.querySelector('.wmi-section .wmi-sub');
  if (!lines.length) return;
  let triggered = false;

  function playReveal() {
    // Per-line slide-up stagger (140ms between lines — faster than the
    // previous 250ms which felt sluggish on a fast scroll).
    lines.forEach((line, i) => {
      setTimeout(() => line.classList.add('wmi-show'), 60 + i * 140);
    });
    // Reveal subtext shortly after the last heading line has slid up
    const subDelay = 60 + (lines.length - 1) * 140 + 480;
    setTimeout(() => {
      if (sub) sub.classList.add('wmi-sub-show');
    }, subDelay);
  }

  function check() {
    if (triggered) return;
    const vh = window.innerHeight;
    if (window.scrollY >= vh * 0.95) {
      triggered = true;
      playReveal();
    }
  }

  window.addEventListener('scroll', check, { passive: true });
  check();
})();

// ===== We Make It / We Take It — scroll-driven exit phase =====
// After the text reveal completes, the next scroll drives a coordinated
// exit animation inside the pinned section:
//   - The video lifts up and fades away (translateY -70vh, opacity 1→0)
//   - The caption text shrinks slightly and rises to where the video used
//     to sit (translateY -28vh, scale 1→0.7)
//   - The subtext fades out early
//   - Two cards (Production + Distribution) emerge from behind the video
//     position: fade in, and split horizontally — prod left, dist right.
// All progress is computed from scrollY in the range 160vh..380vh (a
// 220vh window), which lives inside the 360vh pin range of the 460vh
// .wmi-pin-wrap. The timing reserves ~50% of this window as a HOLD
// where everything is frozen — that's the "stop here, then on the next
// scroll it exits" beat the design calls for.
(function() {
  const wmi = document.querySelector('.wmi-section');
  if (!wmi) return;
  const cardProd = wmi.querySelector('.wmi-card-prod');
  const cardDist = wmi.querySelector('.wmi-card-dist');
  const sub = wmi.querySelector('.wmi-sub');
  if (!cardProd || !cardDist) return;

  const smooth = (t) => t * t * (3 - 2 * t);
  const clamp01 = (v) => Math.max(0, Math.min(1, v));

  // Clear all inline styles the handler may have written — used when
  // we transition to a narrow width so CSS can take over cleanly.
  function clearInline() {
    wmi.style.removeProperty('--wmi-video-y');
    wmi.style.removeProperty('--wmi-video-opacity');
    wmi.style.removeProperty('--wmi-text-y');
    wmi.style.removeProperty('--wmi-text-scale');
    if (sub) sub.style.opacity = '';
    cardProd.style.opacity = '';
    cardDist.style.opacity = '';
    cardProd.style.removeProperty('--wmi-card-x');
    cardDist.style.removeProperty('--wmi-card-x');
  }

  function update() {
    // Narrow-width: CSS stacks the cards + video vertically, so JS
    // must stop writing scroll-derived transforms (they'd push cards
    // off-screen). Clear any previous writes and bail out.
    if (isNarrow()) { clearInline(); return; }
    const vh = window.innerHeight;
    const scrollY = window.scrollY;
    // Animation window: scroll 160vh → 380vh (220vh of travel)
    const animStart = vh * 1.6;
    const animEnd = vh * 3.8;
    const p = clamp01((scrollY - animStart) / (animEnd - animStart));

    // Phase breakdown (fractions of p):
    //   0.00 – 0.25  : video lifts up and fades away
    //   0.03 – 0.32  : caption text shrinks + rises to video's old spot
    //   0.00 – 0.12  : subtext fades out early
    //   0.15 – 0.40  : cards fade in + split L/R to reveal position
    //   0.40 – 0.82  : HOLD — cards frozen, user reads content
    //   0.82 – 1.00  : cards sweep further off-screen L/R (exit)

    // Video
    const vT = smooth(clamp01(p / 0.25));
    wmi.style.setProperty('--wmi-video-y', `${-vT * 70}vh`);
    wmi.style.setProperty('--wmi-video-opacity', `${1 - vT}`);

    // Text shrink + rise
    const tT = smooth(clamp01((p - 0.03) / 0.29));
    wmi.style.setProperty('--wmi-text-y', `${-tT * 44}vh`);
    wmi.style.setProperty('--wmi-text-scale', `${1 - tT * 0.35}`);

    // Subtext fade-out (only after it has been intro-revealed)
    if (sub && sub.classList.contains('wmi-sub-show')) {
      const sT = clamp01(p / 0.12);
      sub.style.opacity = `${1 - sT}`;
    }

    // Cards: stay completely off-screen AND invisible until the heading
    // text has fully shrunk + lifted (p >= 0.34). Then they slide in from
    // the far edges (60vw outward) to their rest pose (18vw split) over
    // p = 0.34 → 0.56. This guarantees they NEVER visually overlap the
    // heading at any scroll speed — no stacking, no ghost text glitch.
    const cardT = smooth(clamp01((p - 0.34) / 0.22));
    // Slide-in: 60vw (off-screen) → 18vw (rest pose)
    const restSplit = 60 - cardT * 42;
    // Card exit sweep: p = 0.82 → 1.00 (extra outward push so they sail
    // completely off-screen L/R when the user resumes scrolling).
    const exitT = smooth(clamp01((p - 0.82) / 0.18));
    const splitX = restSplit + exitT * 60;
    // Opacity ramps up only once the cards are already moving inward —
    // they fade in WHILE separated, never while stacked at center.
    const opacity = cardT;
    cardProd.style.opacity = `${opacity}`;
    cardDist.style.opacity = `${opacity}`;
    // Write into CSS variables so the full transform (base centering +
    // hover scale) is composed by CSS.
    cardProd.style.setProperty('--wmi-card-x', `${-splitX}vw`);
    cardDist.style.setProperty('--wmi-card-x', `${splitX}vw`);
  }

  window.addEventListener('scroll', update, { passive: true });
  window.addEventListener('resize', update);
  update();
})();

// ===== Ambilight video: hover to play =====
const ambilightWrap = document.querySelector('.ambilight-wrap');
if (ambilightWrap) {
  const mainVideo = ambilightWrap.querySelector('.ambilight-video');
  const glowVideo = ambilightWrap.querySelector('.ambilight-glow');

  ambilightWrap.addEventListener('mouseenter', () => {
    mainVideo.play();
    glowVideo.play();
    ambilightWrap.classList.add('playing');
  });

  ambilightWrap.addEventListener('mouseleave', () => {
    mainVideo.pause();
    glowVideo.pause();
    ambilightWrap.classList.remove('playing');
  });
}

// ===== Mobile hamburger menu =====
(function() {
  const hamburger = document.getElementById('navHamburger');
  const navLinks = document.getElementById('navLinks');
  if (!hamburger || !navLinks) return;

  hamburger.addEventListener('click', function() {
    const isOpen = navLinks.classList.toggle('nav-open');
    hamburger.classList.toggle('active', isOpen);
    hamburger.setAttribute('aria-expanded', isOpen);
    document.body.style.overflow = isOpen ? 'hidden' : '';
  });

  // Close menu when a link is tapped
  navLinks.querySelectorAll('a').forEach(function(link) {
    link.addEventListener('click', function() {
      navLinks.classList.remove('nav-open');
      hamburger.classList.remove('active');
      hamburger.setAttribute('aria-expanded', 'false');
      document.body.style.overflow = '';
    });
  });
})();

// ===== Mobile: Founders single-card auto-rotation =====
(function() {
  if (!isNarrow()) return;
  var cards = document.querySelectorAll('.fs-cards-scroll-wrap .fs-card');
  if (!cards.length) return;

  var current = 0;
  cards[0].classList.add('fs-card-active');

  setInterval(function() {
    cards[current].classList.remove('fs-card-active');
    current = (current + 1) % cards.length;
    cards[current].classList.add('fs-card-active');
  }, 1800);
})();

// ===== Mobile: Team — static grid (no marquee) =====
// On mobile the five team members display as a simple wrapped grid
// with names and roles visible. No JS needed.

// ===== Featured Video — click to play YouTube =====
(function() {
  var container = document.getElementById('owFeaturedVideo');
  var playBtn = document.getElementById('owVideoPlay');
  if (!container || !playBtn) return;

  function loadVideo() {
    container.classList.add('ow-video-playing');
    var iframe = document.createElement('iframe');
    iframe.src = 'https://www.youtube.com/embed/IUJFyV2JA6M?autoplay=1&rel=0&modestbranding=1';
    iframe.allow = 'accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture';
    iframe.allowFullscreen = true;
    container.appendChild(iframe);
  }

  playBtn.addEventListener('click', loadVideo);
  container.addEventListener('click', function(e) {
    if (e.target !== playBtn && !playBtn.contains(e.target) && !container.classList.contains('ow-video-playing')) {
      loadVideo();
    }
  });
})();

// ===== Smooth scroll for nav links =====
document.querySelectorAll('.nav-links a').forEach(link => {
  link.addEventListener('click', e => {
    const href = link.getAttribute('href') || '';
    // Don't hijack mailto:, tel:, or external http(s) links
    if (!href.startsWith('#')) return;
    e.preventDefault();
    const target = document.querySelector(href);
    if (target) target.scrollIntoView({ behavior: 'smooth' });
  });
});

// ===== Our Work — Swiper coverflow carousel =====
(function() {
  const swiperEl = document.querySelector('.ow-swiper');
  if (!swiperEl || typeof Swiper === 'undefined') return;

  const owSwiper = new Swiper('.ow-swiper', {
    effect: 'slide',
    grabCursor: true,
    centeredSlides: true,
    slidesPerView: 3,
    spaceBetween: 24,
    loop: true,
    initialSlide: 0,
    speed: 700,
    autoplay: { delay: 3000, disableOnInteraction: false, pauseOnMouseEnter: true },
    pagination: false,
    on: {
      slideChange: function() {
        updateOwInfo(this);
      },
      init: function() {
        updateOwInfo(this);
      },
    },
  });

  function updateOwInfo(swiper) {
    const slide = swiper.slides[swiper.activeIndex];
    if (!slide) return;

    const tag = slide.getAttribute('data-tag') || '';
    const title = slide.getAttribute('data-title') || '';
    const desc = slide.getAttribute('data-desc') || '';
    const status = slide.getAttribute('data-status') || '';
    const ctaText = slide.getAttribute('data-cta-text') || '';
    const ctaHref = slide.getAttribute('data-cta-href') || '';

    const tagEl = document.getElementById('owSlideTag');
    const titleEl = document.getElementById('owSlideTitle');
    const descEl = document.getElementById('owSlideDesc');
    const statusEl = document.getElementById('owSlideStatus');
    const ctaEl = document.getElementById('owSlideCta');
    const ctaTextEl = document.getElementById('owSlideCtaText');

    if (tagEl) tagEl.textContent = tag;
    if (titleEl) titleEl.textContent = title;
    if (descEl) descEl.textContent = desc;
    if (statusEl) statusEl.innerHTML = status;
    if (ctaEl) {
      ctaEl.href = ctaHref;
      ctaEl.style.display = ctaHref ? '' : 'none';
    }
    if (ctaTextEl) ctaTextEl.textContent = ctaText;
  }
})();

// ===== Pitch Your Story button — guarantee mailto: opens =====
// Some browsers / setups silently swallow anchor-based mailto clicks; this
// forces window.location to the same href so the user's default mail client
// is invoked no matter what.
(function() {
  const pitchBtn = document.getElementById('pitchBtn');
  if (!pitchBtn) return;
  pitchBtn.addEventListener('click', (e) => {
    const href = pitchBtn.getAttribute('href');
    if (!href || !href.startsWith('mailto:')) return;
    e.preventDefault();
    window.location.href = href;
  });
})();

