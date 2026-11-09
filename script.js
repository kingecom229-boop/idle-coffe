/* ===========================================================
   IDLE COFFEE BUSINESS — moteur de jeu (vanilla JS, sans dépendances)
   Portefeuille en €, stock de grains, production, ventes automatisées,
   fournisseurs et investissements : un vrai petit business de café.
   =========================================================== */

const SAVE_KEY = "idleCoffeeBusinessV2";
const TICK_MS = 100; // 10 ticks / sec
const AUTOSAVE_MS = 10000;
const OFFLINE_CAP_SECONDS = 4 * 3600; // 4h max de gains hors-ligne
const OFFLINE_EFFICIENCY = 0.5;
const COST_GROWTH = 1.15;
const BASE_SELL_PRICE = 1.5; // € par café vendu
const SALARY_PER_UNIT = 0.03; // € / s / employé (production + ventes)
const BASE_RENT = 0.2; // € / s dès que tu as au moins un employé (loyer minimal)

/* ---------------------- PRODUCTION (grains -> cafés) ---------------------- */

const PRODUCTION_UNITS = [
  { id: "intern",  name: "Stagiaire barista",        icon: "🧑‍🎓", baseCost: 15,        baseRate: 0.1,  desc: "Prépare lentement quelques cafés." },
  { id: "barista", name: "Barista expérimenté",      icon: "🧑‍🍳", baseCost: 100,       baseRate: 1,    desc: "Maîtrise le latte art à la perfection." },
  { id: "machine", name: "Machine expresso auto",    icon: "☕",   baseCost: 1100,      baseRate: 8,    desc: "Prépare des cafés sans jamais se fatiguer." },
  { id: "roaster", name: "Torréfacteur industriel",  icon: "🔥",   baseCost: 12000,     baseRate: 47,   desc: "Torréfie et prépare en continu." },
  { id: "line",    name: "Ligne robotisée",          icon: "🤖",   baseCost: 130000,    baseRate: 260,  desc: "Une chaîne automatisée qui ne s'arrête jamais." },
  { id: "factory", name: "Usine de torréfaction",    icon: "🏭",   baseCost: 1400000,   baseRate: 1400, desc: "Production de café à l'échelle industrielle." },
  { id: "mega",    name: "Mégacomplexe de brassage", icon: "🏗️",  baseCost: 20000000,  baseRate: 7800, desc: "Le plus grand site de brassage au monde." },
];

/* ---------------------- VENTES (cafés -> €, automatisées) ---------------------- */

const SALES_UNITS = [
  { id: "counter",  name: "Caisse manuelle",         icon: "🧾", baseCost: 20,       baseRate: 0.15, desc: "Encaisse les clients un par un." },
  { id: "vendor",   name: "Vendeur ambulant",        icon: "🚶", baseCost: 140,      baseRate: 1.4,  desc: "Va vendre du café dans la rue." },
  { id: "cashier",  name: "Caissier(e) à temps plein", icon: "💁", baseCost: 1500,   baseRate: 11,   desc: "Sert les clients toute la journée." },
  { id: "autoreg",  name: "Caisse automatique",      icon: "🖥️", baseCost: 16000,    baseRate: 65,   desc: "Encaisse sans interruption." },
  { id: "truck",    name: "Camion à café ambulant",  icon: "🚚", baseCost: 170000,   baseRate: 360,  desc: "Vend du café dans toute la ville." },
  { id: "app",      name: "Appli de commande",       icon: "📱", baseCost: 1800000,  baseRate: 1950, desc: "Les clients commandent depuis leur téléphone." },
  { id: "kiosks",   name: "Réseau de distributeurs",  icon: "🏪", baseCost: 26000000, baseRate: 10800, desc: "Des distributeurs automatiques partout en ville." },
];

/* ---------------------- FOURNISSEURS (achat de grains) ---------------------- */

const SUPPLIERS = [
  { id: "local",   name: "Marché local",                  icon: "🧺", price: 10,     beans: 60,     unlockCash: 0 },
  { id: "wholesale", name: "Grossiste régional",           icon: "📦", price: 90,     beans: 600,    unlockCash: 500 },
  { id: "importer", name: "Importateur international",     icon: "🚢", price: 700,    beans: 6000,   unlockCash: 15000 },
  { id: "coop",    name: "Coopérative équitable premium",  icon: "🌾", price: 5500,   beans: 60000,  unlockCash: 300000 },
  { id: "direct",  name: "Achat direct à la plantation",   icon: "🌄", price: 45000,  beans: 600000, unlockCash: 8000000 },
];

/* ---------------------- INVESTISSEMENTS (€ passifs) ---------------------- */

const INVESTMENTS = [
  { id: "savings", name: "Livret Café Épargne",            icon: "🏦", baseCost: 5000,        baseRate: 3,      volatile: false, desc: "Placement sûr, rendement modeste mais régulier." },
  { id: "stocks",  name: "Actions Torréfacteurs Inc.",     icon: "📈", baseCost: 60000,       baseRate: 32,     volatile: false, desc: "Un portefeuille d'actions du secteur du café." },
  { id: "realestate", name: "Immobilier commercial",        icon: "🏢", baseCost: 700000,      baseRate: 340,    volatile: false, desc: "Des murs loués à d'autres commerces." },
  { id: "fund",    name: "Fonds Café International",       icon: "🌐", baseCost: 9000000,     baseRate: 4000,   volatile: false, desc: "Un fonds diversifié sur toute la filière café." },
  { id: "crypto",  name: "CaféCoin (investissement risqué)", icon: "🪙", baseCost: 90000000,    baseRate: 42000,  volatile: true,  desc: "Très rentable... mais le cours fluctue fortement !" },
  { id: "multinational", name: "Participation multinationale", icon: "👑", baseCost: 1200000000, baseRate: 500000, volatile: false, desc: "Une part dans un empire mondial du café." },
];

/* ---------------------- AMÉLIORATIONS ---------------------- */

const CLICK_UPGRADES = [
  { id: "click1", kind: "click", name: "Sourire commercial",     icon: "😊", cost: 60,       mult: 2, desc: "Double la valeur de ta Vente Éclair." },
  { id: "click2", kind: "click", name: "Argumentaire de vente",  icon: "🗣️", cost: 600,      mult: 2, desc: "Double encore la valeur de ta Vente Éclair." },
  { id: "click3", kind: "click", name: "Carnet de clients VIP",  icon: "📒", cost: 9000,     mult: 2, desc: "Des clients fidèles prêts à payer plus." },
  { id: "click4", kind: "click", name: "Technique de closing",   icon: "🎯", cost: 120000,   mult: 2, desc: "Tu conclus chaque vente plus efficacement." },
  { id: "click5", kind: "click", name: "Réseau d'affaires",      icon: "🤵", cost: 2500000,  mult: 2, desc: "Ton réseau te rapporte gros à chaque vente." },
  { id: "click6", kind: "click", name: "Légende du commerce",    icon: "🏅", cost: 60000000, mult: 3, desc: "Un vrai sens des affaires." },
];

const SELL_PRICE_UPGRADES = [
  { id: "price1", kind: "sell", name: "Décoration cosy",         icon: "🛋️", cost: 800,       mult: 1.2, desc: "+20% sur le prix de vente de chaque café." },
  { id: "price2", kind: "sell", name: "Latte art signature",     icon: "🎨", cost: 12000,     mult: 1.25, desc: "+25% sur le prix de vente." },
  { id: "price3", kind: "sell", name: "Programme de fidélité",   icon: "💳", cost: 250000,    mult: 1.3, desc: "+30% sur le prix de vente." },
  { id: "price4", kind: "sell", name: "Café de spécialité certifié", icon: "🏆", cost: 6000000, mult: 1.5, desc: "+50% sur le prix de vente." },
  { id: "price5", kind: "sell", name: "Marque de prestige",      icon: "💎", cost: 150000000, mult: 2,   desc: "Double le prix de vente du café." },
];

const PROD_GLOBAL_UPGRADES = [
  { id: "prodg1", kind: "prod", name: "Formation des équipes",   icon: "📚", cost: 3000,      mult: 1.25, desc: "+25% à toute la production de café." },
  { id: "prodg2", kind: "prod", name: "Nouvelles recettes",      icon: "📝", cost: 60000,     mult: 1.25, desc: "+25% à toute la production de café." },
  { id: "prodg3", kind: "prod", name: "Machines nouvelle génération", icon: "⚙️", cost: 1200000, mult: 1.5, desc: "+50% à toute la production de café." },
  { id: "prodg4", kind: "prod", name: "Excellence opérationnelle", icon: "🔬", cost: 25000000, mult: 1.5, desc: "+50% à toute la production de café." },
];

const SALES_GLOBAL_UPGRADES = [
  { id: "salesg1", kind: "sales", name: "Publicité locale",      icon: "📻", cost: 3500,      mult: 1.25, desc: "+25% à toute la vitesse de vente." },
  { id: "salesg2", kind: "sales", name: "Campagne marketing",    icon: "📣", cost: 70000,     mult: 1.25, desc: "+25% à toute la vitesse de vente." },
  { id: "salesg3", kind: "sales", name: "Service client premium", icon: "⭐", cost: 1500000,   mult: 1.5, desc: "+50% à toute la vitesse de vente." },
  { id: "salesg4", kind: "sales", name: "Stratégie commerciale mondiale", icon: "🌍", cost: 30000000, mult: 1.5, desc: "+50% à toute la vitesse de vente." },
];

const STORAGE_UPGRADES = [
  { id: "silo1",  kind: "beansCap", name: "Petit entrepôt à grains", icon: "🏚️", cost: 300,     value: 500,    desc: "+500 de capacité de stockage des grains." },
  { id: "silo2",  kind: "beansCap", name: "Entrepôt agrandi",        icon: "🏭", cost: 5000,    value: 4000,   desc: "+4 000 de capacité de grains." },
  { id: "silo3",  kind: "beansCap", name: "Silo industriel",         icon: "🏗️", cost: 120000,  value: 40000,  desc: "+40 000 de capacité de grains." },
  { id: "silo4",  kind: "beansCap", name: "Hub logistique mondial",  icon: "🌐", cost: 3000000, value: 500000, desc: "+500 000 de capacité de grains." },
  { id: "shelf1", kind: "cupsCap", name: "Vitrine supplémentaire",   icon: "🗄️", cost: 250,     value: 150,    desc: "+150 de capacité de cafés en stock." },
  { id: "shelf2", kind: "cupsCap", name: "Comptoir agrandi",         icon: "🏬", cost: 4000,    value: 1000,   desc: "+1 000 de capacité de cafés en stock." },
  { id: "shelf3", kind: "cupsCap", name: "Chambre froide dédiée",    icon: "❄️", cost: 90000,   value: 10000,  desc: "+10 000 de capacité de cafés en stock." },
  { id: "shelf4", kind: "cupsCap", name: "Centre de stockage automatisé", icon: "📦", cost: 2500000, value: 150000, desc: "+150 000 de capacité de cafés en stock." },
];

const AUTOSUPPLY_UPGRADE = {
  id: "autosupply", kind: "autosupply", name: "Contrat de réapprovisionnement auto",
  icon: "🔄", cost: 500000,
  desc: "Rachète automatiquement des grains chez le meilleur fournisseur débloqué dès que le stock descend sous 15%.",
};

const MILESTONES = [25, 100];

function buildUnitUpgrades(units, listName) {
  const out = [];
  units.forEach((u) => {
    MILESTONES.forEach((m, idx) => {
      out.push({
        id: `${listName}_${u.id}_x2_${m}`,
        kind: "unit",
        listName,
        unitId: u.id,
        requireCount: m,
        name: `${u.name} — Expert (${m})`,
        icon: "⭐",
        cost: Math.round(u.baseCost * m * 6 * Math.pow(1.7, idx)),
        mult: 2,
        desc: `Double le rendement de "${u.name}" (nécessite ${m} possédé(s)).`,
      });
    });
  });
  return out;
}

const PRODUCTION_UNIT_UPGRADES = buildUnitUpgrades(PRODUCTION_UNITS, "production");
const SALES_UNIT_UPGRADES = buildUnitUpgrades(SALES_UNITS, "sales");

const ALL_UPGRADES = [
  ...CLICK_UPGRADES,
  ...SELL_PRICE_UPGRADES,
  ...PROD_GLOBAL_UPGRADES,
  ...SALES_GLOBAL_UPGRADES,
  ...STORAGE_UPGRADES,
  ...PRODUCTION_UNIT_UPGRADES,
  ...SALES_UNIT_UPGRADES,
  AUTOSUPPLY_UPGRADE,
];

/* ---------------------- ÉTAT DU JEU ---------------------- */

function freshState() {
  const production = {};
  PRODUCTION_UNITS.forEach((u) => (production[u.id] = 0));
  const sales = {};
  SALES_UNITS.forEach((u) => (sales[u.id] = 0));
  const investments = {};
  INVESTMENTS.forEach((u) => (investments[u.id] = 0));
  const upgrades = {};
  ALL_UPGRADES.forEach((u) => (upgrades[u.id] = false));

  return {
    cash: 30,
    lifetimeCash: 0,
    totalClickCash: 0,
    totalSalesRevenue: 0,
    totalInvestRevenue: 0,
    beans: 0,
    beansCapacityBase: 400,
    cups: 0,
    cupsCapacityBase: 120,
    clicks: 0,
    goldenFound: 0,
    playtime: 0,
    prestigePoints: 0,
    prestigeCount: 0,
    production,
    sales,
    investments,
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
    const merged = { ...base, ...parsed };
    merged.production = { ...base.production, ...(parsed.production || {}) };
    merged.sales = { ...base.sales, ...(parsed.sales || {}) };
    merged.investments = { ...base.investments, ...(parsed.investments || {}) };
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

/* ---------------------- CALCULS ÉCONOMIQUES ---------------------- */

let activeBuff = null; // { multiplier, expiresAt } — booste prod + ventes
let cryptoFactor = 1; // fluctuation du CaféCoin

function unitCost(unit, owned) {
  return Math.ceil(unit.baseCost * Math.pow(COST_GROWTH, owned));
}

function unitMultiplier(listName, unit) {
  let mult = 1;
  const list = listName === "production" ? PRODUCTION_UNIT_UPGRADES : SALES_UNIT_UPGRADES;
  list.forEach((u) => {
    if (u.unitId === unit.id && state.upgrades[u.id]) mult *= u.mult;
  });
  return mult;
}

function prestigeBonus() {
  return 1 + state.prestigePoints * 0.02;
}

function globalProductionMultiplier() {
  let mult = prestigeBonus();
  PROD_GLOBAL_UPGRADES.forEach((u) => { if (state.upgrades[u.id]) mult *= u.mult; });
  if (activeBuff && activeBuff.expiresAt > Date.now()) mult *= activeBuff.multiplier;
  return mult;
}

function globalSalesMultiplier() {
  let mult = prestigeBonus();
  SALES_GLOBAL_UPGRADES.forEach((u) => { if (state.upgrades[u.id]) mult *= u.mult; });
  if (activeBuff && activeBuff.expiresAt > Date.now()) mult *= activeBuff.multiplier;
  return mult;
}

function sellPrice() {
  let price = BASE_SELL_PRICE;
  SELL_PRICE_UPGRADES.forEach((u) => { if (state.upgrades[u.id]) price *= u.mult; });
  return price;
}

function productionRate() {
  let sum = 0;
  PRODUCTION_UNITS.forEach((u) => {
    sum += state.production[u.id] * u.baseRate * unitMultiplier("production", u);
  });
  return sum * globalProductionMultiplier();
}

function salesRate() {
  let sum = 0;
  SALES_UNITS.forEach((u) => {
    sum += state.sales[u.id] * u.baseRate * unitMultiplier("sales", u);
  });
  return sum * globalSalesMultiplier();
}

function investmentIncome() {
  let sum = 0;
  INVESTMENTS.forEach((u) => {
    const base = state.investments[u.id] * u.baseRate;
    sum += u.volatile ? base * cryptoFactor : base;
  });
  return sum;
}

function beansCapacity() {
  let cap = state.beansCapacityBase;
  STORAGE_UPGRADES.forEach((u) => { if (u.kind === "beansCap" && state.upgrades[u.id]) cap += u.value; });
  return cap;
}

function cupsCapacity() {
  let cap = state.cupsCapacityBase;
  STORAGE_UPGRADES.forEach((u) => { if (u.kind === "cupsCap" && state.upgrades[u.id]) cap += u.value; });
  return cap;
}

function totalStaffCount() {
  let n = 0;
  PRODUCTION_UNITS.forEach((u) => (n += state.production[u.id]));
  SALES_UNITS.forEach((u) => (n += state.sales[u.id]));
  return n;
}

function expensesPerSec() {
  const staff = totalStaffCount();
  if (staff <= 0) return 0;
  return BASE_RENT + staff * SALARY_PER_UNIT;
}

function clickValue() {
  let mult = 1;
  CLICK_UPGRADES.forEach((u) => { if (state.upgrades[u.id]) mult *= u.mult; });
  const base = sellPrice() * mult;
  const bonus = (productionRate() + salesRate()) * 0.015;
  return base + bonus;
}

/* ---------------------- FORMAT ---------------------- */

function formatNumber(n) {
  const neg = n < 0;
  n = Math.abs(n);
  let out;
  if (n < 1000) {
    out = n < 10 && n !== Math.floor(n) ? n.toFixed(1) : Math.floor(n).toString();
  } else {
    const suffixes = ["", "K", "M", "B", "T", "Qa", "Qi", "Sx", "Sp", "Oc", "No", "Dc"];
    const tier = Math.min(Math.floor(Math.log10(n) / 3), suffixes.length - 1);
    const scaled = n / Math.pow(1000, tier);
    out = scaled.toFixed(scaled < 10 ? 2 : scaled < 100 ? 1 : 0) + suffixes[tier];
  }
  return (neg ? "-" : "") + out;
}

function formatMoney(n) {
  if (Math.abs(n) < 1000) {
    return (n < 0 ? "-" : "") + Math.abs(n).toFixed(2).replace(".", ",") + " €";
  }
  return formatNumber(n) + " €";
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
  const gain = clickValue();
  state.cash += gain;
  state.lifetimeCash += gain;
  state.totalClickCash += gain;
  state.clicks++;
  spawnFloater(gain, x, y);
  bounceCup();
}

function buyCountable(unit, countsObj, amount) {
  let bought = 0;
  let cost = 0;
  const owned = () => countsObj[unit.id] + bought;
  if (amount === "max") {
    while (true) {
      const c = unitCost(unit, owned());
      if (state.cash - cost < c) break;
      cost += c;
      bought++;
      if (bought > 100000) break;
    }
  } else {
    for (let i = 0; i < amount; i++) {
      const c = unitCost(unit, owned());
      if (state.cash - cost < c) break;
      cost += c;
      bought++;
    }
  }
  if (bought > 0) {
    state.cash -= cost;
    countsObj[unit.id] += bought;
  }
  return bought;
}

function buySupplierBags(supplier, amount) {
  let bought = 0;
  let cost = 0;
  let beansGained = 0;
  const cap = beansCapacity();
  const maxBags = amount === "max" ? Infinity : amount;
  while (bought < maxBags) {
    if (state.cash - cost < supplier.price) break;
    if (state.beans + beansGained + supplier.beans > cap) break;
    cost += supplier.price;
    beansGained += supplier.beans;
    bought++;
    if (bought > 100000) break;
  }
  if (bought > 0) {
    state.cash -= cost;
    state.beans += beansGained;
  }
  return bought;
}

function buyUpgrade(u) {
  if (state.upgrades[u.id]) return false;
  if (state.cash < u.cost) return false;
  state.cash -= u.cost;
  state.upgrades[u.id] = true;
  return true;
}

function isSupplierUnlocked(s) {
  return state.lifetimeCash >= s.unlockCash;
}

function canShowUnitUpgrade(u) {
  const countsObj = u.listName === "production" ? state.production : state.sales;
  return countsObj[u.unitId] >= u.requireCount;
}

function bestUnlockedSupplier() {
  let best = null;
  SUPPLIERS.forEach((s) => {
    if (isSupplierUnlocked(s)) best = s;
  });
  return best;
}

/* ---------------------- GRAIN DORÉ ---------------------- */

let goldenTimer = null;

function scheduleGoldenBean() {
  const delay = 35000 + Math.random() * 45000;
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
    activeBuff = { multiplier: 6, expiresAt: Date.now() + 45000 };
  } else {
    const bonus = Math.max((salesRate() * sellPrice() + investmentIncome()) * 90, 50);
    state.cash += bonus;
    state.lifetimeCash += bonus;
    const rect = el("cupButton").getBoundingClientRect();
    spawnFloater(bonus, rect.left + rect.width / 2, rect.top + rect.height / 2, true);
  }
}

/* ---------------------- PRESTIGE ---------------------- */

function prestigeGainPreview() {
  const totalPoints = Math.floor(Math.sqrt(state.lifetimeCash / 5000));
  return Math.max(0, totalPoints - state.prestigePoints);
}

function doPrestige() {
  const gain = prestigeGainPreview();
  if (gain <= 0) return false;
  state.prestigePoints += gain;
  state.prestigeCount++;
  state.cash = 30;
  state.beans = 0;
  state.cups = 0;
  PRODUCTION_UNITS.forEach((u) => (state.production[u.id] = 0));
  SALES_UNITS.forEach((u) => (state.sales[u.id] = 0));
  INVESTMENTS.forEach((u) => (state.investments[u.id] = 0));
  ALL_UPGRADES.forEach((u) => (state.upgrades[u.id] = false));
  return true;
}

/* ---------------------- RENDU UI ---------------------- */

const el = (id) => document.getElementById(id);

function render() {
  el("cashValue").textContent = formatMoney(state.cash);
  const net = salesRate() * sellPrice() + investmentIncome() - expensesPerSec();
  el("profitValue").textContent = (net >= 0 ? "+" : "") + formatMoney(net) + "/s";
  el("profitValue").className = "stat-value " + (net >= 0 ? "positive" : "negative");
  el("clickValue").textContent = formatMoney(clickValue());

  el("beansBarFill").style.width = Math.min(100, (state.beans / beansCapacity()) * 100) + "%";
  el("beansText").textContent = `${formatNumber(state.beans)} / ${formatNumber(beansCapacity())}`;
  el("cupsBarFill").style.width = Math.min(100, (state.cups / cupsCapacity()) * 100) + "%";
  el("cupsText").textContent = `${formatNumber(state.cups)} / ${formatNumber(cupsCapacity())}`;

  el("prodRateValue").textContent = formatNumber(productionRate()) + " ☕/s";
  el("salesRateValue").textContent = formatNumber(salesRate()) + " ☕/s (capacité)";
  el("prestigeLevel").textContent = formatNumber(state.prestigePoints);

  renderProduction();
  renderSales();
  renderSuppliers();
  renderInvestments();
  renderUpgrades();
  renderPrestigeTab();
  renderStatsTab();
}

function renderGenericUnitList(containerId, units, countsObj, rateLabel, rateUnit) {
  const list = el(containerId);
  const amount = state.buyAmount;
  list.innerHTML = "";
  units.forEach((u) => {
    const owned = countsObj[u.id];
    const cost = unitCost(u, owned);
    const affordable = state.cash >= cost;
    const mult = containerId === "productionList" ? unitMultiplier("production", u) : unitMultiplier("sales", u);
    const rate = u.baseRate * mult;
    const card = document.createElement("div");
    card.className = "producer-card" + (affordable ? "" : " disabled");
    card.innerHTML = `
      <div class="p-icon">${u.icon}</div>
      <div class="p-info">
        <div class="p-name">${u.name}</div>
        <div class="p-desc">${u.desc}</div>
        <div class="p-meta">${formatNumber(rate)} ${rateUnit} chacun • Total: ${formatNumber(owned * rate)} ${rateUnit}</div>
      </div>
      <div class="p-right">
        <div class="p-count">x${owned}</div>
        <div class="p-cost ${affordable ? "afford" : ""}">${formatMoney(cost)}</div>
      </div>
    `;
    card.addEventListener("click", () => {
      const bought = buyCountable(u, countsObj, amount);
      if (bought > 0) { render(); saveGame(false); }
    });
    list.appendChild(card);
  });
}

function renderProduction() {
  renderGenericUnitList("productionList", PRODUCTION_UNITS, state.production, "Production", "☕/s");
}

function renderSales() {
  renderGenericUnitList("salesList", SALES_UNITS, state.sales, "Ventes", "☕/s vendus");
}

function renderSuppliers() {
  const list = el("supplierList");
  const amount = state.buyAmount;
  list.innerHTML = "";
  const cap = beansCapacity();
  SUPPLIERS.forEach((s) => {
    const unlocked = isSupplierUnlocked(s);
    const card = document.createElement("div");
    if (!unlocked) {
      card.className = "producer-card disabled";
      card.innerHTML = `
        <div class="p-icon">🔒</div>
        <div class="p-info">
          <div class="p-name">${s.name}</div>
          <div class="p-desc">Se débloque à ${formatMoney(s.unlockCash)} de revenus cumulés.</div>
        </div>
      `;
      list.appendChild(card);
      return;
    }
    const full = state.beans >= cap;
    const affordable = state.cash >= s.price && !full;
    card.className = "producer-card" + (affordable ? "" : " disabled");
    card.innerHTML = `
      <div class="p-icon">${s.icon}</div>
      <div class="p-info">
        <div class="p-name">${s.name}</div>
        <div class="p-desc">${formatNumber(s.beans)} grains par sac${full ? " — stock plein !" : ""}</div>
        <div class="p-meta">Rapport: ${(s.beans / s.price).toFixed(1)} grains / €</div>
      </div>
      <div class="p-right">
        <div class="p-cost ${affordable ? "afford" : ""}">${formatMoney(s.price)}</div>
      </div>
    `;
    card.addEventListener("click", () => {
      const bought = buySupplierBags(s, amount);
      if (bought > 0) { render(); saveGame(false); }
    });
    list.appendChild(card);
  });
}

function renderInvestments() {
  const list = el("investList");
  const amount = state.buyAmount;
  list.innerHTML = "";
  INVESTMENTS.forEach((u) => {
    const owned = state.investments[u.id];
    const cost = unitCost(u, owned);
    const affordable = state.cash >= cost;
    const rate = u.volatile ? u.baseRate * cryptoFactor : u.baseRate;
    const card = document.createElement("div");
    card.className = "producer-card" + (affordable ? "" : " disabled");
    card.innerHTML = `
      <div class="p-icon">${u.icon}</div>
      <div class="p-info">
        <div class="p-name">${u.name}${u.volatile ? ` <span class="volatile-tag">x${cryptoFactor.toFixed(2)}</span>` : ""}</div>
        <div class="p-desc">${u.desc}</div>
        <div class="p-meta">${formatMoney(rate)}/s chacun • Total: ${formatMoney(owned * rate)}/s</div>
      </div>
      <div class="p-right">
        <div class="p-count">x${owned}</div>
        <div class="p-cost ${affordable ? "afford" : ""}">${formatMoney(cost)}</div>
      </div>
    `;
    card.addEventListener("click", () => {
      const bought = buyCountable(u, state.investments, amount);
      if (bought > 0) { render(); saveGame(false); }
    });
    list.appendChild(card);
  });
}

function renderUpgrades() {
  const list = el("upgradeList");
  list.innerHTML = "";

  const sections = [
    { title: "⚡ Vente Éclair (clic)", items: CLICK_UPGRADES },
    { title: "💲 Prix de vente", items: SELL_PRICE_UPGRADES },
    { title: "☕ Production globale", items: PROD_GLOBAL_UPGRADES },
    { title: "🛒 Ventes globales", items: SALES_GLOBAL_UPGRADES },
    { title: "📦 Stockage", items: STORAGE_UPGRADES },
    { title: "🔄 Automatisation", items: [AUTOSUPPLY_UPGRADE] },
    {
      title: "⭐ Spécialisations production",
      items: PRODUCTION_UNIT_UPGRADES.filter((u) => canShowUnitUpgrade(u)),
    },
    {
      title: "⭐ Spécialisations ventes",
      items: SALES_UNIT_UPGRADES.filter((u) => canShowUnitUpgrade(u)),
    },
  ];

  let any = false;
  sections.forEach((section) => {
    const items = section.items.filter((u) => !state.upgrades[u.id]);
    if (items.length === 0) return;
    any = true;
    const h = document.createElement("h3");
    h.textContent = section.title;
    h.style.color = "var(--accent-light)";
    h.style.fontSize = "0.85rem";
    h.style.margin = "10px 4px";
    list.appendChild(h);

    items.forEach((u) => {
      const affordable = state.cash >= u.cost;
      const card = document.createElement("div");
      card.className = "upgrade-card" + (affordable ? "" : " disabled");
      card.innerHTML = `
        <div class="u-icon">${u.icon}</div>
        <div class="u-info">
          <div class="u-name">${u.name}</div>
          <div class="u-desc">${u.desc}</div>
        </div>
        <div class="p-right">
          <div class="u-cost ${affordable ? "afford" : ""}">${formatMoney(u.cost)}</div>
        </div>
      `;
      card.addEventListener("click", () => {
        if (buyUpgrade(u)) { render(); saveGame(false); }
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
      : "Génère plus de revenus pour débloquer un prestige";
}

function renderStatsTab() {
  el("statLifetime").textContent = formatMoney(state.lifetimeCash);
  el("statClickCash").textContent = formatMoney(state.totalClickCash);
  el("statSalesRevenue").textContent = formatMoney(state.totalSalesRevenue);
  el("statInvestRevenue").textContent = formatMoney(state.totalInvestRevenue);
  el("statClicks").textContent = formatNumber(state.clicks);
  el("statGoldenFound").textContent = formatNumber(state.goldenFound);
  el("statPlaytime").textContent = formatTime(state.playtime);
  el("statPrestiges").textContent = formatNumber(state.prestigeCount);
  el("statStaff").textContent = formatNumber(totalStaffCount());
  el("statExpenses").textContent = formatMoney(expensesPerSec()) + "/s";
}

/* ---------------------- EFFETS VISUELS ---------------------- */

function spawnFloater(amount, clientX, clientY, big = false) {
  const floaters = el("floaters");
  const rect = floaters.getBoundingClientRect();
  const span = document.createElement("span");
  span.className = "floater";
  span.textContent = "+" + formatMoney(amount);
  if (big) span.style.fontSize = "1.5rem";
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
  void btn.offsetWidth;
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
      const needsAmount = ["production", "sales", "suppliers", "invest"].includes(btn.dataset.tab);
      el("buyAmountRow").style.display = needsAmount ? "flex" : "none";
    });
  });

  document.querySelectorAll(".buy-amt-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      document.querySelectorAll(".buy-amt-btn").forEach((b) => b.classList.remove("active"));
      btn.classList.add("active");
      state.buyAmount = btn.dataset.amt === "max" ? "max" : parseInt(btn.dataset.amt, 10);
      render();
    });
  });

  el("doPrestigeBtn").addEventListener("click", () => {
    if (prestigeGainPreview() <= 0) return;
    if (confirm("Confirmer la Torréfaction Légendaire ? Ton business actuel sera réinitialisé contre des grains dorés permanents.")) {
      doPrestige();
      render();
      saveGame();
    }
  });

  el("resetBtn").addEventListener("click", () => {
    if (confirm("Réinitialiser TOUT le business (y compris le prestige) ? Cette action est irréversible.")) {
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

/* ---------------------- PROGRESSION HORS-LIGNE ---------------------- */

function simulateEconomy(dt) {
  // Production : grains -> cafés, limitée par le stock de grains et la capacité
  const desiredBrew = productionRate() * dt;
  const spaceLeft = Math.max(0, cupsCapacity() - state.cups);
  const actualBrew = Math.min(desiredBrew, state.beans, spaceLeft);
  state.beans -= actualBrew;
  state.cups += actualBrew;

  // Ventes : cafés -> €, limitées par le stock de cafés disponible
  const desiredSell = salesRate() * dt;
  const actualSell = Math.min(desiredSell, state.cups);
  state.cups -= actualSell;
  const revenue = actualSell * sellPrice();

  // Investissements : revenu passif
  const investIncome = investmentIncome() * dt;

  // Dépenses : loyer + salaires
  const expenses = expensesPerSec() * dt;

  const net = revenue + investIncome - expenses;
  state.cash = Math.max(0, state.cash + net);
  state.lifetimeCash += revenue + investIncome;
  state.totalSalesRevenue += revenue;
  state.totalInvestRevenue += investIncome;

  // Réapprovisionnement automatique
  if (state.upgrades[AUTOSUPPLY_UPGRADE.id]) {
    const cap = beansCapacity();
    if (state.beans < cap * 0.15) {
      const supplier = bestUnlockedSupplier();
      if (supplier) {
        while (state.cash >= supplier.price && state.beans + supplier.beans <= cap) {
          state.cash -= supplier.price;
          state.beans += supplier.beans;
        }
      }
    }
  }
}

function applyOfflineProgress() {
  const now = Date.now();
  const elapsedSec = Math.max(0, (now - (state.lastSave || now)) / 1000);
  if (elapsedSec < 30) return;

  const cappedSec = Math.min(elapsedSec, OFFLINE_CAP_SECONDS);
  const cashBefore = state.cash;
  // Simulation simplifiée en un seul pas, à efficacité réduite hors-ligne
  const steps = 20;
  const dt = cappedSec / steps;
  for (let i = 0; i < steps; i++) {
    simulateEconomy(dt * OFFLINE_EFFICIENCY);
  }
  const earned = state.cash - cashBefore;
  if (earned > 0.01) {
    const text = `Pendant ton absence (${formatTime(elapsedSec)}), ton business a généré
      <b>${formatMoney(earned)}</b> (gains hors-ligne à ${Math.round(OFFLINE_EFFICIENCY * 100)}%).`;
    el("offlineText").innerHTML = text;
    el("offlineModal").classList.remove("hidden");
  }
}

/* ---------------------- BOUCLE DE JEU ---------------------- */

let cryptoTimer = 0;

function gameTick() {
  const dt = TICK_MS / 1000;
  simulateEconomy(dt);
  state.playtime += dt;
  if (activeBuff && activeBuff.expiresAt <= Date.now()) activeBuff = null;

  cryptoTimer += dt;
  if (cryptoTimer >= 4) {
    cryptoTimer = 0;
    cryptoFactor = Math.max(0.3, Math.min(2.2, cryptoFactor + (Math.random() - 0.5) * 0.5));
  }

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
