import fs from "fs";
import crypto from "crypto";

import {
  scrapeBorders
} from "./scrape-curation.mjs";

import {
  scrapeChonbo
} from "./scrape-chonbo.mjs";

import {
  matchMachines
} from "./match-machine.mjs";

async function main() {

  console.log(
    "Loading border data..."
  );

  const borderMachines =
    await scrapeBorders();

  console.log(
    "Loading chonborista data..."
  );

  const chonboMachines =
    await scrapeChonbo();

  console.log(
    "Matching..."
  );

  const machines =
    matchMachines(
      borderMachines,
      chonboMachines
    );

  //////////////////////////////////
  // 異常検知
  //////////////////////////////////

  if (
    machines.length < 300
  ) {

    throw new Error(
      `Machine count abnormal: ${machines.length}`
    );
  }

  const urlMatched =
    machines.filter(
      x => x.chonboUrl
    ).length;

  const urlRate =
    (
      urlMatched /
      machines.length
    ) * 100;

  console.log(
    `URL Match Rate: ${urlRate.toFixed(1)}%`
  );

  if (
    urlRate < 50
  ) {

    throw new Error(
      `URL match rate abnormal: ${urlRate}`
    );
  }

  //////////////////////////////////
  // docs作成
  //////////////////////////////////

  fs.mkdirSync(
    "./docs",
    {
      recursive: true
    }
  );

  //////////////////////////////////
  // machines.json
  //////////////////////////////////

  const machinesJson =
    JSON.stringify(
      machines,
      null,
      2
    );

  fs.writeFileSync(
    "./docs/machines.json",
    machinesJson,
    "utf8"
  );

  //////////////////////////////////
  // version.json
  //////////////////////////////////

  const hash =
    crypto
      .createHash("sha256")
      .update(machinesJson)
      .digest("hex")
      .substring(0, 12);

  const version = {
    generatedAt:
      new Date().toISOString(),

    machineCount:
      machines.length,

    matchedCount:
      urlMatched,

    contentHash:
      hash
  };

  fs.writeFileSync(
    "./docs/version.json",
    JSON.stringify(
      version,
      null,
      2
    ),
    "utf8"
  );

  console.log(
    `Generated ${machines.length} machines`
  );

  console.log(
    `Hash ${hash}`
  );
}

main().catch(error => {

  console.error(error);

  process.exit(1);
});