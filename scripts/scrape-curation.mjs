import * as cheerio from "cheerio";

const SOURCE_URL = "https://p-town.dmm.com/machine_borders";
const READER_URL = `https://r.jina.ai/http://${new URL(SOURCE_URL).host}${new URL(SOURCE_URL).pathname}`;
const RATE_TO_BALLS = { "4.0": 25, "3.5": 28, "3.3": 30, "3.0": 33, "2.5": 40 };

function normalizeText(value) {
  return String(value)
    .replace(/\u00a0/g, " ")
    .replace(/[\r\t]+/g, " ")
    .replace(/[ \f\v]+/g, " ")
    .trim();
}

function cleanupMachineName(value) {
  return normalizeText(value)
    .replace(/^#{1,6}\s*/, "")
    .replace(/\s+/g, " ")
    .trim();
}

function extractBorders(text) {
  const normalized = normalizeText(text).replace(/\n+/g, " ");
  const borders = {};

  for (const [rate, balls] of Object.entries(RATE_TO_BALLS)) {
    const escapedRate = rate.replace(".", "\\.");
    const pattern = new RegExp(
      `${escapedRate}\\s*円\\s*[（(]\\s*${balls}\\s*個\\s*[）)]` +
      `[^0-9]{0,40}(\\d+(?:\\.\\d+)?)\\s*回転`
    );
    const match = normalized.match(pattern);
    if (match) borders[balls] = Number(match[1]);
  }

  return Object.keys(borders).length === 5 ? borders : null;
}

async function fetchText(url, accept = "text/html") {
  const response = await fetch(url, {
    redirect: "follow",
    signal: AbortSignal.timeout(30000),
    headers: {
      accept,
      "accept-language": "ja,en-US;q=0.8,en;q=0.6",
      "cache-control": "no-cache",
      "user-agent": "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 Chrome/131 Safari/537.36"
    }
  });
  if (!response.ok) throw new Error(`${response.status} ${response.statusText}`);
  return response.text();
}

function parseHtml(html) {
  const $ = cheerio.load(html);
  const machines = [];
  const seen = new Set();

  $("h2, h3, h4, h5").each((_, heading) => {
    const name = cleanupMachineName($(heading).text());
    if (!name || seen.has(name)) return;

    let node = $(heading);
    let borders = null;
    for (let depth = 0; depth < 8 && node.length && !borders; depth += 1) {
      borders = extractBorders(node.text());
      node = node.parent();
    }

    if (borders) {
      machines.push({ name, borders });
      seen.add(name);
    }
  });

  return machines;
}

function parseReaderMarkdown(markdown) {
  const lines = markdown.split(/\r?\n/);
  const machines = [];
  const seen = new Set();

  for (let i = 0; i < lines.length; i += 1) {
    const heading = lines[i].match(/^###\s+(.+?)\s*$/);
    if (!heading) continue;

    const name = cleanupMachineName(heading[1]);
    if (!name || seen.has(name)) continue;

    const chunk = [];
    for (let j = i + 1; j < lines.length && !/^###\s+/.test(lines[j]); j += 1) {
      chunk.push(lines[j]);
    }

    const borders = extractBorders(chunk.join("\n"));
    if (borders) {
      machines.push({ name, borders });
      seen.add(name);
    }
  }

  return machines;
}

export async function scrapeBorders() {
  let directError;

  try {
    const html = await fetchText(SOURCE_URL);
    const machines = parseHtml(html);
    if (machines.length > 0) return machines;
    directError = new Error("Direct response contained no machine data");
  } catch (error) {
    directError = error;
  }

  // DMM may return 403 to GitHub Actions/datacenter IPs. Jina Reader is used only
  // as a read-only fallback and still reads the same SOURCE_URL.
  try {
    const markdown = await fetchText(READER_URL, "text/plain");
    const machines = parseReaderMarkdown(markdown);
    if (machines.length > 0) return machines;
    throw new Error("Reader response contained no machine data");
  } catch (readerError) {
    throw new Error(
      `Border data fetch failed. Direct: ${directError.message}; ` +
      `reader fallback: ${readerError.message}`
    );
  }
}
