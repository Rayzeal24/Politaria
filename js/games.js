"use strict";

const MODE_KEY = "politariaMode";
const SYSTEMS_KEY = "politariaSystems_v1";
const EMAIL_KEY = "politariaEmail";
const USERNAME_KEY = "politariaUsername";

const subtitle     = document.getElementById("subtitle");
const systemsText  = document.getElementById("systemsText");
const systemsList  = document.getElementById("systemsList");
const emptyState   = document.getElementById("emptyState");

const modePill     = document.getElementById("modePill");
const storagePill  = document.getElementById("storagePill");
const statusPill   = document.getElementById("statusPill");
const countPill    = document.getElementById("countPill");

const btnCreate      = document.getElementById("btnCreate");
const btnImport      = document.getElementById("btnImport");
const btnTutorial    = document.getElementById("btnTutorial");
const btnLeaderboard = document.getElementById("btnLeaderboard");
const btnSettings    = document.getElementById("btnSettings");

const profileBtn       = document.getElementById("profileBtn");
const profileMenu      = document.getElementById("profileMenu");
const profileLabelText = document.getElementById("profileLabelText");
const profileAvatar    = document.getElementById("profileAvatar");

/* ✅ Menu hamburger + mini fenêtre */
const menuBtn  = document.getElementById("menuBtn");
const miniMenu = document.getElementById("miniMenu");

/* ✅ Boutons déplacés dans la mini fenêtre */
const topCoins = document.getElementById("topCoins");
const topShop  = document.getElementById("topShop");
const topRank  = document.getElementById("topRank");
const topWiki  = document.getElementById("topWiki");

const uid = () => (crypto?.randomUUID ? crypto.randomUUID() : String(Date.now()) + "_" + Math.random().toString(16).slice(2));
const nowISO = () => new Date().toISOString();
const safeJsonParse = (s, fallback) => { try { return JSON.parse(s); } catch { return fallback; } };

function toast(msg){ alert(msg); }

function generateUsername(){
  const n = Math.floor(1000 + Math.random() * 9000);
  return "user" + n;
}

function updateProfileUI(){
  const email = localStorage.getItem(EMAIL_KEY) || "";
  let username = localStorage.getItem(USERNAME_KEY);
  if(!username){
    username = generateUsername();
    localStorage.setItem(USERNAME_KEY, username);
  }
  profileLabelText.textContent = username;

  const src = (email.trim() ? email.trim()[0] : username.trim()[0] || "U").toUpperCase();
  profileAvatar.textContent = /[A-Z0-9]/.test(src) ? src : "U";
}

/* =========================
   Session mode (simple)
   ========================= */
const hashParams = new URLSearchParams(window.location.hash.slice(1));
const googleToken = hashParams.get("access_token");
const params = new URLSearchParams(window.location.search);
const urlMode = params.get("mode");
const urlEmail = params.get("email") || hashParams.get("email");
if (urlEmail) localStorage.setItem(EMAIL_KEY, urlEmail);

const savedMode = localStorage.getItem(MODE_KEY);

function setGuestMode() {
  localStorage.setItem(MODE_KEY, "guest");
  subtitle.textContent = "Mode invité : progression locale, sans synchronisation.";
  modePill.textContent = "Invité";
  storagePill.textContent = "Local";
  statusPill.textContent = "Actif";
  systemsText.textContent = "Créez un système, testez, cassez tout… puis recommencez. Ici, l’univers vous obéit.";
  updateProfileUI();
}

function setGoogleMode() {
  localStorage.setItem(MODE_KEY, "google");
  subtitle.textContent = "Session Google détectée : synchronisation cloud à brancher.";
  modePill.textContent = "Google";
  storagePill.textContent = "Cloud (bientôt)";
  statusPill.textContent = "Actif";
  systemsText.textContent = "Bienvenue. Vos systèmes apparaîtront ici, prêts à être partagés et disputés.";
  updateProfileUI();
}

function cleanUrlHash(){
  if (window.location.hash && window.history?.replaceState) {
    history.replaceState(null, "", window.location.pathname + window.location.search);
  }
}

if (googleToken) { setGoogleMode(); cleanUrlHash(); }
else if (urlMode === "guest") setGuestMode();
else if (savedMode === "google") setGoogleMode();
else setGuestMode();

/* =========================
   Systems store
   ========================= */
function loadSystems(){ return safeJsonParse(localStorage.getItem(SYSTEMS_KEY), []); }
function saveSystems(list){ localStorage.setItem(SYSTEMS_KEY, JSON.stringify(list)); }

function renderSystems(){
  const systems = loadSystems();
  systemsList.innerHTML = "";

  countPill.textContent = String(systems.length);
  emptyState.style.display = systems.length ? "none" : "block";

  systems.sort((a,b) => (b.updatedAt || b.createdAt || "").localeCompare(a.updatedAt || a.createdAt || ""));

  for(const s of systems){
    const el = document.createElement("div");
    el.className = "system";

    const left = document.createElement("div");
    left.style.flex = "1";

    const title = document.createElement("h3");
    title.textContent = s.name || "Système sans nom";

    const meta = document.createElement("div");
    meta.className = "meta";

    const chipMode = document.createElement("span");
    chipMode.className = "chip";
    chipMode.textContent = "Mode: " + (s.mode || "Sandbox");

    const chipSeed = document.createElement("span");
    chipSeed.className = "chip";
    chipSeed.textContent = "Seed: " + (s.seed || "—");

    meta.append(chipMode, chipSeed);
    left.append(title, meta);

    const actions = document.createElement("div");
    actions.className = "actions";

    const btnPlay = document.createElement("button");
    btnPlay.className = "btn primary";
    btnPlay.textContent = "Jouer";
    btnPlay.addEventListener("click", () => toast("Mode jeu à venir. Système: " + (s.name || "—")));

    const btnDelete = document.createElement("button");
    btnDelete.className = "btn";
    btnDelete.textContent = "Supprimer";
    btnDelete.addEventListener("click", () => {
      if(confirm("Supprimer ce système ?")) {
        saveSystems(loadSystems().filter(x => x.id !== s.id));
        renderSystems();
      }
    });

    actions.append(btnPlay, btnDelete);
    el.append(left, actions);
    systemsList.appendChild(el);
  }
}

/* =========================
   Actions principales
   ========================= */
btnCreate.addEventListener("click", () => {
  const name = prompt("Nom du système :", "Nova-" + Math.floor(Math.random()*999));
  if(!name) return;

  const mode = prompt("Mode (Sandbox / Chronique / Survie / Escarmouche) :", "Sandbox") || "Sandbox";
  const seed = prompt("Seed (laisser vide = auto) :", "") || Math.floor(Math.random()*1e9).toString(16);

  const systems = loadSystems();
  systems.push({
    id: uid(),
    name: name.trim(),
    mode: mode.trim(),
    seed: seed.trim(),
    createdAt: nowISO(),
    updatedAt: nowISO()
  });
  saveSystems(systems);
  renderSystems();
});

btnImport.addEventListener("click", () => toast("Import JSON à brancher ici."));
btnTutorial.addEventListener("click", () => toast("Tutoriel à venir."));
btnLeaderboard.addEventListener("click", () => toast("Classement à venir."));
btnSettings.addEventListener("click", () => toast("Paramètres avancés à venir."));

/* =========================
   Menus : profil + mini-menu
   ========================= */

/* Mini menu (hamburger) */
menuBtn.addEventListener("click", (e) => {
  e.stopPropagation();
  // ferme l'autre si ouvert
  profileMenu.classList.remove("show");
  profileBtn.setAttribute("aria-expanded", "false");

  const isOpen = miniMenu.classList.toggle("show");
  menuBtn.setAttribute("aria-expanded", String(isOpen));
});

/* Menu profil */
profileBtn.addEventListener("click", (e) => {
  e.stopPropagation();
  // ferme l'autre si ouvert
  miniMenu.classList.remove("show");
  menuBtn.setAttribute("aria-expanded", "false");

  const isOpen = profileMenu.classList.toggle("show");
  profileBtn.setAttribute("aria-expanded", String(isOpen));
});

/* Fermer en cliquant ailleurs */
document.addEventListener("click", () => {
  miniMenu.classList.remove("show");
  menuBtn.setAttribute("aria-expanded", "false");

  profileMenu.classList.remove("show");
  profileBtn.setAttribute("aria-expanded", "false");
});

/* Liens profil */
document.getElementById("menuSave").addEventListener("click", () => toast("Sauvegarde : OK (local)."));
document.getElementById("menuLogout").addEventListener("click", () => {
  localStorage.removeItem(MODE_KEY);
  window.location.href = "index.html";
});

/* Actions du mini-menu */
topCoins.addEventListener("click", () => toast("💰 Coins : page à venir (ou branche vers shop/coins.html)."));
topShop.addEventListener("click",  () => toast("🛒 Boutique : page à venir (ou shop.html)."));
topRank.addEventListener("click",  () => toast("🏆 Classement : page à venir (ou leaderboard.html)."));
topWiki.addEventListener("click",  () => window.open("#", "_blank"));

/* Init */
renderSystems();
