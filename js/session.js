"use strict";
window.POLITARIA = window.POLITARIA || {};

const CONFIG = (window.POLITARIA.CONFIG || {
  ROUTES: { HOME: "/index.html", GAMES: "/games.html" },
  KEYS: { MODE:"politariaMode", EMAIL:"politariaEmail", COINS:"politariaCoins", SYSTEMS:"politariaSystems_v1" }
});

POLITARIA.session = (() => {
  const K = CONFIG.KEYS;
  const R = CONFIG.ROUTES;

  function parseUrl(){
    const hashParams = new URLSearchParams(location.hash.slice(1));
    const params = new URLSearchParams(location.search);
    return {
      googleToken: hashParams.get("access_token"),
      email: params.get("email") || hashParams.get("email"),
      urlMode: params.get("mode"),
    };
  }

  function cleanHash(){
    if (location.hash && history?.replaceState) {
      history.replaceState(null, "", location.pathname + location.search);
    }
  }

  function getInitialFromEmail(email){
    const s = String(email || "").trim();
    if(!s) return "I";
    const c = s[0].toUpperCase();
    return /[A-Z0-9]/.test(c) ? c : "I";
  }

  function setMode(mode){ localStorage.setItem(K.MODE, mode); }
  function getMode(){ return localStorage.getItem(K.MODE) || "guest"; }

  function setEmail(email){ if(email) localStorage.setItem(K.EMAIL, email); }
  function getEmail(){ return localStorage.getItem(K.EMAIL) || ""; }

  function logout(){
    localStorage.removeItem(K.MODE);
    location.href = R.HOME;
  }

  function initFromUrl(){
    const u = parseUrl();
    if (u.email) setEmail(u.email);

    if (u.googleToken) {
      setMode("google");
      cleanHash();
      return "google";
    }
    if (u.urlMode === "guest") {
      setMode("guest");
      return "guest";
    }
    return getMode();
  }

  return { initFromUrl, getMode, getEmail, getInitialFromEmail, logout };
})();
