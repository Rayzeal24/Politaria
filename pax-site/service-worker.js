self.addEventListener("install", (event) => {
  console.log("Service worker installé (Mini Pax)");
  // Plus tard, tu pourras ajouter ici la mise en cache des fichiers.
});

self.addEventListener("fetch", (event) => {
  // Pour l'instant, on laisse passer toutes les requêtes normalement.
});
