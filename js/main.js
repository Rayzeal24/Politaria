/* ===========================================================
   🌌 SYSTÈME STELLAIRE ANIMÉ
   =========================================================== */

const canvas = document.getElementById("space");
const ctx = canvas.getContext("2d");

let w, h, cx, cy;

function resize() {
  w = canvas.width = window.innerWidth;
  h = canvas.height = window.innerHeight;
  cx = w * 0.6;
  cy = h * 0.5;
}
resize();
window.addEventListener("resize", resize);

/* -----------------------
   🌟 Fond : ciel étoilé
------------------------ */
const stars = [];
const STAR_COUNT = 2000;

for (let i = 0; i < STAR_COUNT; i++) {
  stars.push({
    x: Math.random() * w,
    y: Math.random() * h,
    size: Math.random() * 1.4 + 0.2,
    baseAlpha: Math.random() * 0.6 + 0.2,
    speed: Math.random() * 0.02 + 0.005
  });
}

/* -----------------------
   🪐 Système de planètes
------------------------ */
const orbits = [];
const planets = [];

// Orbites principales
const mainOrbitCount = 8;
for (let i = 0; i < mainOrbitCount; i++) {
  const rx = 80 + i * 55;
  const ry = rx * 0.7;
  orbits.push({ rx, ry });
}

// Config de base (teintes)
const mainPlanetsConfig = [
  { size: 8,  color: "#b0bec5" },
  { size: 10, color: "#ffb74d" },
  { size: 12, color: "#4fc3f7" },
  { size: 11, color: "#a5d6a7" },
  { size: 18, color: "#ffcc80" },
  { size: 16, color: "#90caf9" },
  { size: 14, color: "#ce93d8" },
  { size: 20, color: "#80cbc4" }
];

for (let i = 0; i < mainOrbitCount; i++) {
  const orbit = orbits[i];
  const cfg = mainPlanetsConfig[i % mainPlanetsConfig.length];
  planets.push({
    orbit,
    angle: Math.random() * Math.PI * 2,
    speed: (0.0004 + i * 0.0001),
    size: cfg.size,
    baseColor: cfg.color,
    ring: i === 4
  });
}

// Petits corps sur les orbites
const smallBodies = [];
for (let i = 0; i < 80; i++) {
  const orbit = orbits[Math.floor(Math.random() * orbits.length)];
  smallBodies.push({
    orbit,
    angle: Math.random() * Math.PI * 2,
    speed: (Math.random() * 0.0006 + 0.0001) * (Math.random() < 0.5 ? 1 : -1),
    size: Math.random() * 3 + 0.8,
    hue: 180 + Math.random() * 160,
    lightness: 40 + Math.random() * 30
  });
}

/* -----------------------
   🌍 Planètes lointaines hors système
------------------------ */
const farPlanets = [];
const FAR_PLANET_COUNT = 22;
const FAR_PLANET_MIN_DIST = 70;

function initFarPlanets() {
  farPlanets.length = 0;
  const maxOrbit = orbits.length
    ? orbits[orbits.length - 1].rx
    : Math.min(w, h) * 0.4;

  const exclusionRadius = maxOrbit + 100;

  for (let i = 0; i < FAR_PLANET_COUNT; i++) {
    let x, y, distToCenter, ok, guard = 0;

    do {
      x = Math.random() * w;
      y = Math.random() * h;

      const dx = x - cx;
      const dy = y - cy;
      distToCenter = Math.sqrt(dx * dx + dy * dy);

      ok = distToCenter > exclusionRadius;

      if (ok) {
        ok = farPlanets.every(p => {
          const dx2 = x - p.x;
          const dy2 = y - p.y;
          const d = Math.sqrt(dx2 * dx2 + dy2 * dy2);
          return d > FAR_PLANET_MIN_DIST;
        });
      }

      guard++;
      if (guard > 200) break;
    } while (!ok);

    farPlanets.push({
      x,
      y,
      size: Math.random() * 14 + 6,
      hue: 180 + Math.random() * 160,
      saturation: 35 + Math.random() * 35,
      lightness: 40 + Math.random() * 20,
      glow: Math.random() * 0.35 + 0.25,
      rotation: Math.random() * Math.PI * 2,
      rotationSpeed: (Math.random() * 0.0004 + 0.0001) * (Math.random() < 0.5 ? -1 : 1)
    });
  }
}
initFarPlanets();

/* -----------------------
   ☀️ Soleil central
------------------------ */
function drawSun() {
  const maxR = 55;
  const gradient = ctx.createRadialGradient(cx, cy, 5, cx, cy, maxR);
  gradient.addColorStop(0, "#fff3e0");
  gradient.addColorStop(0.4, "#ffb74d");
  gradient.addColorStop(1, "rgba(0,0,0,0)");

  ctx.fillStyle = gradient;
  ctx.beginPath();
  ctx.arc(cx, cy, maxR, 0, Math.PI * 2);
  ctx.fill();

  ctx.beginPath();
  ctx.arc(cx, cy, 28, 0, Math.PI * 2);
  ctx.fillStyle = "#ff6f00";
  ctx.fill();

  ctx.beginPath();
  ctx.arc(cx, cy, 18, 0, Math.PI * 2);
  ctx.fillStyle = "#ffcc80";
  ctx.fill();
}

/* -----------------------
   🌀 Orbites elliptiques
------------------------ */
function drawOrbits() {
  ctx.lineWidth = 1;
  ctx.strokeStyle = "rgba(255,255,255,0.18)";

  orbits.forEach(o => {
    ctx.beginPath();
    for (let a = 0; a <= Math.PI * 2 + 0.1; a += 0.05) {
      const x = cx + Math.cos(a) * o.rx;
      const y = cy + Math.sin(a) * o.ry;
      if (a === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.stroke();
  });
}

/* -----------------------
   🎨 Planètes avec dégradés
------------------------ */
function drawShadedPlanet(x, y, radius, baseColor, glowFactor = 0.5) {
  const gradient = ctx.createRadialGradient(
    x, y, radius * 0.6,
    x, y, radius * 1.1
  );

  gradient.addColorStop(0, baseColor);
  gradient.addColorStop(1, darkenColor(baseColor, 0.35));

  ctx.fillStyle = gradient;
  ctx.beginPath();
  ctx.arc(x, y, radius, 0, Math.PI * 2);
  ctx.fill();

  if (glowFactor > 0) {
    const glowGradient = ctx.createRadialGradient(
      x, y, radius,
      x, y, radius * 2.3
    );
    glowGradient.addColorStop(0, hexToRgba(baseColor, 0.35 * glowFactor));
    glowGradient.addColorStop(1, "rgba(0,0,0,0)");

    ctx.fillStyle = glowGradient;
    ctx.beginPath();
    ctx.arc(x, y, radius * 2.3, 0, Math.PI * 2);
    ctx.fill();
  }
}

function hexToRgba(hex, alpha) {
  const c = hex.replace("#", "");
  const bigint = parseInt(c, 16);
  const r = (bigint >> 16) & 255;
  const g = (bigint >> 8) & 255;
  const b = bigint & 255;
  return `rgba(${r},${g},${b},${alpha})`;
}

function lightenColor(hex, amount) {
  const c = hex.replace("#", "");
  const bigint = parseInt(c, 16);
  let r = (bigint >> 16) & 255;
  let g = (bigint >> 8) & 255;
  let b = bigint & 255;
  r = Math.min(255, r + 255 * amount);
  g = Math.min(255, g + 255 * amount);
  b = Math.min(255, b + 255 * amount);
  return "#" + ((1 << 24) + (r << 16) + (g << 8) + (b | 0)).toString(16).slice(1);
}

function darkenColor(hex, amount) {
  const c = hex.replace("#", "");
  const bigint = parseInt(c, 16);
  let r = (bigint >> 16) & 255;
  let g = (bigint >> 8) & 255;
  let b = bigint & 255;
  r = Math.max(0, r - 255 * amount);
  g = Math.max(0, g - 255 * amount);
  b = Math.max(0, b - 255 * amount);
  return "#" + ((1 << 24) + (r << 16) + (g << 8) + (b | 0)).toString(16).slice(1);
}

/* -----------------------
   🔁 Animation
------------------------ */
let t = 0;
function animate() {
  t += 1;

  ctx.fillStyle = "#020012";
  ctx.fillRect(0, 0, w, h);

  // étoiles
  for (let i = 0; i < stars.length; i++) {
    const s = stars[i];
    const alpha = s.baseAlpha + Math.sin(t * s.speed + i) * 0.25;

    ctx.beginPath();
    ctx.arc(s.x, s.y, s.size, 0, Math.PI * 2);
    ctx.fillStyle = `rgba(255,255,255,${alpha})`;
    ctx.fill();
  }

  // planètes lointaines
  farPlanets.forEach(fp => {
    fp.rotation += fp.rotationSpeed;
    drawShadedPlanet(
      fp.x,
      fp.y,
      fp.size,
      `hsl(${fp.hue}, ${fp.saturation}%, ${fp.lightness}%)`,
      fp.glow
    );
  });

  // orbites
  drawOrbits();

  // petits corps
  smallBodies.forEach(b => {
    b.angle += b.speed;
    const x = cx + Math.cos(b.angle) * b.orbit.rx;
    const y = cy + Math.sin(b.angle) * b.orbit.ry;

    ctx.beginPath();
    ctx.arc(x, y, b.size, 0, Math.PI * 2);
    ctx.fillStyle = `hsl(${b.hue}, 55%, ${b.lightness}%)`;
    ctx.fill();
  });

  // grosses planètes
  planets.forEach(p => {
    p.angle += p.speed;
    const x = cx + Math.cos(p.angle) * p.orbit.rx;
    const y = cy + Math.sin(p.angle) * p.orbit.ry;

    drawShadedPlanet(x, y, p.size, p.baseColor, 0.4);

    if (p.ring) {
      ctx.save();
      ctx.translate(x, y);
      ctx.rotate(-0.4);
      const ringGrad = ctx.createLinearGradient(-p.size * 2, 0, p.size * 2, 0);
      ringGrad.addColorStop(0, "rgba(255,255,255,0)");
      ringGrad.addColorStop(0.3, "rgba(230,230,230,0.7)");
      ringGrad.addColorStop(0.7, "rgba(230,230,230,0.7)");
      ringGrad.addColorStop(1, "rgba(255,255,255,0)");
      ctx.strokeStyle = ringGrad;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.ellipse(0, 0, p.size * 2, p.size * 0.9, 0, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
    }
  });

  drawSun();

  requestAnimationFrame(animate);
}
animate();

/* ===========================================================
   🚀 MODALE D'AUTHENTIFICATION
   =========================================================== */

const modal = document.getElementById("auth-modal");
const hero = document.getElementById("hero");
const footer = document.getElementById("footer");
const subtitle = document.querySelector(".subtitle");
const btnGoogle = document.getElementById("btn-google");
const btnGuest = document.getElementById("btn-guest");

const MODE_KEY = "politariaMode";

// ⚙️ Config OAuth Google – À REMPLACER par ton vrai client ID
const GOOGLE_CLIENT_ID = "VOTRE_CLIENT_ID_GOOGLE"; // <--- remplace ça
const GOOGLE_AUTH_ENDPOINT = "https://accounts.google.com/o/oauth2/v2/auth";

/**
 * Ouvre la modale principale
 */
function startGame() {
  modal.classList.add("show");
}

/**
 * Ferme la modale principale
 */
function closeModal() {
  modal.classList.remove("show");
}

/**
 * Ferme la modale si on clique sur le fond
 */
function backdropClick(event) {
  if (event.target === modal) {
    closeModal();
  }
}

/* -----------------------
   🔐 Actions des boutons
------------------------ */

/**
 * Connexion Google via OAuth 2.0 (redirection)
 * Redirige vers Google, qui renverra ensuite sur /games.html?mode=google
 */
function handleGoogleLogin() {
  // Sécurité : si tu n'as pas encore mis ton vrai client ID, on bloque
  if (!GOOGLE_CLIENT_ID || GOOGLE_CLIENT_ID === "VOTRE_CLIENT_ID_GOOGLE") {
    alert("OAuth Google n'est pas encore configuré (client ID manquant).");
    console.warn("Remplace GOOGLE_CLIENT_ID par ton vrai client ID Google.");
    return;
  }

  const params = new URLSearchParams({
    client_id: GOOGLE_CLIENT_ID,
    redirect_uri: "https://politaria.eu/games.html?mode=google",
    response_type: "token", // flux implicite : access_token dans le hash de l'URL
    scope: "openid email profile",
    include_granted_scopes: "true",
    state: "politaria_google_login",
    prompt: "select_account"
  });

  const url = `${GOOGLE_AUTH_ENDPOINT}?${params.toString()}`;
  window.location.href = url;
}

/**
 * Mode invité : on marque le mode en localStorage
 * puis redirection vers la page des jeux.
 */
function applyGuestModeUI() {
  if (subtitle) {
    subtitle.textContent = "Mode invité : votre premier système Politaria est en préparation…";
    subtitle.style.opacity = "1";
    subtitle.style.transform = "translateY(0)";
  }

  if (hero) {
    hero.classList.add("guest-active");
  }

  if (footer) {
    footer.textContent = "Mode invité actif. Votre progression sera stockée localement.";
    footer.classList.add("guest");
  }
}

function continueAsGuest() {
  localStorage.setItem(MODE_KEY, "guest");
  // On pourrait laisser l'UI se mettre à jour ici, mais on part directement sur la page de jeux
  window.location.href = "/games.html?mode=guest";
}

/* Connexion des boutons */
if (btnGoogle) btnGoogle.addEventListener("click", handleGoogleLogin);
if (btnGuest) btnGuest.addEventListener("click", continueAsGuest);

/* Au chargement de la page d'accueil, si déjà en invité, on ajuste l'UI */
window.addEventListener("DOMContentLoaded", () => {
  const mode = localStorage.getItem(MODE_KEY);
  if (mode === "guest") {
    applyGuestModeUI();
  }
});

/* -----------------------
   ⌨️ Fermeture avec Échap
------------------------ */
document.addEventListener("keydown", (e) => {
  if (e.key === "Escape") {
    closeModal();
    closeLegalModal();
  }
});

/* ===========================================================
   📜 MODALE LÉGALE
   =========================================================== */

const legalModal = document.getElementById("legal-modal");
const legalContent = document.getElementById("legal-content");

function openLegal(type) {
  let baseUrl;
  if (type === "conditions") {
    baseUrl = "/legal/conditions-utilisation.html";
  } else if (type === "confidentialite") {
    baseUrl = "/legal/politique-confidentialite.html";
  } else {
    return;
  }

  // on ajoute un paramètre unique pour casser le cache du navigateur/CDN
  const url = baseUrl + "?t=" + Date.now();

  fetch(url)
    .then((res) => {
      if (!res.ok) throw new Error("HTTP " + res.status);
      return res.text();
    })
    .then((html) => {
      const lower = html.toLowerCase();
      // Si jamais le serveur renvoie une page complète (index, 404, etc.)
      if (lower.includes("<html") || lower.includes("<body")) {
        throw new Error("Document complet détecté");
      }

      legalContent.innerHTML = html;
      legalModal.classList.add("show");
    })
    .catch((err) => {
      console.error(err);
      legalContent.innerHTML = `
        <h2>Document indisponible</h2>
        <p>
          Impossible de charger ce document pour le moment.
          Réessayez plus tard ou contactez le support Politaria.
        </p>
      `;
      legalModal.classList.add("show");
    });
}

function closeLegalModal() {
  legalModal.classList.remove("show");
}

function backdropLegalClick(e) {
  if (e.target === legalModal) {
    closeLegalModal();
  }
}
