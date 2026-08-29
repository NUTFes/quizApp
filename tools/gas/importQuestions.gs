/**
 * quizApp #61: 【入稿STEP1】GASでスプレッドシートを読み、投入用JSONを作る
 *
 * 責務(API仕様書 §3.5.1): 列 → JSON の変換のみ。内容の妥当性はサーバーが見る。
 * ただしGASにしかできない変換・検証はここでやる:
 *   - difficulty: シート上は 簡単/普通/難しい(プルダウン選択)。
 *     API内部表現の easy/normal/hard へGAS側で変換して送る(§3.5.6)。
 *   - text を / で split して textSegments 化(空要素除去)
 *   - arunashi の「ラベル:項目/項目/項目」書式検証(送るのは生文字列のまま。§1)
 *   - 2択/あるなしの choiceC/D 空欄チェック(choices は2個で送る)
 *   - correct(列名) → correctChoiceId 変換、該当選択肢の非空チェック
 *   - hayaoshi 行のエラー化(v1未対応・フェーズ2で解放)
 * 送信は行わない(→ #63)。JSONをダイアログに出すところまで。
 *
 * シートレイアウト:
 *   1行目ヘッダ、2行目からデータ。A列から開始。
 *
 * ★セキュリティ★
 * IMPORT_TOKEN 等のシークレットはコードに直書きしない。
 * #63 で必要になったら PropertiesService.getScriptProperties() に置く(§3.5.6)。
 * このファイルを tools/gas/ にコミットするときはトークンが埋まっていないか目視確認する。
 */

// UI(トップレベルで getUi() するとエディタ実行が落ちるので onOpen 内で初期化)
var ui;

// ===== 設定 =====

// 列定義(1-indexed)。A列から開始
const COL = {
  number:      1,   // A: 表示用クイズ番号
  type:        2,   // B: four_choice / two_choice / arunashi (hayaoshi はv1不可)
  difficulty:  3,   // C: 簡単 / 普通 / 難しい(プルダウン)
  text:        4,   // D: 問題文。区切りたい位置に /
  choiceA:     5,   // E
  choiceB:     6,   // F
  choiceC:     7,   // G: 2択・あるなしは空欄
  choiceD:     8,   // H: 2択・あるなしは空欄
  correct:     9,   // I: 正解の列名(A〜D)
  imageUrl:   10,   // J: 問題画像パス(任意)
  imageA:     11,   // K: 選択肢画像パス(任意)
  imageB:     12,   // L
  imageC:     13,   // M
  imageD:     14,   // N
  explanation: 15,  // O: 正答の解説(任意)
};

const HEADER_START_COLUMN = 1;  // A列
const HEADER_NAMES = [
  'number', 'type', 'difficulty', 'text',
  'choiceA', 'choiceB', 'choiceC', 'choiceD',
  'correct', 'imageUrl', 'imageA', 'imageB', 'imageC', 'imageD',
  'explanation',
];

const DATA_START_ROW = 2;  // 1行目はヘッダ、データは2行目から(sourceRow は実際の行番号)

const TYPE_OPTIONS = ['four_choice', 'two_choice', 'arunashi', 'hayaoshi'];
const DIFFICULTY_OPTIONS = ['簡単', '普通', '難しい'];

// §3.5.6: 入稿は日本語、API以降は英語(入り口で正規化して中は1種類)
const DIFFICULTY_MAP = {
  '簡単':   'easy',
  '普通':   'normal',
  '難しい': 'hard',
};

const CHOICE_IDS = ['A', 'B', 'C', 'D'];

// ===== メニュー =====

function onOpen() {
  ui = SpreadsheetApp.getUi();
  ui.createMenu('quizApp')
    .addItem('JSONを作る', 'generateQuestionsJson')
    .addSeparator()
    .addItem('ヘッダ行とプルダウンを作る(テンプレート用)', 'writeTemplateHeader')
    .addToUi();
}

// ===== メイン処理 =====

/**
 * アクティブシートを読み、§3.5.1 形式のJSONを生成してダイアログに表示する
 */
function generateQuestionsJson() {
  ui = SpreadsheetApp.getUi();  // メニュー以外からの実行にも対応
  try {
    const sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
    const values = sheet.getDataRange().getValues();

    if (values.length < DATA_START_ROW) {
      ui.alert('データがありません。2行目以降に問題を入力してください。');
      return;
    }

    const questions = [];
    const errors = [];

    for (let i = DATA_START_ROW - 1; i < values.length; i++) {
      const row = values[i];
      const sourceRow = i + 1;  // 1-indexed のシート行番号(ヘッダが1行目、最初のデータは2)

      // 全セル空の行はスキップ(運営メンバーが行間隔をあけるケース対応)
      if (isEmptyRow(row)) continue;

      const result = convertRow(row, sourceRow);
      if (result.errors.length > 0) {
        Array.prototype.push.apply(errors, result.errors);
      } else {
        questions.push(result.question);
      }
    }

    // エラーが1件でもあれば JSON を出さずにエラー一覧を表示
    if (errors.length > 0) {
      showErrorsDialog(errors);
      return;
    }

    if (questions.length === 0) {
      ui.alert('変換できる問題がありませんでした。2行目以降に問題を入力してください。');
      return;
    }

    const json = JSON.stringify({ questions: questions }, null, 2);
    showJsonDialog(json, questions.length);

  } catch (error) {
    ui.alert(
      '想定外のエラーが発生しました\n' +
      '----- エラー内容 -----\n' +
      error.message + '\n' +
      '----------------------'
    );
    Logger.log('Error: ' + error.message + '\n' + error.stack);
  }
}

// ===== 変換ロジック =====

/**
 * 1行を検証・変換する(§3.5.1 の形へ)
 * @return {{question: Object|null, errors: string[]}}
 */
function convertRow(row, sourceRow) {
  const errors = [];

  const numberRaw     = String(row[COL.number      - 1]).trim();
  const type          = String(row[COL.type        - 1]).trim();
  const difficultyRaw = String(row[COL.difficulty  - 1]).trim();
  const textRaw       = String(row[COL.text        - 1]);
  const correctRaw    = String(row[COL.correct     - 1]).trim().toUpperCase();
  const imageUrlRaw   = String(row[COL.imageUrl    - 1]).trim();
  const explanationRaw = String(row[COL.explanation - 1]).trim();

  const choiceTexts = [
    String(row[COL.choiceA - 1]).trim(),
    String(row[COL.choiceB - 1]).trim(),
    String(row[COL.choiceC - 1]).trim(),
    String(row[COL.choiceD - 1]).trim(),
  ];
  const choiceImages = [
    String(row[COL.imageA - 1]).trim(),
    String(row[COL.imageB - 1]).trim(),
    String(row[COL.imageC - 1]).trim(),
    String(row[COL.imageD - 1]).trim(),
  ];

  // --- type チェック ---
  if (TYPE_OPTIONS.indexOf(type) === -1) {
    errors.push(`${sourceRow}行目: type は ${TYPE_OPTIONS.join(' / ')} のどれかにしてください(入力値: "${type}")`);
    return { question: null, errors: errors };  // 以降のチェックは意味がないので早期return
  }

  // --- number チェック(JSONには数値型で入れる必要があるためGAS側で確認) ---
  const number = Number(numberRaw);
  if (numberRaw === '' || !Number.isInteger(number) || number < 1) {
    errors.push(`${sourceRow}行目: number は 1 以上の整数にしてください(入力値: "${numberRaw}")`);
  }

  // --- difficulty 変換(日本語→英語。Hard / hard␣ 等の表記ゆれを入口で止める。§3.5.6) ---
  let difficulty = null;
  if (Object.prototype.hasOwnProperty.call(DIFFICULTY_MAP, difficultyRaw)) {
    difficulty = DIFFICULTY_MAP[difficultyRaw];
  } else {
    errors.push(`${sourceRow}行目: 難易度は ${DIFFICULTY_OPTIONS.join(' / ')} のどれかにしてください(入力値: "${difficultyRaw}")`);
  }

  // --- text → textSegments(/ で分割、空要素を除去) ---
  const textSegments = textRaw.split('/').map(function (s) { return s.trim(); })
                              .filter(function (s) { return s.length > 0; });
  if (textSegments.length === 0) {
    errors.push(`${sourceRow}行目: 問題文(text)が空です`);
  } else if (type === 'hayaoshi' && textSegments.length < 2) {
    // 早押しは「途中まで読んで押す」ものなので、区切りが無いと成立しない(§3.5.3)
    errors.push(
      `${sourceRow}行目: 早押しの問題文は / で2つ以上に区切ってください` +
      `(途中で押せる場所が無くなるため)。入力値: "${textRaw}"`
    );
  }

  // --- 早押しはここで確定。選択肢も正解も持たない(§1) ---
  // 判定は人力なので choices は空配列、correctChoiceId は null。
  // 答えをモニタに出したい場合は explanation 列に書く。
  if (type === 'hayaoshi') {
    for (let k = 0; k < 4; k++) {
      if (choiceTexts[k] !== '') {
        errors.push(`${sourceRow}行目: 早押しでは選択肢${CHOICE_IDS[k]}は空欄にしてください(判定は人力のため)`);
      }
    }
    if (correctRaw !== '') {
      errors.push(
        `${sourceRow}行目: 早押しでは正解(correct)は空欄にしてください` +
        `(答えは explanation 列に書くとモニタに表示されます)。入力値: "${correctRaw}"`
      );
    }
    if (errors.length > 0) {
      return { question: null, errors: errors };
    }
    return {
      question: {
        sourceRow:       sourceRow,
        number:          number,
        type:            type,
        difficulty:      difficulty,
        textSegments:    textSegments,
        imageUrl:        imageUrlRaw !== '' ? imageUrlRaw : null,
        choices:         [],
        correctChoiceId: null,
        explanation:     explanationRaw !== '' ? explanationRaw : null,
      },
      errors: [],
    };
  }

  // --- 選択肢の構築 ---
  // four_choice は4個、two_choice / arunashi は2個(§1「arunashiは2個・形はtwo_choiceと同じ」)
  const choiceCount = (type === 'four_choice') ? 4 : 2;

  // 使わない列(2択・あるなしの C/D)は空欄でなければならない
  if (choiceCount === 2 && (choiceTexts[2] !== '' || choiceTexts[3] !== '')) {
    const label = (type === 'two_choice') ? '2択' : 'あるなし';
    errors.push(`${sourceRow}行目: ${label}問題では選択肢C・Dは空欄にしてください`);
  }

  const choices = [];
  for (let k = 0; k < choiceCount; k++) {
    const id = CHOICE_IDS[k];
    const text = choiceTexts[k];

    if (text === '') {
      errors.push(`${sourceRow}行目: 選択肢${id}を入力してください`);
      continue;
    }

    // arunashi は「ラベル:項目/項目/項目」書式を検証する(送るのは生文字列のまま。§1)
    if (type === 'arunashi' && !isValidArunashiFormat(text)) {
      errors.push(
        `${sourceRow}行目: 選択肢${id}の書式が正しくありません。` +
        `「ラベル:項目/項目/項目」の形で入力してください(例: ある:いか/くも/あり)。入力値: "${text}"`
      );
      continue;
    }

    choices.push({
      id: id,
      text: text,
      imageUrl: choiceImages[k] !== '' ? choiceImages[k] : null,  // 値が無いときは null(§0)
    });
  }

  // --- correct → correctChoiceId 変換 ---
  const validCorrect = CHOICE_IDS.slice(0, choiceCount);  // 4択: A〜D / 2択・あるなし: A〜B
  if (!validCorrect.includes(correctRaw)) {
    errors.push(`${sourceRow}行目: 正解(correct)は ${validCorrect.join(' / ')} のどれかにしてください(入力値: "${correctRaw}")`);
  } else {
    const idx = CHOICE_IDS.indexOf(correctRaw);
    if (choiceTexts[idx] === '') {
      errors.push(`${sourceRow}行目: 正解に指定した選択肢${correctRaw}が空です`);
    }
  }

  if (errors.length > 0) {
    return { question: null, errors: errors };
  }

  // --- 変換成功: §3.5.1 の形で構築(id はサーバーが採番するので送らない) ---
  const question = {
    sourceRow:       sourceRow,
    number:          number,
    type:            type,
    difficulty:      difficulty,
    textSegments:    textSegments,
    imageUrl:        imageUrlRaw !== '' ? imageUrlRaw : null,
    choices:         choices,
    correctChoiceId: correctRaw,
    explanation:     explanationRaw !== '' ? explanationRaw : null,
  };
  return { question: question, errors: [] };
}

/**
 * arunashi の選択肢書式「ラベル:項目/項目/項目」を検証する
 * ラベルと項目群の区切りはコロン、項目どうしの区切りはスラッシュ(§3.5.6)
 */
function isValidArunashiFormat(text) {
  const colonIdx = text.indexOf(':');
  if (colonIdx === -1) return false;
  const label = text.substring(0, colonIdx).trim();
  if (label === '') return false;
  const items = text.substring(colonIdx + 1).split('/')
    .map(function (s) { return s.trim(); })
    .filter(function (s) { return s.length > 0; });
  return items.length > 0;
}

/**
 * 参照する列がすべて空文字なら true
 */
function isEmptyRow(row) {
  for (let n = 0; n < HEADER_NAMES.length; n++) {
    const c = HEADER_START_COLUMN + n;  // 1-indexed
    if (row.length >= c && String(row[c - 1]).trim() !== '') return false;
  }
  return true;
}

// ===== テンプレート補助 =====

/**
 * アクティブシートのB列〜に §3.5.6 ベースのヘッダを書き込み、
 * type列・difficulty列にプルダウン(データの入力規則)を設定する
 */
function writeTemplateHeader() {
  ui = SpreadsheetApp.getUi();
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
  const confirm = ui.alert(
    'このシートの1行目にヘッダを書き込み、type・difficulty列にプルダウンを設定します。よろしいですか?\n' +
    '(既に入力がある場合は上書きされます)',
    ui.ButtonSet.OK_CANCEL
  );
  if (confirm !== ui.Button.OK) return;

  // ヘッダ行(B列から)
  sheet.getRange(1, HEADER_START_COLUMN, 1, HEADER_NAMES.length).setValues([HEADER_NAMES]);
  sheet.setFrozenRows(1);

  // プルダウンを設定する行数(ヘッダの下、当面200行分)
  const numRows = 200;
  const firstDataRow = DATA_START_ROW;

  // type列のプルダウン
  const typeRule = SpreadsheetApp.newDataValidation()
    .requireValueInList(TYPE_OPTIONS, true)
    .setAllowInvalid(false)
    .build();
  sheet.getRange(firstDataRow, COL.type, numRows, 1).setDataValidation(typeRule);

  // difficulty列のプルダウン(簡単 / 普通 / 難しい)
  const difficultyRule = SpreadsheetApp.newDataValidation()
    .requireValueInList(DIFFICULTY_OPTIONS, true)
    .setAllowInvalid(false)
    .build();
  sheet.getRange(firstDataRow, COL.difficulty, numRows, 1).setDataValidation(difficultyRule);

  ui.alert('ヘッダとプルダウンを設定しました。');
}

// ===== ダイアログ表示 =====

/**
 * エラー一覧をダイアログで表示(運営メンバーが自分で直せる文言で)
 */
function showErrorsDialog(errors) {
  const items = errors.map(function (e) {
    return '<li style="margin: 4px 0;">' + escapeHtml(e) + '</li>';
  }).join('');
  const html = HtmlService.createHtmlOutput(
    '<div style="font-family: sans-serif; padding: 12px; line-height: 1.5;">' +
      '<p style="color: #c00; font-weight: bold; margin-top: 0;">' +
        errors.length + ' 件のエラーが見つかりました。修正してから再実行してください。' +
      '</p>' +
      '<ul style="padding-left: 20px;">' + items + '</ul>' +
    '</div>'
  ).setWidth(650).setHeight(450);
  ui.showModalDialog(html, 'JSON変換エラー');
}

/**
 * 生成した JSON をダイアログで表示(コピーボタン付き)
 */
function showJsonDialog(json, count) {
  const escaped = escapeHtml(json);
  const html = HtmlService.createHtmlOutput(
    '<div style="font-family: sans-serif; padding: 12px;">' +
      '<p style="margin-top: 0;">' + count + ' 件の問題を変換しました。<br>' +
        'コピーして管理者画面の投入欄に貼り付けてください。</p>' +
      '<button onclick="copyText()" style="padding: 6px 14px; margin-bottom: 6px;">' +
        'クリップボードにコピー' +
      '</button>' +
      '<span id="status" style="margin-left: 10px; color: #080;"></span>' +
      '<textarea id="json" readonly ' +
        'style="width: 100%; height: 400px; font-family: monospace; ' +
        'font-size: 12px; box-sizing: border-box;">' + escaped + '</textarea>' +
      '<script>' +
        'function copyText(){' +
          'var t = document.getElementById("json");' +
          't.focus(); t.select(); t.setSelectionRange(0, 999999);' +
          'try {' +
            'document.execCommand("copy");' +
            'document.getElementById("status").innerText = "コピーしました";' +
          '} catch(e) {' +
            'document.getElementById("status").innerText = "コピーできませんでした(手動で全選択してください)";' +
          '}' +
        '}' +
      '</script>' +
    '</div>'
  ).setWidth(750).setHeight(560);
  ui.showModalDialog(html, '投入用JSON');
}

function escapeHtml(s) {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}