"use strict";

// QuizApp専用のFigmaスペーシングVariables移行プラグイン。
// dry-run以外の処理は、UI側でPMが明示的に確認した場合だけ実行する。

const TARGET_ROOTS = {
  "525:2371": { screen: "Mobile", name: "Screens/Mobile" },
  "525:3394": { screen: "Display", name: "Screens/Display" },
  "525:5184": { screen: "admin", name: "admin" },
};

const SPACING_VARIABLES = [
  { px: 2, name: "space/0-5" },
  { px: 4, name: "space/1" },
  { px: 8, name: "space/2" },
  { px: 10, name: "space/2-5" },
  { px: 12, name: "space/3" },
  { px: 14, name: "space/3-5" },
  { px: 16, name: "space/4" },
  { px: 18, name: "space/4-5" },
  { px: 20, name: "space/5" },
  { px: 24, name: "space/6" },
  { px: 26, name: "space/6-5" },
  { px: 28, name: "space/7" },
  { px: 30, name: "space/7-5" },
  { px: 32, name: "space/8" },
  { px: 36, name: "space/9" },
  { px: 38, name: "space/9-5" },
  { px: 40, name: "space/10" },
  { px: 48, name: "space/12" },
  { px: 52, name: "space/13" },
  { px: 54, name: "space/13-5" },
  { px: 60, name: "space/15" },
  { px: 62, name: "space/15-5" },
  { px: 64, name: "space/16" },
  { px: 66, name: "space/16-5" },
  { px: 68, name: "space/17" },
  { px: 80, name: "space/20" },
  { px: 92, name: "space/23" },
  { px: 100, name: "space/25" },
  { px: 120, name: "space/30" },
  { px: 180, name: "space/45" },
];

const VARIABLE_BY_PX = new Map(
  SPACING_VARIABLES.map((item) => [item.px, item]),
);
const VARIABLE_NAMES = new Set(SPACING_VARIABLES.map((item) => item.name));
const BINDABLE_FIELDS = [
  "paddingTop",
  "paddingBottom",
  "paddingLeft",
  "paddingRight",
  "itemSpacing",
  "counterAxisSpacing",
];

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

let approvedDryRunSignature = null;
let running = false;

figma.showUI(__html__, {
  width: 760,
  height: 720,
  themeColors: true,
});

function post(type, payload = {}) {
  figma.ui.postMessage({ type, ...payload });
}

function serializeError(error) {
  if (error instanceof Error) {
    return error.message;
  }
  return String(error);
}

function selectionSignature(roots) {
  return roots
    .map((root) => root.id)
    .sort()
    .join("|");
}

function bindingScanFingerprint(scan) {
  return JSON.stringify({
    targets: scan.targets
      .map(
        (item) =>
          `${item.nodeId}|${item.field}|${item.value}|${item.boundVariableId || ""}`,
      )
      .sort(),
    skippedValues: scan.skippedValues
      .map(
        (item) => `${item.nodeId}|${item.field}|${item.value}|${item.reason}`,
      )
      .sort(),
    excluded: scan.excluded
      .map((item) => `${item.nodeId}|${item.reason}`)
      .sort(),
    traversalErrors: scan.traversalErrors
      .map((item) => `${item.nodeId}|${item.reason}`)
      .sort(),
  });
}

function variableStateFingerprint(variableState) {
  return JSON.stringify({
    collectionId: variableState.collection ? variableState.collection.id : null,
    createCollection: variableState.createCollection,
    reusable: variableState.reusable
      .map((item) => `${item.px}|${item.name}|${item.variable.id}`)
      .sort(),
    toCreate: variableState.toCreate
      .map((item) => `${item.px}|${item.name}`)
      .sort(),
    conflicts: variableState.conflicts.map((item) => item.message).sort(),
  });
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
    const expected = TARGET_ROOTS[node.id];
    if (!expected || node.name !== expected.name) {
      invalid.push(`${node.name} (${node.id})`);
      continue;
    }
    roots.push(node);
  }

  if (invalid.length > 0) {
    throw new Error(
      `対象外の選択があります: ${invalid.join(", ")}。指定された最上位フレームだけを選択してください。`,
    );
  }

  if (roots.length === 0) {
    throw new Error("指定された対象フレームを選択してください。");
  }

  return roots;
}

function currentSelectionInfo() {
  const selected = figma.currentPage.selection.map((node) => ({
    id: node.id,
    name: node.name,
    valid: Boolean(
      TARGET_ROOTS[node.id] && TARGET_ROOTS[node.id].name === node.name,
    ),
  }));
  return { selected };
}

function invalidateApprovals() {
  approvedDryRunSignature = null;
}

function sendSelectionInfo() {
  invalidateApprovals();
  post("selection-info", currentSelectionInfo());
}

figma.on("selectionchange", sendSelectionInfo);
sendSelectionInfo();

function isAutoLayoutNode(node) {
  return "layoutMode" in node && node.layoutMode !== "NONE";
}

function hasChildren(node) {
  return "children" in node && Array.isArray(node.children);
}

function getBoundVariableId(node, field) {
  const alias = node.boundVariables && node.boundVariables[field];
  if (!alias || Array.isArray(alias)) {
    return null;
  }
  return alias.id || null;
}

function propertyValue(node, field) {
  if (!(field in node)) {
    return null;
  }
  const value = node[field];
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function dedupePush(map, key, value) {
  if (!map.has(key)) {
    map.set(key, value);
  }
  return map.get(key);
}

async function collectBindingScan(roots) {
  const targets = new Map();
  const skippedValues = new Map();
  const excluded = new Map();
  const traversalErrors = new Map();
  const visitedByScreen = new Set();

  async function visit(node, screen, path, activeComponentIds) {
    if (!node || node.removed) {
      return;
    }

    if (isExcludedBoundary(node)) {
      const key = `${node.id}|${excludedReason(node)}`;
      const entry = dedupePush(excluded, key, {
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
        const mainComponent = await node.getMainComponentAsync();
        if (!mainComponent) {
          dedupePush(traversalErrors, `${node.id}|main-component-not-found`, {
            nodeId: node.id,
            nodeName: node.name,
            reason: "メインコンポーネントを取得できないためスキップ",
            screen,
          });
          return;
        }
        if (mainComponent.remote) {
          dedupePush(traversalErrors, `${mainComponent.id}|remote-component`, {
            nodeId: mainComponent.id,
            nodeName: mainComponent.name,
            reason:
              "リモートライブラリのコンポーネントは編集できないためスキップ",
            screen,
          });
          return;
        }
        if (activeComponentIds.has(mainComponent.id)) {
          dedupePush(traversalErrors, `${mainComponent.id}|component-cycle`, {
            nodeId: mainComponent.id,
            nodeName: mainComponent.name,
            reason: "コンポーネントの循環参照を検出したためスキップ",
            screen,
          });
          return;
        }

        const nextActive = new Set(activeComponentIds);
        nextActive.add(mainComponent.id);
        await visit(
          mainComponent,
          screen,
          `${path} → component:${mainComponent.name}`,
          nextActive,
        );
      } catch (error) {
        dedupePush(traversalErrors, `${node.id}|instance-error`, {
          nodeId: node.id,
          nodeName: node.name,
          reason: `インスタンス解析エラー: ${serializeError(error)}`,
          screen,
        });
      }
      return;
    }

    const visitKey = `${screen}|${node.id}`;
    if (visitedByScreen.has(visitKey)) {
      return;
    }
    visitedByScreen.add(visitKey);

    if (isAutoLayoutNode(node) && typeof node.setBoundVariable === "function") {
      for (const field of BINDABLE_FIELDS) {
        if (field === "counterAxisSpacing" && node.layoutWrap !== "WRAP") {
          continue;
        }

        // gapが「Auto」の指定は対象にしない。
        // counterAxisSpacingはこのときAPIがnullを返すが、itemSpacingは
        // 数値を返し続けるため、整列モードを見て明示的に除外する必要がある。
        if (
          field === "itemSpacing" &&
          node.primaryAxisAlignItems === "SPACE_BETWEEN"
        ) {
          continue;
        }
        if (
          field === "counterAxisSpacing" &&
          node.counterAxisAlignContent === "SPACE_BETWEEN"
        ) {
          continue;
        }

        const value = propertyValue(node, field);
        if (value === null || value <= 0) {
          continue;
        }

        const record = {
          node,
          nodeId: node.id,
          nodeName: node.name,
          field,
          value,
          path,
          screens: new Set([screen]),
          boundVariableId: getBoundVariableId(node, field),
        };

        if (VARIABLE_BY_PX.has(value)) {
          const key = `${node.id}|${field}`;
          const existing = dedupePush(targets, key, record);
          existing.screens.add(screen);
          continue;
        }

        const reason = "表にないpx値（据え置き）";

        const key = `${node.id}|${field}|${value}`;
        const existing = dedupePush(skippedValues, key, { ...record, reason });
        existing.screens.add(screen);
      }
    }

    if (hasChildren(node)) {
      for (const child of node.children) {
        await visit(
          child,
          screen,
          `${path} → ${child.name}`,
          activeComponentIds,
        );
      }
    }
  }

  for (const root of roots) {
    const screen = TARGET_ROOTS[root.id].screen;
    await visit(root, screen, root.name, new Set());
  }

  return {
    targets: [...targets.values()],
    skippedValues: [...skippedValues.values()],
    excluded: [...excluded.values()],
    traversalErrors: [...traversalErrors.values()],
  };
}

async function inspectVariables() {
  const [collections, variables] = await Promise.all([
    figma.variables.getLocalVariableCollectionsAsync(),
    figma.variables.getLocalVariablesAsync(),
  ]);

  const collectionsById = new Map(
    collections.map((collection) => [collection.id, collection]),
  );
  const variablesByName = new Map();
  for (const variable of variables) {
    if (!VARIABLE_NAMES.has(variable.name)) {
      continue;
    }
    if (!variablesByName.has(variable.name)) {
      variablesByName.set(variable.name, []);
    }
    variablesByName.get(variable.name).push(variable);
  }

  const conflicts = [];
  for (const [name, matches] of variablesByName) {
    if (matches.length > 1) {
      conflicts.push({
        type: "duplicate-variable",
        name,
        message: `同名のFLOAT Variableが${matches.length}個あります。`,
        variableIds: matches.map((variable) => variable.id),
      });
    } else if (matches[0].resolvedType !== "FLOAT") {
      conflicts.push({
        type: "wrong-variable-type",
        name,
        message: `${name}はFLOAT型ではありません。既存Variableを上書きしません。`,
        variableId: matches[0].id,
        actualType: matches[0].resolvedType,
      });
    }
  }

  // space/* は、このファイルのローカルVariableだけを見る。
  // 外部ライブラリの同名Variableは、このプロジェクトの基準ではないので参照しない。
  let collection = null;
  let createCollection = false;
  const spacingCollections = collections.filter(
    (item) => item.name === "Spacing",
  );

  if (spacingCollections.length === 1) {
    collection = spacingCollections[0];
  } else if (spacingCollections.length > 1) {
    conflicts.push({
      type: "duplicate-collection",
      message:
        "Spacingという名前のコレクションが複数あります。自動選択できません。",
      collectionIds: spacingCollections.map((item) => item.id),
    });
  } else {
    const existingTargetVariables = [...variablesByName.values()].flat();
    if (existingTargetVariables.length > 0) {
      conflicts.push({
        type: "spacing-collection-not-found",
        message:
          "Spacingコレクションが無い一方、space/* Variableが別のコレクションに存在します。手動で確認してください。",
      });
    } else {
      createCollection = true;
    }
  }

  const reusable = [];
  const toCreate = [];
  const variableByPx = new Map();

  for (const expected of SPACING_VARIABLES) {
    const matches = variablesByName.get(expected.name) || [];
    if (matches.length > 1) {
      continue;
    }
    if (matches.length === 0) {
      toCreate.push(expected);
      continue;
    }

    const variable = matches[0];
    if (variable.resolvedType !== "FLOAT") {
      continue;
    }
    const variableCollection = collectionsById.get(
      variable.variableCollectionId,
    );
    if (collection && variable.variableCollectionId !== collection.id) {
      conflicts.push({
        type: "wrong-collection",
        name: expected.name,
        message: `${expected.name}が選択予定のコレクションとは別のコレクションにあります。`,
        variableId: variable.id,
      });
      continue;
    }

    if (!variableCollection) {
      conflicts.push({
        type: "collection-not-found",
        name: expected.name,
        message: `${expected.name}のコレクションを取得できません。`,
        variableId: variable.id,
      });
      continue;
    }

    const wrongModes = variableCollection.modes.filter(
      (mode) => variable.valuesByMode[mode.modeId] !== expected.px,
    );
    if (wrongModes.length > 0) {
      conflicts.push({
        type: "wrong-value",
        name: expected.name,
        expected: expected.px,
        message: `${expected.name}の値が${expected.px}pxと一致しないモードがあります。上書きしません。`,
        modes: wrongModes.map((mode) => ({
          mode: mode.name,
          actual: variable.valuesByMode[mode.modeId],
        })),
      });
      continue;
    }

    reusable.push({ ...expected, variable });
    variableByPx.set(expected.px, variable);
  }

  return {
    collection,
    collectionName: collection ? collection.name : "Spacing",
    createCollection,
    reusable,
    toCreate,
    conflicts,
    variableByPx,
  };
}

function summarizeSkippedByValue(records) {
  const groups = new Map();
  for (const record of records) {
    const key = `${record.value}|${record.reason}`;
    if (!groups.has(key)) {
      groups.set(key, {
        px: record.value,
        reason: record.reason,
        count: 0,
        nodeIds: new Set(),
      });
    }
    const group = groups.get(key);
    group.count += 1;
    group.nodeIds.add(record.nodeId);
  }
  return [...groups.values()]
    .map((group) => ({
      ...group,
      nodeCount: group.nodeIds.size,
      nodeIds: [...group.nodeIds].sort(),
    }))
    .sort((a, b) => a.px - b.px || a.reason.localeCompare(b.reason));
}

function summarizeBindingTable(records) {
  const groups = new Map();
  for (const record of records) {
    const variable = VARIABLE_BY_PX.get(record.value);
    const screen = [...record.screens].sort().join(" / ");
    const key = `${screen}|${record.value}|${variable.name}`;
    if (!groups.has(key)) {
      groups.set(key, {
        screen,
        px: record.value,
        variable: variable.name,
        count: 0,
      });
    }
    groups.get(key).count += 1;
  }
  return [...groups.values()].sort(
    (a, b) => a.screen.localeCompare(b.screen) || a.px - b.px,
  );
}

function publicTarget(record) {
  return {
    nodeId: record.nodeId,
    nodeName: record.nodeName,
    field: record.field,
    value: record.value,
    variable: VARIABLE_BY_PX.get(record.value)?.name || null,
    screens: [...record.screens].sort(),
    path: record.path,
    boundVariableId: record.boundVariableId,
  };
}

async function analyzeBindings(scan, variableState) {
  const planned = [];
  const alreadyBound = [];
  const boundToOther = [];
  const unavailableVariable = [];

  const expectedVariableIds = new Map(
    variableState.reusable.map((item) => [item.px, item.variable.id]),
  );

  for (const target of scan.targets) {
    const expected = VARIABLE_BY_PX.get(target.value);
    const existingVariableId = expectedVariableIds.get(target.value) || null;
    if (target.boundVariableId) {
      if (existingVariableId && target.boundVariableId === existingVariableId) {
        alreadyBound.push(target);
      } else {
        boundToOther.push(target);
      }
      continue;
    }

    const hasVariableConflict = variableState.conflicts.some(
      (conflict) => conflict.name === expected.name,
    );
    if (hasVariableConflict) {
      unavailableVariable.push(target);
      continue;
    }
    planned.push(target);
  }

  return { planned, alreadyBound, boundToOther, unavailableVariable };
}

function publicVariablePlan(variableState) {
  return {
    collectionName: variableState.collectionName,
    createCollection: variableState.createCollection,
    reuse: variableState.reusable.map((item) => ({
      px: item.px,
      name: item.name,
    })),
    create: variableState.toCreate,
    conflicts: variableState.conflicts,
  };
}

async function runDryRun() {
  const roots = getSelectedTargetRoots();
  const signature = selectionSignature(roots);
  const [scan, variableState] = await Promise.all([
    collectBindingScan(roots),
    inspectVariables(),
  ]);
  const analysis = await analyzeBindings(scan, variableState);

  const blockers = [
    ...variableState.conflicts.map((item) => item.message),
    ...scan.traversalErrors.map((item) => item.reason),
    ...(analysis.boundToOther.length > 0
      ? ["別のVariableへバインド済みの対象があります。内容を確認してください。"]
      : []),
  ];
  const hasPendingWork =
    analysis.planned.length > 0 || variableState.toCreate.length > 0;
  const canApply = blockers.length === 0 && hasPendingWork;
  approvedDryRunSignature = canApply
    ? {
        selection: signature,
        scan: bindingScanFingerprint(scan),
        variables: variableStateFingerprint(variableState),
      }
    : null;

  post("dry-run-report", {
    report: {
      selection: roots.map((root) => ({
        id: root.id,
        name: root.name,
        screen: TARGET_ROOTS[root.id].screen,
      })),
      canApply,
      blockers,
      variablePlan: publicVariablePlan(variableState),
      bindingTable: summarizeBindingTable(analysis.planned),
      totals: {
        planned: analysis.planned.length,
        alreadyBound: analysis.alreadyBound.length,
        boundToOther: analysis.boundToOther.length,
        unavailableVariable: analysis.unavailableVariable.length,
        keptAsIs: scan.skippedValues.length,
        excludedSubtrees: scan.excluded.length,
      },
      keptValues: summarizeSkippedByValue(scan.skippedValues),
      excluded: scan.excluded.map((item) => ({
        ...item,
        screens: [...item.screens].sort(),
      })),
      alreadyBound: analysis.alreadyBound.map(publicTarget),
      boundToOther: analysis.boundToOther.map(publicTarget),
      unavailableVariable: analysis.unavailableVariable.map(publicTarget),
      traversalErrors: scan.traversalErrors,
    },
  });
}

async function createVariables(variableState) {
  let collection = variableState.collection;
  const created = [];
  const errors = [];
  let collectionCreated = false;

  if (!collection) {
    if (!variableState.createCollection) {
      throw new Error("使用するVariable Collectionを安全に決定できません。");
    }
    collection = figma.variables.createVariableCollection("Spacing");
    collectionCreated = true;
  }

  const variableByPx = new Map(variableState.variableByPx);
  for (const expected of variableState.toCreate) {
    let variable = null;
    try {
      variable = figma.variables.createVariable(
        expected.name,
        collection,
        "FLOAT",
      );
      created.push({
        px: expected.px,
        name: expected.name,
        variableId: variable.id,
      });
      for (const mode of collection.modes) {
        variable.setValueForMode(mode.modeId, expected.px);
      }
      variable.scopes = ["GAP"];
      variableByPx.set(expected.px, variable);
    } catch (error) {
      errors.push({
        px: expected.px,
        name: expected.name,
        variableId: variable ? variable.id : null,
        reason: serializeError(error),
      });
    }
  }

  return { collection, variableByPx, created, errors, collectionCreated };
}

async function applyBindings() {
  const roots = getSelectedTargetRoots();
  const signature = selectionSignature(roots);
  const approval = approvedDryRunSignature;
  if (!approval || approval.selection !== signature) {
    throw new Error("同じ選択範囲で、先にdry-runを成功させてください。");
  }
  approvedDryRunSignature = null;

  const scan = await collectBindingScan(roots);
  const beforeState = await inspectVariables();
  const beforeAnalysis = await analyzeBindings(scan, beforeState);
  if (
    beforeState.conflicts.length > 0 ||
    scan.traversalErrors.length > 0 ||
    beforeAnalysis.boundToOther.length > 0
  ) {
    throw new Error(
      "dry-run後に競合が見つかりました。dry-runをやり直してください。",
    );
  }
  if (
    approval.scan !== bindingScanFingerprint(scan) ||
    approval.variables !== variableStateFingerprint(beforeState)
  ) {
    throw new Error(
      "dry-run後にFigmaの状態が変わりました。dry-runをやり直してください。",
    );
  }

  const createdState = await createVariables(beforeState);
  const bound = [];
  const skipped = [];
  const errors = [];

  if (createdState.errors.length > 0) {
    approvedDryRunSignature = null;
    post("binding-apply-report", {
      report: {
        collection: {
          id: createdState.collection.id,
          name: createdState.collection.name,
          newlyCreated: createdState.collectionCreated,
        },
        createdVariables: createdState.created,
        variableErrors: createdState.errors,
        boundCount: 0,
        skippedCount: scan.targets.length,
        errorCount: createdState.errors.length,
        bindingTable: [],
        bound: [],
        skipped: scan.targets.map((target) => ({
          ...publicTarget(target),
          reason: "Variable作成エラーがあったためバインドを開始していない",
        })),
        errors: createdState.errors,
        warning:
          "VariableまたはCollectionが途中まで作成されています。variableErrorsを確認し、再実行前にFigma側の状態を確認してください。",
      },
    });
    return;
  }

  for (const target of scan.targets) {
    const expected = VARIABLE_BY_PX.get(target.value);
    const variable = createdState.variableByPx.get(target.value);
    if (!variable) {
      skipped.push({
        ...publicTarget(target),
        reason: `${expected.name}を取得できない`,
      });
      continue;
    }

    try {
      const currentValue = propertyValue(target.node, target.field);
      if (currentValue !== target.value || currentValue !== expected.px) {
        skipped.push({
          ...publicTarget(target),
          reason: `実行直前の値${currentValue}pxがVariableの${expected.px}pxと一致しない`,
        });
        continue;
      }

      const currentBoundId = getBoundVariableId(target.node, target.field);
      if (currentBoundId === variable.id) {
        skipped.push({
          ...publicTarget(target),
          reason: "すでに同じVariableへバインド済み",
        });
        continue;
      }
      if (currentBoundId) {
        skipped.push({
          ...publicTarget(target),
          reason: `別のVariable (${currentBoundId}) へバインド済み`,
        });
        continue;
      }

      target.node.setBoundVariable(target.field, variable);
      bound.push(publicTarget(target));
    } catch (error) {
      errors.push({
        ...publicTarget(target),
        reason: serializeError(error),
      });
    }
  }

  approvedDryRunSignature = null;
  post("binding-apply-report", {
    report: {
      collection: {
        id: createdState.collection.id,
        name: createdState.collection.name,
        newlyCreated: createdState.collectionCreated,
      },
      createdVariables: createdState.created,
      variableErrors: [],
      boundCount: bound.length,
      skippedCount: skipped.length,
      errorCount: errors.length,
      bindingTable: summarizeBindingTable(
        scan.targets.filter((target) =>
          bound.some(
            (item) =>
              item.nodeId === target.nodeId && item.field === target.field,
          ),
        ),
      ),
      bound,
      skipped,
      errors,
      warning:
        errors.length > 0
          ? "途中まで書き込まれています。bound一覧とerrors一覧を確認してください。"
          : null,
    },
  });
}

async function runAction(action) {
  if (running) {
    post("action-error", { action, message: "別の処理を実行中です。" });
    return;
  }
  running = true;
  post("busy", { action });
  try {
    if (action === "dry-run") {
      await runDryRun();
    } else if (action === "apply-bindings") {
      await applyBindings();
    } else {
      throw new Error(`不明な操作です: ${action}`);
    }
  } catch (error) {
    post("action-error", { action, message: serializeError(error) });
  } finally {
    running = false;
    post("idle", { action });
  }
}

figma.ui.onmessage = (message) => {
  if (!message || typeof message.action !== "string") {
    return;
  }
  void runAction(message.action);
};
