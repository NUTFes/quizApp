"use strict";

// このファイルのローカル Color Style / Text Style を読み取り、
// Tailwind の @theme ブロックと、記録用の JSON を出す。
// 読み取り専用。Figma には一切書き込まない。

figma.showUI(__html__, { width: 820, height: 720, themeColors: true });

/* ---------------------------------------------------------------- 共通 */

// "text/primary" → "text-primary"
// 先頭の除去語（color / text）は落とす。"--color-color-border" を避けるため。
// 英数字が1文字も残らない場合（日本語名など）は null を返し、呼び出し側で警告する。
function slugify(styleName, dropPrefix) {
  const slug = styleName
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

/* ------------------------------------------------------------ Color */

function toHex(channel) {
  return Math.round(channel * 255)
    .toString(16)
    .padStart(2, "0");
}

function solidHex(color) {
  return `#${toHex(color.r)}${toHex(color.g)}${toHex(color.b)}`;
}

function describePaint(paint) {
  if (paint.type !== "SOLID") {
    // グラデーションや画像は1つの hex にできない。値を作らず、種類だけ報告する。
    return { type: paint.type, hex: null };
  }
  const opacity = typeof paint.opacity === "number" ? paint.opacity : 1;
  const entry = { type: "SOLID", hex: solidHex(paint.color) };
  if (opacity < 1) {
    entry.opacity = round(opacity, 3);
    entry.hex8 = `${entry.hex}${toHex(opacity)}`;
  }
  if (paint.visible === false) {
    entry.visible = false;
  }
  return entry;
}

function paintValue(paints) {
  const visible = paints.filter((paint) => paint.visible !== false);
  if (visible.length !== 1 || visible[0].type !== "SOLID") {
    return null;
  }
  return visible[0].hex8 || visible[0].hex;
}

async function collectColors(warnings) {
  const styles = await figma.getLocalPaintStylesAsync();

  const items = styles
    .map((style) => {
      const paints = style.paints.map(describePaint);
      const slug = slugify(style.name, "color");
      return {
        name: style.name,
        cssVariable: slug ? `--color-${slug}` : null,
        cssValue: slug ? paintValue(paints) : null,
        paints,
        description: style.description || undefined,
        styleId: style.id,
      };
    })
    .sort((a, b) => a.name.localeCompare(b.name));

  for (const item of items) {
    if (item.cssVariable === null) {
      warnings.push(
        `【色】${item.name} は英数字を含まないため CSS 変数名にできません。Figma 側で英数字の名前にしてください。`,
      );
    } else if (item.cssValue === null) {
      const kinds = item.paints.map((paint) => paint.type).join(", ");
      warnings.push(
        `【色】${item.name} は単色ではないため CSS 変数にできません（${kinds}）。使う場所で個別に書いてください。`,
      );
    }
  }

  return items;
}

/* ------------------------------------------------------------- Text */

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

  // ウェイト以外の修飾が残っていれば、@theme では再現できないので報告する。
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

async function collectText(warnings) {
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
        `【文字】${item.name} は英数字を含まないため CSS 変数名にできません。Figma 側で英数字の名前にしてください。`,
      );
      continue;
    }
    if (item.fontWeight === null) {
      warnings.push(
        `【文字】${item.name} のウェイト "${item.fontStyle}" を数値に変換できません。font-weight は出力から省きました。`,
      );
    } else if (item.fontStyleExtra) {
      warnings.push(
        `【文字】${item.name} の "${item.fontStyle}" は font-weight ${item.fontWeight} として出力しましたが、"${item.fontStyleExtra}" の指定は @theme では再現できません。`,
      );
    }
    if (item.lineHeight === null) {
      warnings.push(
        `【文字】${item.name} の行間が Auto です。フォントを変えると行間も変わるので、値で指定することを勧めます。`,
      );
    }
    if (item.textCase || item.textDecoration) {
      warnings.push(
        `【文字】${item.name} は大文字変換や下線の指定を持っています（${item.textCase || item.textDecoration}）。@theme では再現できないので、使う場所でクラスを足してください。`,
      );
    }
  }

  return items;
}

/* ------------------------------------------------------------ 出力 */

function buildTheme(colors, texts, families) {
  const lines = [];

  const colorLines = colors
    .filter((item) => item.cssValue !== null)
    .map((item) => `  ${item.cssVariable}: ${item.cssValue};`);
  if (colorLines.length) {
    lines.push("  /* 色 */", ...colorLines);
  }

  const familyLines = families.map(
    (item) => `  --font-${item.slug}: "${item.family}", sans-serif;`,
  );
  if (familyLines.length) {
    lines.push("", "  /* フォント */", ...familyLines);
  }

  const textLines = [];
  for (const item of texts) {
    if (item.cssVariable === null) continue;
    textLines.push(`  ${item.cssVariable}: ${item.fontSize};`);
    if (item.lineHeight !== null) {
      textLines.push(`  ${item.cssVariable}--line-height: ${item.lineHeight};`);
    }
    if (item.letterSpacing !== null) {
      textLines.push(
        `  ${item.cssVariable}--letter-spacing: ${item.letterSpacing};`,
      );
    }
    if (item.fontWeight !== null) {
      textLines.push(`  ${item.cssVariable}--font-weight: ${item.fontWeight};`);
    }
  }
  if (textLines.length) {
    lines.push("", "  /* 文字 */", ...textLines);
  }

  return `@theme {\n${lines.join("\n")}\n}\n`;
}

function collectFamilies(texts, warnings) {
  const families = new Map();
  for (const item of texts) {
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
        `【フォント】"${item.family}" は英数字を含まないため CSS 変数名にできません。使う場所で直接指定してください。`,
      );
      return false;
    }
    return true;
  });
  if (list.length > 2) {
    warnings.push(
      `【フォント】書体が${list.length}種類あります（${list.map((i) => i.family).join(" / ")}）。日本語のWebフォントは1書体で数MBになります。本番で200人が同時に読み込むので、絞ることを勧めます。`,
    );
  }
  return list.sort((a, b) => a.family.localeCompare(b.family));
}

// 別名のスタイルが同じ CSS 変数名になると、片方が黙って消える。必ず報告する。
function checkCollisions(entries, warnings) {
  const byVariable = new Map();
  for (const item of entries) {
    if (item.cssVariable === null) continue;
    if (!byVariable.has(item.cssVariable)) {
      byVariable.set(item.cssVariable, []);
    }
    byVariable.get(item.cssVariable).push(item.name);
  }
  for (const [variable, names] of byVariable) {
    if (names.length > 1) {
      warnings.push(
        `${variable} に変換されるスタイルが${names.length}件あります: ${names.join(" / ")}`,
      );
    }
  }
}

async function collect() {
  const warnings = [];
  const colors = await collectColors(warnings);
  const texts = await collectText(warnings);
  const families = collectFamilies(texts, warnings);

  checkCollisions(colors, warnings);
  checkCollisions(texts, warnings);

  return {
    json: {
      colorCount: colors.length,
      textCount: texts.length,
      warnings,
      colors,
      texts,
      fontFamilies: families,
    },
    css: buildTheme(colors, texts, families),
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
