import * as cheerio from "cheerio";

const SOURCE_URL =
  "https://chonborista.com/pachinko-list/";

function trimDate(text) {

  return text
    .replace(
      /\d{4}\/\d{1,2}\/\d{1,2}.*/,
      ""
    )
    .replace(/\d+$/, "")
    .trim();
}

export async function scrapeChonbo() {

  const response =
    await fetch(
      SOURCE_URL
    );

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

  $("a").each((_, a) => {

    const href =
      $(a).attr("href");

    const text =
      $(a)
        .text()
        .trim();

    if (!href) {
      return;
    }

    if (
      !href.includes(
        "/pachinko/"
      )
    ) {
      return;
    }

    const name =
      trimDate(text);

    if (
      !name ||
      name.length < 2
    ) {
      return;
    }

    machines.push({

      name,

      url:
        href.startsWith("http")
          ? href
          : `https://chonborista.com${href}`
    });
  });

  return machines;
}
