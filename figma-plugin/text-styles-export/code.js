"use strict";

// このファイルのローカル Text Style を読み取り、
// Tailwind の @theme ブロックと、記録用の JSON を出す。
// 読み取り専用。Figma には一切書き込まない。
//
// 色は別プラグイン（color-styles-export）。混ざらないように分けてある。

figma.showUI(__html__, { width: 820, height: 720, themeColors: true });

// "heading/lg" → "heading-lg"
// 先頭の "text/" は落とす（"--text-text-body" を避けるため）。
// 英数字が1文字も残らない場合（日本語名など）は null を返し、呼び出し側で警告する。
function slugify(name, dropPrefix) {
  const slug = name
    .toLowerCase()
    .replace(new RegExp(`^${dropPrefix}[\\s_/]+`), "")
    .replace(/[\s_/]+/g, "-")
    .replace(/[^a-z0-9-]/g, "")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
  return slug || null;
}

function round(value, digits) {
  const factor = Math.pow(10, digits);
  return Math.round(value * factor) / factor;
}

const FONT_WEIGHTS = {
  thin: 100,
  hairline: 100,
  extralight: 200,
  ultralight: 200,
  light: 300,
  regular: 400,
  normal: 400,
  book: 400,
  medium: 500,
  semibold: 600,
  demibold: 600,
  bold: 700,
  extrabold: 800,
  ultrabold: 800,
  black: 900,
  heavy: 900,
};

// 長い名前から順に照合する。"demibold" を "bold" より先に、
// "ultralight" を "light" より先に判定するため。
const FONT_WEIGHT_KEYS = Object.keys(FONT_WEIGHTS).sort(
  (a, b) => b.length - a.length,
);

// Figma の fontName.style は "Bold" "SemiBold Italic" "Condensed Bold" のような文字列。
// 数値ウェイト・italic・それ以外の修飾（Condensed など）に分解する。
function parseFontStyle(fontStyle) {
  const raw = String(fontStyle || "");
  const italic = /italic|oblique/i.test(raw);
  const key = raw
    .replace(/italic|oblique/gi, "")
    .replace(/[\s_-]/g, "")
    .toLowerCase();

  if (key === "") {
    return { weight: 400, italic, raw, extra: null };
  }

  const matched = FONT_WEIGHT_KEYS.find((name) => key.includes(name));
  if (!matched) {
    return { weight: null, italic, raw, extra: null };
  }

  const extra = key.replace(matched, "");
  return {
    weight: FONT_WEIGHTS[matched],
    italic,
    raw,
    extra: extra === "" ? null : extra,
  };
}

function lineHeightValue(lineHeight) {
  if (!lineHeight || lineHeight.unit === "AUTO") {
    return null;
  }
  return lineHeight.unit === "PERCENT"
    ? String(round(lineHeight.value / 100, 3))
    : `${round(lineHeight.value, 2)}px`;
}

function letterSpacingValue(letterSpacing) {
  if (!letterSpacing || letterSpacing.value === 0) {
    return null;
  }
  return letterSpacing.unit === "PERCENT"
    ? `${round(letterSpacing.value / 100, 4)}em`
    : `${round(letterSpacing.value, 2)}px`;
}

async function collectStyles(warnings) {
  const styles = await figma.getLocalTextStylesAsync();

  const items = styles
    .map((style) => {
      const slug = slugify(style.name, "text");
      const font = parseFontStyle(style.fontName ? style.fontName.style : "");
      return {
        name: style.name,
        cssVariable: slug ? `--text-${slug}` : null,
        fontFamily: style.fontName ? style.fontName.family : null,
        fontStyle: font.raw,
        fontSize: `${round(style.fontSize, 2)}px`,
        fontWeight: font.weight,
        fontStyleExtra: font.extra || undefined,
        italic: font.italic || undefined,
        lineHeight: lineHeightValue(style.lineHeight),
        letterSpacing: letterSpacingValue(style.letterSpacing),
        textCase: style.textCase !== "ORIGINAL" ? style.textCase : undefined,
        textDecoration:
          style.textDecoration !== "NONE" ? style.textDecoration : undefined,
        description: style.description || undefined,
        styleId: style.id,
      };
    })
    .sort((a, b) => a.name.localeCompare(b.name));

  for (const item of items) {
    if (item.cssVariable === null) {
      warnings.push(
        `${item.name} は英数字を含まないため CSS 変数名にできません。Figma 側で英数字の名前にしてください。`,
      );
      continue;
    }
    if (item.fontWeight === null) {
      warnings.push(
        `${item.name} のウェイト "${item.fontStyle}" を数値に変換できません。font-weight は出力から省きました。`,
      );
    } else if (item.fontStyleExtra) {
      warnings.push(
        `${item.name} の "${item.fontStyle}" は font-weight ${item.fontWeight} として出力しましたが、"${item.fontStyleExtra}" の指定は @theme では再現できません。`,
      );
    }
    if (item.lineHeight === null) {
      warnings.push(
        `${item.name} の行間が Auto です。フォントを変えると行間も変わるので、値で指定することを勧めます。`,
      );
    }
    if (item.italic) {
      warnings.push(
        `${item.name} は斜体ですが、@theme に斜体の出力先がありません。使う場所で italic クラスを足してください。`,
      );
    }
    if (item.textCase || item.textDecoration) {
      warnings.push(
        `${item.name} は大文字変換や下線の指定を持っています（${item.textCase || item.textDecoration}）。@theme では再現できないので、使う場所でクラスを足してください。`,
      );
    }
  }

  return items;
}

function collectFamilies(items, warnings) {
  const families = new Map();
  for (const item of items) {
    if (!item.fontFamily) continue;
    if (!families.has(item.fontFamily)) {
      families.set(item.fontFamily, {
        family: item.fontFamily,
        slug: slugify(item.fontFamily, "font"),
        usedBy: [],
      });
    }
    families.get(item.fontFamily).usedBy.push(item.name);
  }

  const list = [...families.values()].filter((item) => {
    if (item.slug === null) {
      warnings.push(
        `書体 "${item.family}" は英数字を含まないため CSS 変数名にできません。使う場所で直接指定してください。`,
      );
      return false;
    }
    return true;
  });

  if (list.length > 2) {
    warnings.push(
      `書体が${list.length}種類あります（${list.map((i) => i.family).join(" / ")}）。日本語のWebフォントは1書体で数MBになります。本番は会場で200人が同時に読み込むので、絞ることを勧めます。`,
    );
  }

  return list.sort((a, b) => a.family.localeCompare(b.family));
}

// 別名のスタイルが同じ CSS 変数名になると、CSS では後に書いたほうが勝ち、
// 片方が黙って消える。警告に出すだけでなく、貼り付ける CSS 側にも印を残す。
function checkCollisions(items, warnings) {
  const byVariable = new Map();
  for (const item of items) {
    if (item.cssVariable === null) continue;
    if (!byVariable.has(item.cssVariable)) {
      byVariable.set(item.cssVariable, []);
    }
    byVariable.get(item.cssVariable).push(item.name);
  }

  const collisions = new Map();
  for (const [variable, names] of byVariable) {
    if (names.length > 1) {
      collisions.set(variable, names);
      warnings.push(
        `${variable} に変換されるスタイルが${names.length}件あります: ${names.join(" / ")}。どちらかを Figma でリネームしてください。`,
      );
    }
  }
  return collisions;
}

function buildTheme(items, families, collisions) {
  const lines = [];
  const noted = new Set();

  if (families.length) {
    lines.push(
      ...families.map(
        (item) => `  --font-${item.slug}: "${item.family}", sans-serif;`,
      ),
      "",
    );
  }

  for (const item of items) {
    if (item.cssVariable === null) continue;

    if (collisions.has(item.cssVariable) && !noted.has(item.cssVariable)) {
      noted.add(item.cssVariable);
      lines.push(
        `  /* ⚠️ 重複: ${collisions.get(item.cssVariable).join(" / ")} が同じ名前になります。`,
        `     このまま貼ると後の行が勝ち、片方が消えます。Figma でリネームしてください */`,
      );
    }

    lines.push(`  ${item.cssVariable}: ${item.fontSize};`);
    if (item.lineHeight !== null) {
      lines.push(`  ${item.cssVariable}--line-height: ${item.lineHeight};`);
    }
    if (item.letterSpacing !== null) {
      lines.push(
        `  ${item.cssVariable}--letter-spacing: ${item.letterSpacing};`,
      );
    }
    if (item.fontWeight !== null) {
      lines.push(`  ${item.cssVariable}--font-weight: ${item.fontWeight};`);
    }
  }

  return `@theme {\n${lines.join("\n")}\n}\n`;
}

async function collect() {
  const warnings = [];
  const styles = await collectStyles(warnings);
  const families = collectFamilies(styles, warnings);
  const collisions = checkCollisions(styles, warnings);

  return {
    json: {
      count: styles.length,
      warnings,
      fontFamilies: families,
      styles,
    },
    css: buildTheme(styles, families, collisions),
  };
}

async function run() {
  try {
    const result = await collect();
    figma.ui.postMessage(Object.assign({ type: "result" }, result));
  } catch (error) {
    figma.ui.postMessage({
      type: "error",
      message: error instanceof Error ? error.message : String(error),
    });
  }
}

figma.ui.onmessage = (message) => {
  if (message && message.action === "reload") {
    void run();
  }
};

void run();
