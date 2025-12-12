"use strict";

window.POLITARIA = window.POLITARIA || {};
console.log("games.js loaded ✅", location.href);

document.addEventListener("DOMContentLoaded", () => {
  const subtitle = document.getElementById("subtitle");
  if (subtitle) subtitle.textContent = "JS OK ✅ (si tu vois ça, les boutons doivent répondre)";

  const btnCreate      = document.getElementById("btnCreate");
  const btnImport      = document.getElementById("btnImport");
  const btnTutorial    = document.getElementById("btnTutorial");
  const btnLeaderboard = document.getElementById("btnLeaderboard");
  const btnSettings    = document.getElementById("btnSettings");

  // Si un bouton est null => ton HTML n’est pas celui servi en prod
  console.log("BTN refs:", {
    btnCreate, btnImport, btnTutorial, btnLeaderboard, btnSettings
  });

  const toast = (m) => alert(m);

  // ✅ events (ultra simples)
  if (btnCreate) btnCreate.addEventListener("click", () => toast("Clique: Créer ✅"));
  if (btnImport) btnImport.addEventListener("click", () => toast("Clique: Importer ✅"));
  if (btnTutorial) btnTutorial.addEventListener("click", () => toast("Clique: Tutoriel ✅"));
  if (btnLeaderboard) btnLeaderboard.addEventListener("click", () => toast("Clique: Classement ✅"));
  if (btnSettings) btnSettings.addEventListener("click", () => toast("Clique: Paramètres ✅"));

  // ✅ menu profil (au cas où)
  const profileBtn  = document.getElementById("profileBtn");
  const profileMenu = document.getElementById("profileMenu");
  if (profileBtn && profileMenu) {
    profileBtn.addEventListener("click", (e) => {
      e.stopPropagation();
      profileMenu.classList.toggle("show");
    });
    document.addEventListener("click", () => profileMenu.classList.remove("show"));
  }
});
