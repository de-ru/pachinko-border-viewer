import * as cheerio from "cheerio";

const SOURCE_URL = "https://p-town.dmm.com/machine_borders";
const RATE_TO_BALLS = {
  "4.0": 25,
  "3.5": 28,
  "3.3": 30,
  "3.0": 33,
  "2.5": 40
};

function cleanupMachineName(name) {
  return String(name)
    .replace(/\s+/g, " ")
    .trim();
}

function normalizeText(text) {
  return String(text)
    .replace(/\u00a0/g, " ")
    .replace(/[\r\n\t]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function extractBorders(text) {
  const normalized = normalizeText(text);
  const borders = {};

  for (const [rate, balls] of Object.entries(RATE_TO_BALLS)) {
    // 例: 4.0円（25個）…17.4回転
    // 三点リーダー、全角/半角括弧、空白の差を許容する。
    const pattern = new RegExp(
      `${rate.replace(".", "\\.")}\\s*円\\s*[（(]\\s*${balls}\\s*個\\s*[）)]` +
        `[^0-9]{0,30}(\\d+(?:\\.\\d+)?)\\s*回転`
    );
    const match = normalized.match(pattern);

    if (match) {
      borders[balls] = Number(match[1]);
    }
  }

  return Object.keys(borders).length === Object.keys(RATE_TO_BALLS).length
    ? borders
    : null;
}

function findMachineBlock($, heading) {
  let node = $(heading);

  // 見出しを含み、5交換率すべてを含む最小の親要素を採用する。
  for (let depth = 0; depth < 8 && node.length; depth += 1) {
    const text = normalizeText(node.text());
    const hasAllRates = Object.entries(RATE_TO_BALLS).every(
      ([rate, balls]) =>
        text.includes(`${rate}円`) &&
        (text.includes(`（${balls}個）`) || text.includes(`(${balls}個)`))
    );

    if (hasAllRates) {
      return text;
    }

    node = node.parent();
  }

  return null;
}

export async function scrapeBorders() {
  const response = await fetch(SOURCE_URL, {
    headers: {
      "user-agent":
        "Mozilla/5.0 (compatible; BorderDataBot/1.0; +https://p-town.dmm.com/)"
    }
  });

  if (!response.ok) {
    throw new Error(`Fetch failed: ${response.status} ${response.statusText}`);
  }

  const html = await response.text();
  const $ = cheerio.load(html);
  const machines = [];
  const seen = new Set();

  // DMMぱちタウンでは機種名が見出しとして掲載されている。
  $("h2, h3, h4, h5").each((_, heading) => {
    const name = cleanupMachineName($(heading).text());
    if (!name || seen.has(name)) {
      return;
    }

    const blockText = findMachineBlock($, heading);
    if (!blockText) {
      return;
    }

    const borders = extractBorders(blockText);
    if (!borders) {
      return;
    }

    machines.push({ name, borders });
    seen.add(name);
  });

  if (machines.length === 0) {
    throw new Error(
      "No machines extracted. The source page structure may have changed."
    );
  }

  return machines;
}
