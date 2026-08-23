"use strict";

// このファイルのローカル Color Style を読み取って、名前と hex の一覧を出す。
// 読み取り専用。Figma には一切書き込まない。

figma.showUI(__html__, { width: 760, height: 680, themeColors: true });

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
    entry.opacity = Math.round(opacity * 1000) / 1000;
    entry.hex8 = `${entry.hex}${toHex(opacity)}`;
  }
  if (paint.visible === false) {
    entry.visible = false;
  }
  return entry;
}

// "text/primary" → "--color-text-primary"
// 先頭の "color/" は落とす（"--color-color-border" を避ける）。
// 英数字が1文字も残らない場合（日本語名など）は null を返し、呼び出し側で警告する。
function cssVariableName(styleName) {
  const slug = styleName
    .toLowerCase()
    .replace(/^color[\s_/]+/, "")
    .replace(/[\s_/]+/g, "-")
    .replace(/[^a-z0-9-]/g, "")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
  return slug ? `--color-${slug}` : null;
}

function cssValue(cssVariable, paints) {
  if (cssVariable === null) {
    return null;
  }
  const visible = paints.filter((paint) => paint.visible !== false);
  if (visible.length !== 1 || visible[0].type !== "SOLID") {
    return null;
  }
  return visible[0].hex8 || visible[0].hex;
}

async function collect() {
  const styles = await figma.getLocalPaintStylesAsync();

  const items = styles
    .map((style) => {
      const paints = style.paints.map(describePaint);
      const cssVariable = cssVariableName(style.name);
      return {
        name: style.name,
        cssVariable,
        cssValue: cssValue(cssVariable, paints),
        paints,
        description: style.description || undefined,
        styleId: style.id,
      };
    })
    .sort((a, b) => a.name.localeCompare(b.name));

  // 同じ CSS 変数名になるスタイルがあると、片方が黙って消える。必ず報告する。
  const byVariable = new Map();
  for (const item of items) {
    if (item.cssVariable === null) {
      continue;
    }
    if (!byVariable.has(item.cssVariable)) {
      byVariable.set(item.cssVariable, []);
    }
    byVariable.get(item.cssVariable).push(item.name);
  }

  const warnings = [];
  for (const [variable, names] of byVariable) {
    if (names.length > 1) {
      warnings.push(
        `${variable} に変換されるスタイルが${names.length}件あります: ${names.join(" / ")}`,
      );
    }
  }
  for (const item of items) {
    if (item.cssVariable === null) {
      warnings.push(
        `${item.name} は英数字を含まないため CSS 変数名にできません。Figma 側でスタイル名を英数字にしてください。`,
      );
    } else if (item.cssValue === null) {
      const kinds = item.paints.map((paint) => paint.type).join(", ");
      warnings.push(
        `${item.name} は単色ではないため CSS 変数にできません（${kinds}）。手動で判断してください。`,
      );
    }
  }

  const theme = items
    .filter((item) => item.cssValue !== null)
    .map((item) => `  ${item.cssVariable}: ${item.cssValue};`)
    .join("\n");

  return {
    json: { count: items.length, warnings, styles: items },
    css: `@theme {\n${theme}\n}\n`,
  };
}

async function run() {
  try {
    const result = await collect();
    figma.ui.postMessage({ type: "result", ...result });
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
