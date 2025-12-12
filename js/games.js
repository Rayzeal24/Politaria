"use strict";

const { CONFIG, session, systems } = window.POLITARIA;

(() => {
  const K = CONFIG.KEYS;

  // DOM
  const subtitle     = document.getElementById("subtitle");
  const systemsText  = document.getElementById("systemsText");
  const systemsList  = document.getElementById("systemsList");
  const emptyState   = document.getElementById("emptyState");

  const modePill     = document.getElementById("modePill");
  const storagePill  = document.getElementById("storagePill");
  const statusPill   = document.getElementById("statusPill");
  const countPill    = document.getElementById("countPill");

  const walletAmount = document.getElementById("walletAmount");

  const profileBtn     = document.getElementById("profileBtn");
  const profileMenu    = document.getElementById("profileMenu");
  const profileLabel   = document.getElementById("profileLabel");
  const profileInitial = document.getElementById("profileInitial");
  const menuSave       = document.getElementById("menuSave");
  const menuLogout     = document.getElementById("menuLogout");

  const btnCreate      = document.getElementById("btnCreate");
  const btnImport      = document.getElementById("btnImport");
  const btnTutorial    = document.getElementById("btnTutorial");
  const btnLeaderboard = document.getElementById("btnLeaderboard");
  const btnSettings    = document.getElementById("btnSettings");

  const toast = (m) => alert(m);
  const formatDots = (n) => String(Math.floor(Number(n||0))).replace(/\B(?=(\d{3})+(?!\d))/g, ".");

  function setCoinsUI(){
    if (!localStorage.getItem(K.COINS)) localStorage.setItem(K.COINS, "1000");
    walletAmount.textContent = "$" + formatDots(localStorage.getItem(K.COINS));
  }

  function applyModeUI(mode){
    const email = session.getEmail();

    if(mode === "google"){
      subtitle.textContent = "Session Google détectée : synchronisation cloud à brancher.";
      modePill.textContent = "Google";
      storagePill.textContent = "Cloud (bientôt)";
      statusPill.textContent = "Actif";
      systemsText.textContent = "Bienvenue. Vos systèmes apparaîtront ici, prêts à être partagés et disputés.";
      profileLabel.textContent = "Compte Google";
      profileInitial.textContent = session.getInitialFromEmail(email) || "G";
    } else {
      subtitle.textContent = "Mode invité : progression locale, sans synchronisation.";
      modePill.textContent = "Invité";
      storagePill.textContent = "Local";
      statusPill.textContent = "Actif";
      systemsText.textContent = "Créez un système, testez, cassez tout… puis recommencez. Ici, l’univers vous obéit.";
      profileLabel.textContent = "Invité";
      profileInitial.textContent = "I";
    }
  }

  function renderSystems(){
    const list = systems.load();
    systemsList.innerHTML = "";

    countPill.textContent = String(list.length);
    emptyState.style.display = list.length ? "none" : "block";

    list.sort((a,b) => (b.updatedAt || b.createdAt || "").localeCompare(a.updatedAt || a.createdAt || ""));

    for(const s of list){
      const el = document.createElement("div");
      el.className = "system";

      const left = document.createElement("div");
      left.style.flex = "1";

      const title = document.createElement("h3");
      title.textContent = s.name || "Système sans nom";

      const meta = document.createElement("div");
      meta.className = "meta";
      meta.innerHTML = `
        <span class="chip">Mode: ${s.mode || "Sandbox"}</span>
        <span class="chip">Seed: ${s.seed || "—"}</span>
        <span class="chip">Maj: ${s.updatedAt ? new Date(s.updatedAt).toLocaleString() : "—"}</span>
      `;

      left.append(title, meta);

      const actions = document.createElement("div");
      actions.className = "actions";

      const play = document.createElement("button");
      play.className = "btn primary";
      play.textContent = "Jouer";
      play.onclick = () => toast("Mode jeu à venir. Système: " + (s.name || "—"));

      const rename = document.createElement("button");
      rename.className = "btn";
      rename.textContent = "Renommer";
      rename.onclick = () => {
        const name = prompt("Nouveau nom :", s.name || "");
        if(!name) return;
        systems.update(s.id, { name: name.trim() });
        renderSystems();
      };

      const del = document.createElement("button");
      del.className = "btn";
      del.textContent = "Supprimer";
      del.onclick = () => {
        if(confirm("Supprimer ce système ?")) {
          systems.remove(s.id);
          renderSystems();
        }
      };

      actions.append(play, rename, del);
      el.append(left, actions);
      systemsList.appendChild(el);
    }
  }

  // menu profil
  profileBtn.addEventListener("click", (e) => {
    e.stopPropagation();
    const open = profileMenu.classList.toggle("show");
    profileBtn.setAttribute("aria-expanded", String(open));
  });

  document.addEventListener("click", () => {
    profileMenu.classList.remove("show");
    profileBtn.setAttribute("aria-expanded", "false");
  });

  menuSave.addEventListener("click", () => toast("Sauvegarde : OK (local). Cloud à brancher ensuite."));
  menuLogout.addEventListener("click", () => session.logout());

  // actions
  btnCreate.addEventListener("click", () => {
    const name = prompt("Nom du système :", "Nova-" + Math.floor(Math.random()*999));
    if(!name) return;

    const mode = prompt("Mode (Sandbox / Chronique / Survie / Escarmouche) :", "Sandbox") || "Sandbox";
    const seed = prompt("Seed (laisser vide = auto) :", "") || Math.floor(Math.random()*1e9).toString(16);

    systems.add({ name: name.trim(), mode: mode.trim(), seed: seed.trim() });
    renderSystems();
  });

  btnImport.addEventListener("click", () => toast("Import JSON à brancher ici."));
  btnTutorial.addEventListener("click", () => toast("Tutoriel à venir."));
  btnLeaderboard.addEventListener("click", () => toast("Classement à venir."));
  btnSettings.addEventListener("click", () => toast("Paramètres à venir."));

  // init (porte d’entrée login/inscription)
  const mode = session.initFromUrl();
  applyModeUI(mode);
  setCoinsUI();
  renderSystems();
})();
