"use strict";

/* ===========================================================
   Politaria — Games
   - Guest: localStorage (par "guest")
   - Google: Supabase Auth (session) + pseudo localStorage par user.id
   =========================================================== */

const MODE_KEY = "politariaMode";
const SYSTEMS_KEY = "politariaSystems_v1";

/* ✅ Nouveau: pseudo par user */
const USERNAME_PREFIX = "politariaUsername_"; // + userId | guest

/* UI */
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

/* Profil menu buttons */
const menuSaveBtn   = document.getElementById("menuSave");
const menuLogoutBtn = document.getElementById("menuLogout");

/* Utils */
const uid = () => (crypto?.randomUUID ? crypto.randomUUID() : String(Date.now()) + "_" + Math.random().toString(16).slice(2));
const nowISO = () => new Date().toISOString();
const safeJsonParse = (s, fallback) => { try { return JSON.parse(s); } catch { return fallback; } };

function toast(msg){ alert(msg); }

function cleanUrlHash(){
  // Supabase OAuth met parfois des infos dans le hash. On le nettoie pour éviter des bugs.
  if (window.location.hash && window.history?.replaceState) {
    history.replaceState(null, "", window.location.pathname + window.location.search);
  }
}

/* ===========================================================
   Supabase (Auth)
   =========================================================== */
function ensureSupabase(){
  if (!window.sb) {
    console.error("Supabase client introuvable. Vérifie que js/supabase.js est chargé AVANT games.js");
    return false;
  }
  return true;
}

async function getSessionSafe(){
  if (!ensureSupabase()) return null;
  try{
    const { data, error } = await window.sb.auth.getSession();
    if (error) throw error;
    return data?.session || null;
  }catch(err){
    console.error("getSession error:", err);
    return null;
  }
}

function getProfileFromSession(session){
  if (!session?.user) return null;
  const u = session.user;

  const meta = u.user_metadata || {};
  const email = u.email || meta.email || "";
  const name =
    meta.full_name ||
    meta.name ||
    meta.user_name ||
    meta.preferred_username ||
    (email ? email.split("@")[0] : "") ||
    "Utilisateur";

  return { id: u.id, email, name };
}

/* ===========================================================
   Username (par user)
   =========================================================== */
function generateUsername(){
  // un peu plus "unique" que user1234 (mais on reste simple)
  const a = Math.floor(1000 + Math.random() * 9000);
  const b = Math.floor(10 + Math.random() * 90);
  return "user" + a + b; // ex: user74451
}

function sanitizeUsername(raw){
  const s = (raw ?? "").trim();

  // règles simples: 3-20, lettres/chiffres/_-
  if (s.length < 3 || s.length > 20) return null;
  if (!/^[a-zA-Z0-9_-]+$/.test(s)) return null;

  return s;
}

async function getUsernameKey(){
  const mode = localStorage.getItem(MODE_KEY) || "guest";

  if (mode !== "google") {
    return USERNAME_PREFIX + "guest";
  }

  const session = await getSessionSafe();
  const userId = session?.user?.id;

  // fallback si pas de session => guest
  if (!userId) return USERNAME_PREFIX + "guest";

  return USERNAME_PREFIX + userId;
}

async function getOrCreateUsername(){
  const key = await getUsernameKey();

  let username = localStorage.getItem(key);
  if (!username) {
    username = generateUsername();
    localStorage.setItem(key, username);
  }
  return { key, username };
}

function setProfileUIFromUsername(username){
  const label = username || "Invité";
  profileLabelText.textContent = label;

  const initial = (label.trim()[0] || "U").toUpperCase();
  profileAvatar.textContent = /[A-Z0-9]/.test(initial) ? initial : "U";
}

async function updateProfileUI(){
  const { username } = await getOrCreateUsername();
  setProfileUIFromUsername(username);
}

async function changeUsername(){
  const { key, username } = await getOrCreateUsername();

  const next = prompt(
    "Choisis ton pseudo (3-20 caractères, lettres/chiffres/_-)\nEx: Nova_77, Yukari-01",
    username
  );

  if (next === null) return; // annulé

  const clean = sanitizeUsername(next);
  if (!clean) {
    toast("Pseudo invalide.\nRègles: 3-20 caractères, uniquement lettres/chiffres/_-");
    return;
  }

  localStorage.setItem(key, clean);
  setProfileUIFromUsername(clean);
}

/* ===========================================================
   Mode + Profil UI
   =========================================================== */
async function setGuestModeUI(){
  localStorage.setItem(MODE_KEY, "guest");
  subtitle.textContent = "Mode invité : progression locale, sans synchronisation.";
  modePill.textContent = "Invité";
  storagePill.textContent = "Local";
  statusPill.textContent = "Actif";
  systemsText.textContent = "Créez un système, testez, cassez tout… puis recommencez. Ici, l’univers vous obéit.";

  await updateProfileUI();
}

async function setGoogleModeUI(_profile){
  localStorage.setItem(MODE_KEY, "google");
  subtitle.textContent = "Connecté : vos systèmes peuvent être synchronisés dans le cloud.";
  modePill.textContent = "Google";
  storagePill.textContent = "Local (sync à brancher)";
  statusPill.textContent = "Actif";
  systemsText.textContent = "Bienvenue. Vos systèmes apparaîtront ici, prêts à être partagés et disputés.";

  // ✅ on affiche le pseudo "Politaria" (par user) au lieu du nom Google
  await updateProfileUI();
}

async function resolveModeAndProfile(){
  // 1) Si session Supabase existe => Google mode
  const session = await getSessionSafe();
  if (session){
    const profile = getProfileFromSession(session);
    await setGoogleModeUI(profile);
    cleanUrlHash();
    return { mode: "google", profile, session };
  }

  // 2) Sinon, si URL a ?mode=guest => guest
  const params = new URLSearchParams(window.location.search);
  const urlMode = params.get("mode");
  if (urlMode === "guest"){
    await setGuestModeUI();
    cleanUrlHash();
    return { mode: "guest", profile: null, session: null };
  }

  // 3) Sinon, fallback guest
  await setGuestModeUI();
  cleanUrlHash();
  return { mode: "guest", profile: null, session: null };
}

/* ===========================================================
   Systems store (local)
   =========================================================== */
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

/* ===========================================================
   Actions principales
   =========================================================== */
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

/* ===========================================================
   Menus : profil + mini-menu
   =========================================================== */

/* Mini menu (hamburger) */
menuBtn.addEventListener("click", (e) => {
  e.stopPropagation();
  profileMenu.classList.remove("show");
  profileBtn.setAttribute("aria-expanded", "false");

  const isOpen = miniMenu.classList.toggle("show");
  menuBtn.setAttribute("aria-expanded", String(isOpen));
});

/* Menu profil */
profileBtn.addEventListener("click", (e) => {
  e.stopPropagation();
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
menuSaveBtn.addEventListener("click", () => {
  const mode = localStorage.getItem(MODE_KEY) || "guest";
  if (mode === "google") {
    toast("Sauvegarde : en local pour l’instant. (Ensuite on branchera la base Supabase)");
  } else {
    toast("Sauvegarde : OK (local).");
  }
});

menuLogoutBtn.addEventListener("click", async () => {
  // si user Google => logout Supabase
  if (ensureSupabase()){
    try{
      await window.sb.auth.signOut();
    }catch(err){
      console.error("signOut error:", err);
    }
  }

  // retour mode invité
  localStorage.removeItem(MODE_KEY);
  window.location.href = "index.html";
});

/* ✅ Bonus: changer pseudo en cliquant sur l'avatar/nom (simple) */
profileLabelText.addEventListener("click", (e) => {
  e.stopPropagation();
  changeUsername();
});
profileAvatar.addEventListener("click", (e) => {
  e.stopPropagation();
  changeUsername();
});

/* Actions du mini-menu */
topCoins.addEventListener("click", () => toast("🎛️ Preset : page à venir."));
topShop.addEventListener("click",  () => toast("⭐ Star : page à venir."));
topRank.addEventListener("click",  () => toast("🏆 Classement : page à venir."));
topWiki.addEventListener("click",  () => window.open("#", "_blank"));

/* ===========================================================
   Boot
   =========================================================== */
(async function boot(){
  await resolveModeAndProfile();
  renderSystems();

  // Si la session change (connexion/déconnexion), on met à jour l’UI
  if (ensureSupabase()){
    window.sb.auth.onAuthStateChange(async (_event, session) => {
      if (session){
        const profile = getProfileFromSession(session);
        await setGoogleModeUI(profile);
      }else{
        await setGuestModeUI();
      }
      renderSystems();
    });
  }
})();
