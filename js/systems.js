"use strict";

window.POLITARIA = window.POLITARIA || {};
const CONFIG = window.POLITARIA.CONFIG;

POLITARIA.systems = (() => {
  const KEY = CONFIG.KEYS.SYSTEMS;

  const safeJsonParse = (s, fallback) => { try { return JSON.parse(s); } catch { return fallback; } };
  const nowISO = () => new Date().toISOString();
  const uid = () => (crypto?.randomUUID ? crypto.randomUUID() : String(Date.now()) + "_" + Math.random().toString(16).slice(2));

  function load(){ return safeJsonParse(localStorage.getItem(KEY), []); }
  function save(list){ localStorage.setItem(KEY, JSON.stringify(list)); }

  function add({ name, mode, seed }){
    const list = load();
    list.push({
      id: uid(),
      name, mode, seed,
      createdAt: nowISO(),
      updatedAt: nowISO(),
      planets: [], factions: [], events: []
    });
    save(list);
  }

  function update(id, patch){
    const list = load();
    const i = list.findIndex(x => x.id === id);
    if(i === -1) return;
    list[i] = { ...list[i], ...patch, updatedAt: nowISO() };
    save(list);
  }

  function remove(id){
    save(load().filter(x => x.id !== id));
  }

  return { load, add, update, remove };
})();
