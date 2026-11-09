// 공용 패키지(@wedly/*)의 안쪽 파일(`src`·`dist`·`node_modules`)을 직접 가져오는 것을 막는 규칙.
//
// 왜: 패키지가 폴더를 바꿀 때 그 패키지를 쓰는 앱이 운영에서만 깨진다 — 입구는 각 패키지 package.json 의 `exports` 가 정한다.
// `@wedly/ui-shared/ui` · `@wedly/policy-match-shared/serve/verdict` 같은 열린 하위 주소는 낱말이 src·dist·node_modules 로 시작하지 않아 걸리지 않는다
// (`@wedly/x/srcish/thing` 처럼 낱말이 그저 src 로 시작할 뿐인 주소도 안 걸린다).
// 자기 규칙 이름(wedly/no-shared-deep-import)을 갖는 이유: no-restricted-imports 같은 기존 규칙에 섞으면 그 규칙의 동결과 같은 칸에서 개수가 합쳐진다.
// 옛 위반을 동결할 때는 각 앱의 eslint-suppressions.json 에 이 규칙 이름으로 따로 센다.
// 공용 묶음(preset)이 시험 파일을 포함한 모든 코드 파일에 건다.
//
// 보는 곳: 가져오기 · 다시 내보내기(`export … from`·`export * from`) · `import("…")` · `require("…")` · `import x = require("…")`.
// 따옴표 글자와 `${}` 없는 백틱 글자만 읽는다 — 변수·조립한 주소는 어느 파일인지 알 수 없다.

"use strict";

const DEEP_IMPORT = /^@wedly\/[^/]+\/(?:src|dist|node_modules)(?:\/|$)/u;

/** 따옴표 글자이거나 `${}` 없는 백틱 글자면 그 값, 아니면 null. */
function staticString(node) {
  if (!node) return null;
  if (node.type === "Literal") return typeof node.value === "string" ? node.value : null;
  if (node.type === "TemplateLiteral" && node.expressions.length === 0) return node.quasis[0].value.cooked ?? null;
  return null;
}

/** @type {import("eslint").Rule.RuleModule} */
const rule = {
  meta: {
    type: "problem",
    docs: { description: "공용 패키지(@wedly/*)의 src·dist·node_modules 안쪽 파일을 직접 가져오는 것을 막는다" },
    schema: [],
    messages: {
      deepImport:
        "공용 패키지(@wedly/*)는 package.json 의 `exports` 에 적힌 입구로만 가져오세요(예: `@wedly/ui-shared`, `@wedly/ui-shared/ui`). `src`·`dist`·`node_modules` 안쪽 파일을 직접 가져오면 패키지가 내부 구조를 바꿀 때 그 패키지를 쓰는 앱이 깨져요.",
    },
  },
  create(context) {
    const check = (specifierNode) => {
      const specifier = staticString(specifierNode);
      if (specifier !== null && DEEP_IMPORT.test(specifier)) context.report({ node: specifierNode, messageId: "deepImport" });
    };
    return {
      ImportDeclaration: (node) => check(node.source),
      // `export { a }` 처럼 source 가 없는 내보내기는 staticString 이 null 로 거른다
      ExportNamedDeclaration: (node) => check(node.source),
      ExportAllDeclaration: (node) => check(node.source),
      ImportExpression: (node) => check(node.source),
      CallExpression(node) {
        if (node.callee.type === "Identifier" && node.callee.name === "require") check(node.arguments[0]);
      },
      // `import x = require("…")` — TS 에서만 나오는 모양
      TSExternalModuleReference: (node) => check(node.expression),
    };
  },
};

module.exports = rule;
