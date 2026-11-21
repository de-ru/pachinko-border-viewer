import Fuse from "https://cdn.jsdelivr.net/npm/fuse.js@7.1.0/dist/fuse.min.mjs";

let machines = [];
let fuse = null;

async function checkVersion() {
  try {
    const latest = await fetch("./version.json", { cache: "no-store" }).then(r => r.json());
    const currentVersion = localStorage.getItem("app-version");

    if (currentVersion && currentVersion !== latest.contentHash) {
      localStorage.setItem("app-version", latest.contentHash);
      location.reload();
      return false;
    }

    localStorage.setItem("app-version", latest.contentHash);
  } catch (error) {
    console.warn("Version check failed", error);
  }

  return true;
}

function normalize(text) {
  if (!text) return "";

  return text
    .normalize("NFKC")
    .toLowerCase()
    .replace(/^(e|p|pa|pf|cr|cra)/i, "")
    .replace(/^フィーバー/, "")
    .replace(/^ぱちんこ/, "")
    .replace(/lt/gi, "")
    .replace(/[【】\[\]（）()]/g, "")
    .replace(/[・:：]/g, "")
    .replace(/ー/g, "")
    .replace(/\s+/g, "");
}

function buildSearchTerms(machineName) {
  const normalized = normalize(machineName);
  const terms = new Set([normalized]);

  for (let length = 2; length <= 4; length++) {
    for (let i = 0; i <= normalized.length - length; i++) {
      terms.add(normalized.slice(i, i + length));
    }
  }

  return [...terms];
}

function initializeSearch() {
  machines = machines.map(machine => ({
    ...machine,
    searchTerms: buildSearchTerms(machine.name)
  }));

  fuse = new Fuse(machines, {
    threshold: 0.35,
    ignoreLocation: true,
    minMatchCharLength: 1,
    keys: [
      { name: "name", weight: 0.7 },
      { name: "searchTerms", weight: 0.3 }
    ]
  });
}

function searchMachines(keyword) {
  if (!keyword || !keyword.trim()) return machines;
  return fuse.search(normalize(keyword)).map(result => result.item);
}

function interpolate(x, x1, y1, x2, y2) {
  return y1 + (((y2 - y1) * (x - x1)) / (x2 - x1));
}

function getBorder(machine, exchangeRate) {
  const points = Object.entries(machine.borders)
    .map(([rate, value]) => [Number(rate), Number(value)])
    .sort((a, b) => a[0] - b[0]);

  if (exchangeRate <= points[0][0]) return points[0][1];

  const last = points[points.length - 1];
  if (exchangeRate >= last[0]) return last[1];

  for (let i = 0; i < points.length - 1; i++) {
    const current = points[i];
    const next = points[i + 1];

    if (exchangeRate >= current[0] && exchangeRate <= next[0]) {
      return interpolate(exchangeRate, current[0], current[1], next[0], next[1]);
    }
  }

  return points[0][1];
}

function createRow(label, value, extraClass = "") {
  return `
    <div class="label">${label}</div>
    <div class="value ${extraClass}">${value}</div>
  `;
}

function getMachineUrl(machine) {

  return (
    "https://www.google.com/search?q=" +
    encodeURIComponent(
      machine.name
    )
  );
}

function createCard(machine, customRate) {
  const border25 = getBorder(machine, 25);
  const border275 = getBorder(machine, 27.5);
  const customBorder = getBorder(machine, customRate);

  const url = getMachineUrl(machine);
  
  return `
    <article class="card">
      <a class="name" href="${url}" target="_blank" rel="noopener noreferrer">
        ${machine.name}
        <span class="link-type"> 🔍</span>
      </a>
      <div class="grid">
        ${createRow("4円 25玉", border25.toFixed(1))}
        ${createRow("4円 27.5玉", border275.toFixed(1))}
        ${createRow("1円 100玉", (border25 * 4).toFixed(1))}
        ${createRow("1円 110玉", (border275 * 4).toFixed(1))}
        ${createRow("手動", customBorder.toFixed(1), "manual")}
      </div>
    </article>
  `;
}

async function loadVersion() {

  try {

    const version =
      await fetch(
        "./version.json",
        {
          cache: "no-store"
        }
      )
      .then(r => r.json());

    const date =
      new Date(
        version.generatedAt
      );

    document
      .getElementById(
        "lastUpdate"
      )
      .textContent =
      `更新: ${date.toLocaleString("ja-JP")}`;

  } catch {

    document
      .getElementById(
        "lastUpdate"
      )
      .textContent =
      "更新日時取得失敗";
  }
}

function render() {
  const keyword = document.getElementById("search").value;
  const customRate = Number(document.getElementById("custom").value) || 27.5;

  const filtered = searchMachines(keyword);

  document.getElementById("resultCount").textContent = `${filtered.length}件`;

  const container = document.getElementById("machines");

  if (filtered.length === 0) {
    container.innerHTML = '<div class="empty">該当機種なし</div>';
    return;
  }

  container.innerHTML = filtered.map(machine => createCard(machine, customRate)).join("");
}

async function initialize() {

  await checkVersion();

  await loadVersion();

  machines =
    await fetch(
      "./machines.json"
    )
    .then(r => r.json());

  initializeSearch();

  document
    .getElementById("search")
    .addEventListener(
      "input",
      render
    );

  document
    .getElementById("custom")
    .addEventListener(
      "input",
      render
    );

  render();
}

if ("serviceWorker" in navigator) {
  navigator.serviceWorker.register("./sw.js").catch(console.error);

  navigator.serviceWorker.addEventListener("controllerchange", () => {
    location.reload();
  });
}

initialize();
