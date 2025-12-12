"use strict";

// ✅ On crée l’objet global ET on crée l’identifiant POLITARIA
const POLITARIA = (window.POLITARIA = window.POLITARIA || {});

POLITARIA.CONFIG = {
  ROUTES: {
    HOME: "index.html",
    GAMES: "games.html"
  },
  KEYS: {
    MODE: "politariaMode",
    EMAIL: "politariaEmail",
    COINS: "politariaCoins",
    SYSTEMS: "politariaSystems_v1"
  }
};
