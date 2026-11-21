export function normalize(text) {

  return text

    .normalize("NFKC")

    .toLowerCase()

    .replace(
      /^(e|p|pa|pf|cr|cra)/i,
      ""
    )

    .replace(
      /^フィーバー/,
      ""
    )

    .replace(
      /^ぱちんこ/,
      ""
    )

    .replace(
      /\blt\b/gi,
      ""
    )

    .replace(
      /【】\[\]（）()]/g,
      ""
    )

    .replace(
      /[・:：]/g,
      ""
    )

    .replace(
      /ー/g,
      ""
    )

    .replace(
      /\s+/g,
      ""
    );
}