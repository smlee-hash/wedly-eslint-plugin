// WEDLY 모든 앱이 함께 쓰는 ESLint 플러그인 — 규칙 넷과, 앱 설정에 펼쳐 쓰는 묶음(preset)을 한 객체로 낸다.
//
// ★ flat 묶음은 플러그인을 반드시 `wedly` 라는 키로 등록한다. 앱의 동결 목록(eslint-suppressions.json)이 파일마다
//   규칙 이름(wedly/…)별 개수를 세기 때문에, 키가 바뀌면 동결해 둔 위반이 한꺼번에 새 위반이 된다.
// ESLint 8 의 .eslintrc 앱은 플러그인을 `@wedly` 로 등록하므로 규칙 이름이 @wedly/… 로 나온다(configs["legacy-recommended"]).

"use strict";

const noDoubleCast = require("./rules/no-double-cast.cjs");
const noSharedDeepImport = require("./rules/no-shared-deep-import.cjs");
const noWeakAssertion = require("./rules/no-weak-assertion.cjs");
const requireDisableReason = require("./rules/require-disable-reason.cjs");

const DEFAULT_CODE = ["**/*.{ts,tsx,js,jsx,mjs,cjs}"];
const DEFAULT_TYPESCRIPT = ["**/*.{ts,tsx}"];
const DEFAULT_TESTS = ["**/*.test.{ts,tsx}", "**/__tests__/**/*.{ts,tsx}"];
// 시험이 아닌 파일만 볼 때 빼는 글 — 시험 파일의 확장자는 .ts·.tsx 보다 넓게 잡는다
const BASE_NON_TEST = ["**/*.test.{ts,tsx,js,jsx,mjs}", "**/__tests__/**"];

// .eslintrc 쪽 파일 범위(basename 으로 읽는다). 파서는 넣지 않는다 — 앱이 자기 파서를 둔다.
const LEGACY_CODE = ["*.ts", "*.tsx", "*.js", "*.jsx", "*.mjs", "*.cjs"];
const LEGACY_TESTS = ["*.test.ts", "*.test.tsx", "**/__tests__/**/*.ts", "**/__tests__/**/*.tsx"];
const LEGACY_NON_TEST = ["*.test.ts", "*.test.tsx", "*.test.js", "*.test.jsx", "*.test.mjs", "**/__tests__/**"];

/**
 * flat config(ESLint 9) 블록 배열을 새로 만든다. 앱 설정의 TypeScript 파서 블록 뒤에 펼쳐 쓴다.
 * @param {{ code?: string[], typescript?: string[], tests?: string[], console?: boolean }} [options]
 *   code: 모든 코드 파일, typescript: 이중 단언을 볼 파일, tests: 시험 파일, console: false 면 no-console 블록을 뺀다.
 */
function preset(options = {}) {
  const { code = DEFAULT_CODE, typescript = DEFAULT_TYPESCRIPT, tests = DEFAULT_TESTS } = options;
  const nonTest = [...new Set([...BASE_NON_TEST, ...tests])];

  const blocks = [
    {
      // 모든 코드 파일(시험 포함): 검사를 끄는 주석에 이유 + 공용 패키지(@wedly/*) 안쪽 파일 가져오기 금지.
      name: "wedly/code",
      files: [...code],
      plugins: { wedly: plugin },
      rules: {
        "wedly/require-disable-reason": "error",
        "wedly/no-shared-deep-import": "error",
      },
    },
    {
      // 시험 파일만: 약한 확인(toBeDefined·toBeTruthy 등) 금지.
      name: "wedly/tests",
      files: [...tests],
      plugins: { wedly: plugin },
      rules: { "wedly/no-weak-assertion": "error" },
    },
    {
      // 시험이 아닌 TypeScript 파일만: 이중 단언(as unknown as T) 금지. 시험 파일은 일부러 깨진 값을 넣기도 해서 뺀다.
      name: "wedly/typescript",
      files: [...typescript],
      ignores: [...nonTest],
      plugins: { wedly: plugin },
      rules: { "wedly/no-double-cast": "error" },
    },
  ];

  if (options.console !== false) {
    blocks.push({
      // 시험이 아닌 코드 파일만: console.log·info·debug 금지(warn·error 는 남긴다). 메시지는 ESLint 기본 문구다.
      name: "wedly/console",
      files: [...code],
      ignores: [...nonTest],
      rules: { "no-console": ["error", { allow: ["warn", "error"] }] },
    });
  }

  return blocks;
}

const plugin = {
  meta: { name: "@wedly/eslint-plugin", version: require("./package.json").version },
  rules: {
    "require-disable-reason": requireDisableReason,
    "no-weak-assertion": noWeakAssertion,
    "no-double-cast": noDoubleCast,
    "no-shared-deep-import": noSharedDeepImport,
  },
  preset,
  configs: {},
};

// 묶음은 플러그인 객체가 만들어진 뒤에 한 번 만든다 — 블록이 이 객체를 `wedly` 로 품는다
plugin.configs.recommended = preset();

// ESLint 8 (.eslintrc) 앱용: `plugins: ["@wedly"]` 와 함께 `extends: ["plugin:@wedly/legacy-recommended"]` 로 쓴다
plugin.configs["legacy-recommended"] = {
  plugins: ["@wedly"],
  overrides: [
    {
      files: [...LEGACY_CODE],
      rules: {
        "@wedly/require-disable-reason": "error",
        "@wedly/no-shared-deep-import": "error",
      },
    },
    {
      files: [...LEGACY_TESTS],
      rules: { "@wedly/no-weak-assertion": "error" },
    },
    {
      files: ["*.ts", "*.tsx"],
      excludedFiles: [...LEGACY_NON_TEST],
      rules: { "@wedly/no-double-cast": "error" },
    },
    {
      files: [...LEGACY_CODE],
      excludedFiles: [...LEGACY_NON_TEST],
      rules: { "no-console": ["error", { allow: ["warn", "error"] }] },
    },
  ],
};

module.exports = plugin;
