"use strict";

// 選択した画面フレーム配下のテキストを読み取り、
//   1. どの Text Style が何件使われているか
//   2. Text Style が当たっていない生のテキストはどれか
//   3. fontSize が何種類あるか
// を一覧にする。読み取り専用。Figma には一切書き込まない。

const TARGET_ROOTS = {
  "525:2371": { screen: "Mobile", name: "Screens/Mobile" },
  "525:3394": { screen: "Display", name: "Screens/Display" },
  "525:5184": { screen: "admin", name: "admin" },
};

// スペーシング作業と同じ除外リスト。基準を作り直さない。
const EXCLUDED_FRAME_IDS = new Set([
  "525:2393",
  "525:2451",
  "525:2458",
  "525:3434",
  "525:3441",
  "525:3448",
  "525:3455",
  "525:3459",
  "525:3463",
  "525:3467",
  "525:3471",
  "475:8171",
]);

figma.showUI(__html__, { width: 860, height: 720, themeColors: true });

function post(type, payload) {
  figma.ui.postMessage(Object.assign({ type }, payload));
}

function serializeError(error) {
  return error instanceof Error ? error.message : String(error);
}

function hasChildren(node) {
  return "children" in node && Array.isArray(node.children);
}

function isExcludedBoundary(node) {
  if (EXCLUDED_FRAME_IDS.has(node.id)) {
    return true;
  }
  const name = node.name || "";
  return (
    name === "Mobile/System/Status Bar" ||
    name.startsWith("Mobile/Screen/Repechage/") ||
    name.startsWith("Display/Screen/Repechage/") ||
    name.startsWith("Display/Screen/Buzzer/")
  );
}

function excludedReason(node) {
  const name = node.name || "";
  if (name === "Mobile/System/Status Bar" || node.id === "475:8171") {
    return "ステータスバー";
  }
  if (name.startsWith("Display/Screen/Buzzer/")) {
    return "早押し（フェーズ2）";
  }
  return "救済問題";
}

// 1つのテキストノードの中で値が混在していると figma.mixed が返る。
// 勝手に代表値を選ばず、「混在」として報告する。
function plain(value) {
  return typeof value === "symbol" ? null : value;
}

function describeFont(fontName) {
  const font = plain(fontName);
  if (!font) return { family: null, style: null };
  return { family: font.family, style: font.style };
}

function describeLineHeight(lineHeight) {
  const value = plain(lineHeight);
  if (!value) return null;
  if (value.unit === "AUTO") return "AUTO";
  return value.unit === "PERCENT"
    ? `${Math.round(value.value * 100) / 100}%`
    : `${Math.round(value.value * 100) / 100}px`;
}

function describeLetterSpacing(letterSpacing) {
  const value = plain(letterSpacing);
  if (!value) return null;
  return value.unit === "PERCENT"
    ? `${Math.round(value.value * 100) / 100}%`
    : `${Math.round(value.value * 100) / 100}px`;
}

function getSelectedTargetRoots() {
  const selection = figma.currentPage.selection;
  if (selection.length === 0) {
    throw new Error(
      "対象フレームが選択されていません。Screens/Mobile、Screens/Display、adminのいずれかを選択してください。",
    );
  }
  const roots = [];
  const invalid = [];
  for (const node of selection) {
    if (TARGET_ROOTS[node.id] && TARGET_ROOTS[node.id].name === node.name) {
      roots.push(node);
    } else {
      invalid.push(`${node.name}（${node.id}）`);
    }
  }
  if (invalid.length > 0) {
    throw new Error(`対象外のフレームが選択されています: ${invalid.join(", ")}`);
  }
  return roots;
}

function currentSelectionInfo() {
  return {
    selected: figma.currentPage.selection.map((node) => ({
      id: node.id,
      name: node.name,
      valid: Boolean(
        TARGET_ROOTS[node.id] && TARGET_ROOTS[node.id].name === node.name,
      ),
    })),
  };
}

function bump(map, key, seed) {
  if (!map.has(key)) {
    map.set(key, Object.assign({ count: 0, nodeIds: [] }, seed));
  }
  return map.get(key);
}

function record(entry, node, screen) {
  entry.count += 1;
  if (entry.nodeIds.length < 12) {
    entry.nodeIds.push(node.id);
  }
  entry.screens.add(screen);
}

async function scan(roots) {
  const styled = new Map();
  const unstyled = new Map();
  const fontSizes = new Map();
  const excluded = new Map();
  const errors = [];
  const styleNameCache = new Map();
  const visited = new Set();
  let textNodeCount = 0;

  async function styleName(styleId) {
    if (styleNameCache.has(styleId)) {
      return styleNameCache.get(styleId);
    }
    let name = null;
    try {
      const style = await figma.getStyleByIdAsync(styleId);
      name = style ? style.name : null;
    } catch (error) {
      errors.push({ styleId, reason: serializeError(error) });
    }
    styleNameCache.set(styleId, name);
    return name;
  }

  async function visit(node, screen, path, activeComponentIds) {
    if (!node || node.removed) return;

    if (isExcludedBoundary(node)) {
      const entry = bump(excluded, node.id, {
        nodeId: node.id,
        nodeName: node.name,
        reason: excludedReason(node),
        screens: new Set(),
      });
      entry.screens.add(screen);
      return;
    }

    if (node.type === "INSTANCE") {
      try {
        const main = await node.getMainComponentAsync();
        if (!main || main.remote || activeComponentIds.has(main.id)) {
          return;
        }
        const next = new Set(activeComponentIds);
        next.add(main.id);
        await visit(main, screen, `${path} → component:${main.name}`, next);
      } catch (error) {
        errors.push({ nodeId: node.id, reason: serializeError(error) });
      }
      return;
    }

    const visitKey = `${screen}|${node.id}`;
    if (visited.has(visitKey)) return;
    visited.add(visitKey);

    if (node.type === "TEXT") {
      textNodeCount += 1;
      const styleId = plain(node.textStyleId);
      const size = plain(node.fontSize);
      const font = describeFont(node.fontName);

      if (size !== null) {
        const sizeEntry = bump(fontSizes, size, {
          px: size,
          screens: new Set(),
        });
        record(sizeEntry, node, screen);
      }

      if (styleId === null) {
        // 1ノード内でスタイルが混在している。値を代表させず、そのまま報告する。
        const entry = bump(unstyled, `mixed|${node.id}`, {
          kind: "混在",
          family: null,
          style: null,
          px: null,
          lineHeight: null,
          letterSpacing: null,
          screens: new Set(),
          path,
        });
        record(entry, node, screen);
        return;
      }

      if (styleId) {
        const name = await styleName(styleId);
        const entry = bump(styled, styleId, {
          styleId,
          name: name || "(取得できないスタイル)",
          screens: new Set(),
        });
        record(entry, node, screen);
        return;
      }

      // styleId === "" → スタイルが当たっていない生のテキスト
      const key = [
        font.family,
        font.style,
        size,
        describeLineHeight(node.lineHeight),
        describeLetterSpacing(node.letterSpacing),
      ].join("|");
      const entry = bump(unstyled, key, {
        kind: "スタイル未適用",
        family: font.family,
        style: font.style,
        px: size,
        lineHeight: describeLineHeight(node.lineHeight),
        letterSpacing: describeLetterSpacing(node.letterSpacing),
        screens: new Set(),
        path,
      });
      record(entry, node, screen);
      return;
    }

    if (hasChildren(node)) {
      for (const child of node.children) {
        await visit(child, screen, `${path} → ${child.name}`, activeComponentIds);
      }
    }
  }

  for (const root of roots) {
    await visit(root, TARGET_ROOTS[root.id].screen, root.name, new Set());
  }

  const withScreens = (entry) =>
    Object.assign({}, entry, { screens: [...entry.screens].sort() });

  return {
    textNodeCount,
    styled: [...styled.values()]
      .map(withScreens)
      .sort((a, b) => b.count - a.count),
    unstyled: [...unstyled.values()]
      .map(withScreens)
      .sort((a, b) => b.count - a.count),
    fontSizes: [...fontSizes.values()]
      .map(withScreens)
      .sort((a, b) => b.px - a.px),
    excluded: [...excluded.values()].map(withScreens),
    errors,
  };
}

async function run() {
  try {
    const roots = getSelectedTargetRoots();
    const result = await scan(roots);
    const localStyles = await figma.getLocalTextStylesAsync();
    const usedIds = new Set(result.styled.map((item) => item.styleId));

    post("report", {
      report: Object.assign(
        {
          selection: roots.map((root) => ({
            id: root.id,
            name: root.name,
            screen: TARGET_ROOTS[root.id].screen,
          })),
          localStyleCount: localStyles.length,
          // 存在するのに1件も使われていないスタイル。整理の判断材料になる。
          unusedStyles: localStyles
            .filter((style) => !usedIds.has(style.id))
            .map((style) => style.name)
            .sort(),
        },
        result,
      ),
    });
  } catch (error) {
    post("error", { message: serializeError(error) });
  }
}

function sendSelection() {
  post("selection-info", currentSelectionInfo());
}

figma.on("selectionchange", sendSelection);
sendSelection();

figma.ui.onmessage = (message) => {
  if (message && message.action === "scan") {
    void run();
  }
};
