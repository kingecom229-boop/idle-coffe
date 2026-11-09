/* ===========================================================
   IDLE COFFEE — moteur de jeu (vanilla JS, sans dépendances)
   =========================================================== */

const SAVE_KEY = "idleCoffeeSaveV1";
const TICK_MS = 100; // 10 ticks / sec
const AUTOSAVE_MS = 10000;
const OFFLINE_CAP_SECONDS = 4 * 3600; // 4h max de gains hors-ligne
const OFFLINE_EFFICIENCY = 0.5; // 50% du cps pendant l'absence

/* ---------------------- DONNÉES DE BASE ---------------------- */

const PRODUCERS = [
  { id: "intern",     name: "Stagiaire barista",        icon: "🧑‍🎓", baseCost: 15,          baseCps: 0.1,    desc: "Un stagiaire motivé, mais encore maladroit." },
  { id: "barista",    name: "Barista expérimenté",      icon: "🧑‍🍳", baseCost: 100,         baseCps: 1,      desc: "Maîtrise le latte art à la perfection." },
  { id: "machine",    name: "Machine expresso auto",    icon: "☕",   baseCost: 1100,        baseCps: 8,      desc: "Prépare des cafés sans jamais se fatiguer." },
  { id: "roaster",    name: "Torréfacteur",             icon: "🔥",   baseCost: 12000,       baseCps: 47,     desc: "Torréfie des grains en continu pour toute l'équipe." },
  { id: "truck",      name: "Camion à café ambulant",   icon: "🚚",   baseCost: 130000,      baseCps: 260,    desc: "Vend du café dans toute la ville." },
  { id: "cafe",       name: "Chaîne de cafés",          icon: "🏪",   baseCost: 1400000,     baseCps: 1400,   desc: "Plusieurs boutiques qui tournent à plein régime." },
  { id: "franchise",  name: "Franchise internationale", icon: "🏢",   baseCost: 20000000,    baseCps: 7800,   desc: "Ton logo est maintenant connu dans le monde entier." },
  { id: "plantation", name: "Plantation robotisée",     icon: "🌱",   baseCost: 330000000,   baseCps: 44000,  desc: "Des robots récoltent le café 24h/24." },
  { id: "satellite",  name: "Station orbitale à café",  icon: "🛰️",  baseCost: 5100000000,  baseCps: 260000, desc: "Le café est maintenant préparé... dans l'espace." },
];

const COST_GROWTH = 1.15;

const CLICK_UPGRADES = [
  { id: "click1", name: "Grains premium",     icon: "🌰", cost: 50,      mult: 2, desc: "Double la puissance de ton clic." },
  { id: "click2", name: "Moulin électrique",  icon: "⚙️", cost: 500,     mult: 2, desc: "Double encore la puissance de ton clic." },
  { id: "click3", name: "Tasse géante",       icon: "🥤", cost: 8000,    mult: 2, desc: "Plus de café par clic grâce à une tasse XXL." },
  { id: "click4", name: "Technique du barista pro", icon: "🎯", cost: 100000, mult: 2, desc: "Un geste précis pour un clic plus efficace." },
  { id: "click5", name: "Gant vibrant premium", icon: "🧤", cost: 2000000, mult: 2, desc: "La technologie au service du clic parfait." },
  { id: "click6", name: "Rituel du maître torréfacteur", icon: "🧙", cost: 50000000, mult: 3, desc: "Un savoir ancestral décuple ton clic." },
];

const GLOBAL_UPGRADES = [
  { id: "global1", name: "Café équitable",       icon: "🌍", cost: 2000,      mult: 1.25, desc: "+25% à toute la production de café." },
  { id: "global2", name: "Publicité radio",       icon: "📻", cost: 45000,     mult: 1.25, desc: "+25% à toute la production de café." },
  { id: "global3", name: "Partenariat exclusif",  icon: "🤝", cost: 900000,    mult: 1.5,  desc: "+50% à toute la production de café." },
  { id: "global4", name: "Certification qualité", icon: "🏅", cost: 15000000,  mult: 1.5,  desc: "+50% à toute la production de café." },
  { id: "global5", name: "Empire du café",        icon: "👑", cost: 400000000, mult: 2,    desc: "Double toute la production de café." },
];

const MILESTONES = [10, 25, 50, 100, 200];

const PRODUCER_UPGRADES = [];
PRODUCERS.forEach((p) => {
  MILESTONES.forEach((m, idx) => {
    PRODUCER_UPGRADES.push({
      id: `${p.id}_x2_${m}`,
      producerId: p.id,
      requireCount: m,
      name: `${p.name} — Niveau ${idx + 1}`,
      icon: "⭐",
      cost: Math.round(p.baseCost * m * 8 * Math.pow(1.8, idx)),
      mult: 2,
      desc: `Double la production de "${p.name}" (nécessite ${m} possédé(s)).`,
    });
  });
});

/* ---------------------- ÉTAT DU JEU ---------------------- */

function freshState() {
  const producers = {};
  PRODUCERS.forEach((p) => (producers[p.id] = 0));
  const upgrades = {};
  [...CLICK_UPGRADES, ...GLOBAL_UPGRADES, ...PRODUCER_UPGRADES].forEach(
    (u) => (upgrades[u.id] = false)
  );

  return {
    coffee: 0,
    totalEarned: 0,
    lifetimeEarned: 0,
    totalClickEarned: 0,
    clicks: 0,
    goldenFound: 0,
    playtime: 0,
    prestigePoints: 0,
    prestigeCount: 0,
    producers,
    upgrades,
    buyAmount: 1,
    muted: false,
    lastSave: Date.now(),
  };
}

let state = loadGame();

function loadGame() {
  try {
    const raw = localStorage.getItem(SAVE_KEY);
    if (!raw) return freshState();
    const parsed = JSON.parse(raw);
    const base = freshState();
    // fusion défensive pour compat future
    const merged = { ...base, ...parsed };
    merged.producers = { ...base.producers, ...(parsed.producers || {}) };
    merged.upgrades = { ...base.upgrades, ...(parsed.upgrades || {}) };
    return merged;
  } catch (e) {
    console.warn("Save corrompue, nouvelle partie.", e);
    return freshState();
  }
}

function saveGame(showIndicator = true) {
  state.lastSave = Date.now();
  localStorage.setItem(SAVE_KEY, JSON.stringify(state));
  if (showIndicator) flashSaveIndicator();
}

function flashSaveIndicator() {
  const el = document.getElementById("saveIndicator");
  el.textContent = "✓ Sauvegardé";
  el.classList.add("show");
  clearTimeout(flashSaveIndicator._t);
  flashSaveIndicator._t = setTimeout(() => el.classList.remove("show"), 1200);
}

/* ---------------------- CALCULS ---------------------- */

function producerCost(p, countOverride = null) {
  const owned = countOverride === null ? state.producers[p.id] : countOverride;
  return Math.ceil(p.baseCost * Math.pow(COST_GROWTH, owned));
}

function producerMultiplier(p) {
  let mult = 1;
  PRODUCER_UPGRADES.forEach((u) => {
    if (u.producerId === p.id && state.upgrades[u.id]) mult *= u.mult;
  });
  return mult;
}

function globalMultiplier() {
  let mult = 1 + state.prestigePoints * 0.02;
  GLOBAL_UPGRADES.forEach((u) => {
    if (state.upgrades[u.id]) mult *= u.mult;
  });
  if (activeBuff && activeBuff.expiresAt > Date.now()) {
    mult *= activeBuff.multiplier;
  }
  return mult;
}

function totalCps() {
  let sum = 0;
  PRODUCERS.forEach((p) => {
    sum += state.producers[p.id] * p.baseCps * producerMultiplier(p);
  });
  return sum * globalMultiplier();
}

function clickPower() {
  let mult = 1;
  CLICK_UPGRADES.forEach((u) => {
    if (state.upgrades[u.id]) mult *= u.mult;
  });
  const base = 1 * mult;
  const rawCps = PRODUCERS.reduce(
    (sum, p) => sum + state.producers[p.id] * p.baseCps * producerMultiplier(p),
    0
  );
  const cpsBonus = rawCps * 0.05; // un clic vaut aussi 5% du cps de base (hors multiplicateurs globaux)
  return (base + cpsBonus) * globalMultiplier();
}

let activeBuff = null; // { multiplier, expiresAt }

/* ---------------------- FORMAT ---------------------- */

function formatNumber(n) {
  if (n < 1000) {
    return n < 10 && n !== Math.floor(n) ? n.toFixed(1) : Math.floor(n).toString();
  }
  const suffixes = ["", "K", "M", "B", "T", "Qa", "Qi", "Sx", "Sp", "Oc", "No", "Dc"];
  const tier = Math.min(Math.floor(Math.log10(n) / 3), suffixes.length - 1);
  const scaled = n / Math.pow(1000, tier);
  return scaled.toFixed(scaled < 10 ? 2 : scaled < 100 ? 1 : 0) + suffixes[tier];
}

function formatTime(sec) {
  sec = Math.floor(sec);
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  const s = sec % 60;
  if (h > 0) return `${h}h ${m}m`;
  if (m > 0) return `${m}m ${s}s`;
  return `${s}s`;
}

/* ---------------------- ACTIONS ---------------------- */

function doClick(x, y) {
  const gain = clickPower();
  addCoffee(gain, true);
  state.clicks++;
  spawnFloater(gain, x, y);
  bounceCup();
}

function addCoffee(amount, fromClick = false) {
  state.coffee += amount;
  state.totalEarned += amount;
  state.lifetimeEarned += amount;
  if (fromClick) state.totalClickEarned += amount;
}

function buyProducer(p, amount) {
  let bought = 0;
  let cost = 0;
  if (amount === "max") {
    while (true) {
      const c = producerCost(p, state.producers[p.id] + bought);
      if (state.coffee - cost < c) break;
      cost += c;
      bought++;
    }
  } else {
    for (let i = 0; i < amount; i++) {
      const c = producerCost(p, state.producers[p.id] + bought);
      if (state.coffee - cost < c) break;
      cost += c;
      bought++;
    }
  }
  if (bought > 0) {
    state.coffee -= cost;
    state.producers[p.id] += bought;
  }
  return bought;
}

function buyUpgrade(u) {
  if (state.upgrades[u.id]) return false;
  if (state.coffee < u.cost) return false;
  state.coffee -= u.cost;
  state.upgrades[u.id] = true;
  return true;
}

function canShowProducerUpgrade(u) {
  return state.producers[u.producerId] >= u.requireCount;
}

/* ---------------------- GOLDEN BEAN ---------------------- */

let goldenTimer = null;

function scheduleGoldenBean() {
  const delay = 35000 + Math.random() * 45000; // 35-80s
  goldenTimer = setTimeout(spawnGoldenBean, delay);
}

function spawnGoldenBean() {
  const zone = document.querySelector(".clicker-zone");
  const bean = document.getElementById("goldenBean");
  const margin = 40;
  const maxX = zone.clientWidth - margin;
  const maxY = zone.clientHeight - margin;
  bean.style.left = Math.max(10, Math.random() * maxX) + "px";
  bean.style.top = Math.max(10, Math.random() * maxY) + "px";
  bean.classList.remove("hidden");

  const despawn = setTimeout(() => {
    bean.classList.add("hidden");
    scheduleGoldenBean();
  }, 8000);

  bean.onclick = () => {
    clearTimeout(despawn);
    bean.classList.add("hidden");
    state.goldenFound++;
    triggerGoldenEffect();
    scheduleGoldenBean();
  };
}

function triggerGoldenEffect() {
  const roll = Math.random();
  if (roll < 0.5) {
    // frénésie: production x7 pendant 45s
    activeBuff = { multiplier: 7, expiresAt: Date.now() + 45000 };
  } else {
    // pluie de café: gain instantané
    const bonus = Math.max(totalCps() * 90, 500);
    addCoffee(bonus, false);
    const rect = el("cupButton").getBoundingClientRect();
    spawnFloater(bonus, rect.left + rect.width / 2, rect.top + rect.height / 2, true);
  }
}

/* ---------------------- PRESTIGE ---------------------- */

function prestigeGainPreview() {
  const projected = state.lifetimeEarned;
  const totalPoints = Math.floor(Math.sqrt(projected / 1e5));
  return Math.max(0, totalPoints - state.prestigePoints);
}

function doPrestige() {
  const gain = prestigeGainPreview();
  if (gain <= 0) return false;
  state.prestigePoints += gain;
  state.prestigeCount++;
  state.coffee = 0;
  state.totalEarned = 0;
  PRODUCERS.forEach((p) => (state.producers[p.id] = 0));
  [...CLICK_UPGRADES, ...GLOBAL_UPGRADES, ...PRODUCER_UPGRADES].forEach(
    (u) => (state.upgrades[u.id] = false)
  );
  return true;
}

/* ---------------------- RENDU UI ---------------------- */

const el = (id) => document.getElementById(id);

function render() {
  el("coffeeCount").textContent = formatNumber(state.coffee);
  el("cpsValue").textContent = formatNumber(totalCps());
  el("cpcValue").textContent = formatNumber(clickPower());
  el("prestigeLevel").textContent = formatNumber(state.prestigePoints);

  renderProducers();
  renderUpgrades();
  renderPrestigeTab();
  renderStatsTab();
}

function renderProducers() {
  const list = el("producerList");
  const amount = state.buyAmount;
  list.innerHTML = "";
  PRODUCERS.forEach((p) => {
    const owned = state.producers[p.id];
    const cost = producerCost(p);
    const affordable = state.coffee >= cost;
    const card = document.createElement("div");
    card.className = "producer-card" + (affordable ? "" : " disabled");
    const cps = p.baseCps * producerMultiplier(p);
    card.innerHTML = `
      <div class="p-icon">${p.icon}</div>
      <div class="p-info">
        <div class="p-name">${p.name}</div>
        <div class="p-desc">${p.desc}</div>
        <div class="p-meta">${formatNumber(cps)} ☕/s chacun • Total: ${formatNumber(owned * cps)} ☕/s</div>
      </div>
      <div class="p-right">
        <div class="p-count">x${owned}</div>
        <div class="p-cost ${affordable ? "afford" : ""}">${formatNumber(cost)} ☕</div>
      </div>
    `;
    card.addEventListener("click", () => {
      const bought = buyProducer(p, amount);
      if (bought > 0) {
        render();
        saveGame(false);
      }
    });
    list.appendChild(card);
  });
}

function renderUpgrades() {
  const list = el("upgradeList");
  list.innerHTML = "";

  const sections = [
    { title: "🖱️ Clic", items: CLICK_UPGRADES.filter((u) => !state.upgrades[u.id]) },
    { title: "🌍 Production globale", items: GLOBAL_UPGRADES.filter((u) => !state.upgrades[u.id]) },
    {
      title: "⭐ Spécialisations",
      items: PRODUCER_UPGRADES.filter(
        (u) => !state.upgrades[u.id] && canShowProducerUpgrade(u)
      ),
    },
  ];

  let any = false;
  sections.forEach((section) => {
    if (section.items.length === 0) return;
    any = true;
    const h = document.createElement("h3");
    h.textContent = section.title;
    h.style.color = "var(--accent-light)";
    h.style.fontSize = "0.85rem";
    h.style.margin = "10px 4px";
    list.appendChild(h);

    section.items.forEach((u) => {
      const affordable = state.coffee >= u.cost;
      const card = document.createElement("div");
      card.className = "upgrade-card" + (affordable ? "" : " disabled");
      card.innerHTML = `
        <div class="u-icon">${u.icon}</div>
        <div class="u-info">
          <div class="u-name">${u.name}</div>
          <div class="u-desc">${u.desc}</div>
        </div>
        <div class="p-right">
          <div class="u-cost ${affordable ? "afford" : ""}">${formatNumber(u.cost)} ☕</div>
        </div>
      `;
      card.addEventListener("click", () => {
        if (buyUpgrade(u)) {
          render();
          saveGame(false);
        }
      });
      list.appendChild(card);
    });
  });

  if (!any) {
    list.innerHTML = `<p style="color:var(--cream-dim);text-align:center;margin-top:30px;">Toutes les améliorations disponibles sont achetées !<br/>Continue à produire pour en débloquer d'autres.</p>`;
  }
}

function renderPrestigeTab() {
  el("prestigeCurrent").textContent = formatNumber(state.prestigePoints);
  el("prestigeBonus").textContent = "+" + Math.round(state.prestigePoints * 2) + "%";
  const gain = prestigeGainPreview();
  el("prestigeGain").textContent = formatNumber(gain);
  const btn = el("doPrestigeBtn");
  btn.disabled = gain <= 0;
  btn.textContent =
    gain > 0
      ? `Faire une Torréfaction Légendaire (+${formatNumber(gain)} grains dorés)`
      : "Gagne plus de café pour débloquer un prestige";
}

function renderStatsTab() {
  el("statTotal").textContent = formatNumber(state.lifetimeEarned);
  el("statTotalClicks").textContent = formatNumber(state.totalClickEarned);
  el("statClicks").textContent = formatNumber(state.clicks);
  el("statGoldenFound").textContent = formatNumber(state.goldenFound);
  el("statPlaytime").textContent = formatTime(state.playtime);
  el("statPrestiges").textContent = formatNumber(state.prestigeCount);
}

/* ---------------------- EFFETS VISUELS ---------------------- */

function spawnFloater(amount, clientX, clientY, big = false) {
  const floaters = el("floaters");
  const rect = floaters.getBoundingClientRect();
  const span = document.createElement("span");
  span.className = "floater";
  span.textContent = "+" + formatNumber(amount) + " ☕";
  if (big) span.style.fontSize = "1.6rem";
  const x = clientX - rect.left + (Math.random() * 40 - 20);
  const y = clientY - rect.top;
  span.style.left = x + "px";
  span.style.top = y + "px";
  floaters.appendChild(span);
  setTimeout(() => span.remove(), 950);
}

function bounceCup() {
  const btn = el("cupButton");
  btn.classList.remove("bounce");
  void btn.offsetWidth; // restart animation
  btn.classList.add("bounce");
}

/* ---------------------- EVENTS ---------------------- */

function setupEvents() {
  el("cupButton").addEventListener("click", (e) => {
    const rect = e.currentTarget.getBoundingClientRect();
    doClick(rect.left + rect.width / 2, rect.top + rect.height / 2);
    render();
  });

  document.querySelectorAll(".tab-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      document.querySelectorAll(".tab-btn").forEach((b) => b.classList.remove("active"));
      document.querySelectorAll(".tab-content").forEach((c) => c.classList.remove("active"));
      btn.classList.add("active");
      el("tab-" + btn.dataset.tab).classList.add("active");
      el("buyAmountRow").style.display = btn.dataset.tab === "shop" ? "flex" : "none";
    });
  });

  document.querySelectorAll(".buy-amt-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      document.querySelectorAll(".buy-amt-btn").forEach((b) => b.classList.remove("active"));
      btn.classList.add("active");
      state.buyAmount = btn.dataset.amt === "max" ? "max" : parseInt(btn.dataset.amt, 10);
      renderProducers();
    });
  });

  el("doPrestigeBtn").addEventListener("click", () => {
    if (prestigeGainPreview() <= 0) return;
    if (confirm("Confirmer la Torréfaction Légendaire ? Ta production actuelle sera réinitialisée contre des grains dorés permanents.")) {
      doPrestige();
      render();
      saveGame();
    }
  });

  el("resetBtn").addEventListener("click", () => {
    if (confirm("Réinitialiser TOUTE la partie (y compris le prestige) ? Cette action est irréversible.")) {
      localStorage.removeItem(SAVE_KEY);
      state = freshState();
      render();
    }
  });

  el("muteBtn").addEventListener("click", () => {
    state.muted = !state.muted;
    el("muteBtn").textContent = state.muted ? "🔇" : "🔊";
  });

  el("prestigeBtn").addEventListener("click", () => {
    document.querySelector('[data-tab="prestige"]').click();
  });

  el("offlineCloseBtn").addEventListener("click", () => {
    el("offlineModal").classList.add("hidden");
  });

  window.addEventListener("beforeunload", () => saveGame(false));
}

/* ---------------------- OFFLINE PROGRESS ---------------------- */

function applyOfflineProgress() {
  const now = Date.now();
  const elapsedSec = Math.max(0, (now - (state.lastSave || now)) / 1000);
  if (elapsedSec < 30) return;

  const cappedSec = Math.min(elapsedSec, OFFLINE_CAP_SECONDS);
  const earned = totalCps() * cappedSec * OFFLINE_EFFICIENCY;
  if (earned > 0) {
    addCoffee(earned, false);
    const text = `Pendant ton absence (${formatTime(elapsedSec)}), ton empire a préparé
      <b>${formatNumber(earned)} ☕</b> (gains hors-ligne à ${Math.round(OFFLINE_EFFICIENCY * 100)}%).`;
    el("offlineText").innerHTML = text;
    el("offlineModal").classList.remove("hidden");
  }
}

/* ---------------------- BOUCLE DE JEU ---------------------- */

function gameTick() {
  const cps = totalCps();
  addCoffee(cps * (TICK_MS / 1000), false);
  state.playtime += TICK_MS / 1000;
  if (activeBuff && activeBuff.expiresAt <= Date.now()) activeBuff = null;
  render();
}

/* ---------------------- INIT ---------------------- */

function init() {
  setupEvents();
  applyOfflineProgress();
  render();
  scheduleGoldenBean();
  setInterval(gameTick, TICK_MS);
  setInterval(() => saveGame(true), AUTOSAVE_MS);
}

document.addEventListener("DOMContentLoaded", init);
