import * as cheerio from "cheerio";

const SOURCE_URL =
  "https://pachinko-curation.com/29144/";

function cleanupMachineName(name) {

  return name

    // 【型式名】除去
    .replace(/【.*?】/g, "")

    // 連続スペース
    .replace(/\s+/g, " ")

    .trim();
}

function isBorderRow(values) {

  if (values.length !== 5) {
    return false;
  }

  return values.every(value =>

    /^\d+(\.\d+)?$/.test(
      String(value).trim()
    )

  );
}

export async function scrapeBorders() {

  const response =
    await fetch(SOURCE_URL);

  if (!response.ok) {

    throw new Error(
      `Fetch failed: ${response.status}`
    );
  }

  const html =
    await response.text();

  const $ =
    cheerio.load(html);

  const machines = [];

  let currentMachine = null;

  $("table tr").each((_, tr) => {

    const cells =
      $(tr)
        .find("td")
        .map((_, td) =>
          $(td)
            .text()
            .trim()
        )
        .get();

    if (
      cells.length === 1 &&
      cells[0].includes("【")
    ) {

      currentMachine =
        cleanupMachineName(
          cells[0]
        );

      return;
    }

    if (
      currentMachine &&
      isBorderRow(cells)
    ) {

      machines.push({

        name:
          currentMachine,

        borders: {

          25: Number(cells[0]),

          28: Number(cells[1]),

          30: Number(cells[2]),

          33: Number(cells[3]),

          40: Number(cells[4])
        }
      });

      currentMachine = null;
    }
  });

  if (
    machines.length === 0
  ) {

    throw new Error(
      "No machines extracted"
    );
  }

  return machines;
}
