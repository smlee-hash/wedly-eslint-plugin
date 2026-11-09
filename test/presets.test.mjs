// 공용 묶음이 앱 설정에 펼쳐졌을 때 규칙이 맞는 파일에만 걸리는지 본다(규칙 본문은 rules.test.mjs 가 본다).
// 규칙 이름으로만 센다 — 앱의 동결 목록(eslint-suppressions.json)이 파일마다 규칙 이름별 개수를 세기 때문에,
// 플러그인 키가 `wedly` 가 아니면 ERP 동결 1,614개 파일이 한꺼번에 새 위반이 된다.
import { createRequire } from "node:module";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { ESLint } from "eslint";
import { ESLint as ESLint8 } from "eslint8";
import tsParser from "@typescript-eslint/parser";
import plugin from "../index.mjs";

const require = createRequire(import.meta.url);
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const TS = { languageOptions: { parser: tsParser } };

const PROBES = {
  doubleCast: "export const n = (globalThis as unknown as { n: number }).n;\n",
  weak: 'import { expect, it } from "vitest";\nit("x", () => {\n  expect(globalThis).toBeDefined();\n});\n',
  noReason: "// eslint-disable-next-line no-debugger\ndebugger;\n",
  deep: 'import { Thing } from "@wedly/ui-shared/src/thing";\nexport const t = Thing;\n',
  log: "console.log(1);\n",
  warn: "console.warn(1);\n",
};

async function ruleIds(eslint, code, file) {
  const [result] = await eslint.lintText(code, { filePath: path.join(ROOT, file) });
  const fatal = result.messages.find((m) => m.fatal);
  if (fatal) throw new Error(`시험 글이 문법 오류예요(${fatal.message}) ${file}`);
  return result.messages.filter((m) => m.severity === 2).map((m) => m.ruleId);
}

function flat(config) {
  return new ESLint({ cwd: ROOT, overrideConfigFile: true, overrideConfig: [TS, ...config] });
}

describe("가져오는 길", () => {
  it("require 와 import 가 같은 플러그인 객체를 준다", async () => {
    const viaImport = (await import("@wedly/eslint-plugin")).default;
    assert.equal(require("@wedly/eslint-plugin"), viaImport);
    assert.equal(viaImport, plugin);
  });

  it("규칙 다섯 가지 중 wedly 규칙 넷을 갖고 이름·판이 있다", () => {
    assert.deepEqual(Object.keys(plugin.rules).sort(),
      ["no-double-cast", "no-shared-deep-import", "no-weak-assertion", "require-disable-reason"]);
    assert.equal(plugin.meta.name, "@wedly/eslint-plugin");
    assert.equal(plugin.meta.version, require("../package.json").version);
  });
});

describe("flat 묶음(ESLint 9 앱)", () => {
  const eslint = flat(plugin.configs.recommended);

  it("시험이 아닌 코드: 이중 단언·이유 없는 끄기 주석·공용 꾸러미 안쪽 가져오기·console.log 가 자기 규칙 이름으로 걸린다", async () => {
    assert.deepEqual(await ruleIds(eslint, PROBES.doubleCast, "src/lib/probe.ts"), ["wedly/no-double-cast"]);
    assert.deepEqual(await ruleIds(eslint, PROBES.noReason, "src/lib/probe.ts"), ["wedly/require-disable-reason"]);
    assert.deepEqual(await ruleIds(eslint, PROBES.deep, "src/lib/probe.ts"), ["wedly/no-shared-deep-import"]);
    assert.deepEqual(await ruleIds(eslint, PROBES.log, "src/lib/probe.ts"), ["no-console"]);
    assert.deepEqual(await ruleIds(eslint, PROBES.warn, "src/lib/probe.ts"), []);
  });

  it("src 밖 폴더(app·lib·components)의 코드에도 기본으로 걸린다", async () => {
    assert.deepEqual(await ruleIds(eslint, PROBES.doubleCast, "app/page.tsx"), ["wedly/no-double-cast"]);
    assert.deepEqual(await ruleIds(eslint, PROBES.noReason, "lib/probe.js"), ["wedly/require-disable-reason"]);
  });

  it("시험 파일: 약한 확인과 끄기 주석 이유만 보고, 이중 단언·console.log 는 두다", async () => {
    for (const file of ["src/lib/probe.test.ts", "src/lib/__tests__/probe.tsx", "tests/probe.test.tsx"]) {
      assert.deepEqual(await ruleIds(eslint, PROBES.weak, file), ["wedly/no-weak-assertion"], file);
      assert.deepEqual(await ruleIds(eslint, PROBES.doubleCast, file), [], file);
      assert.deepEqual(await ruleIds(eslint, PROBES.log, file), [], file);
      assert.deepEqual(await ruleIds(eslint, PROBES.noReason, file), ["wedly/require-disable-reason"], file);
    }
  });

  it("시험이 아닌 파일의 약한 확인은 건드리지 않는다", async () => {
    assert.deepEqual(await ruleIds(eslint, PROBES.weak, "src/lib/probe.ts"), []);
  });

  it("preset(options) 로 앱마다 범위를 좁히고 console 규칙을 뺄 수 있다", async () => {
    const narrow = flat(plugin.preset({ code: ["src/**/*.{ts,tsx}"], typescript: ["src/**/*.{ts,tsx}"], console: false }));
    assert.deepEqual(await ruleIds(narrow, PROBES.doubleCast, "src/a.ts"), ["wedly/no-double-cast"]);
    assert.deepEqual(await ruleIds(narrow, PROBES.doubleCast, "scripts/a.ts"), []);
    assert.deepEqual(await ruleIds(narrow, PROBES.noReason, "scripts/a.ts"), []);
    assert.deepEqual(await ruleIds(narrow, PROBES.log, "src/a.ts"), []);
    assert.deepEqual(plugin.preset(), plugin.configs.recommended);
  });

  it("앱 설정의 다른 블록이 같은 플러그인 객체를 wedly 로 다시 등록해도 충돌하지 않는다", async () => {
    const again = flat([...plugin.configs.recommended, { files: ["src/**/*.ts"], plugins: { wedly: plugin }, rules: { "wedly/no-double-cast": "error" } }]);
    assert.deepEqual(await ruleIds(again, PROBES.doubleCast, "src/lib/probe.ts"), ["wedly/no-double-cast"]);
  });
});

describe("legacy 묶음(ESLint 8 .eslintrc 앱)", () => {
  const eslint = new ESLint8({
    cwd: ROOT,
    useEslintrc: false,
    plugins: { "@wedly": plugin },
    baseConfig: { ...plugin.configs["legacy-recommended"], parser: "@typescript-eslint/parser" },
  });

  it("규칙 이름은 @wedly/… 이고 같은 파일 범위로 걸린다", async () => {
    assert.deepEqual(await ruleIds(eslint, PROBES.doubleCast, "app/probe.ts"), ["@wedly/no-double-cast"]);
    assert.deepEqual(await ruleIds(eslint, PROBES.noReason, "lib/probe.ts"), ["@wedly/require-disable-reason"]);
    assert.deepEqual(await ruleIds(eslint, PROBES.deep, "components/probe.tsx"), ["@wedly/no-shared-deep-import"]);
    assert.deepEqual(await ruleIds(eslint, PROBES.log, "lib/probe.ts"), ["no-console"]);
    assert.deepEqual(await ruleIds(eslint, PROBES.weak, "lib/probe.test.ts"), ["@wedly/no-weak-assertion"]);
    assert.deepEqual(await ruleIds(eslint, PROBES.doubleCast, "lib/probe.test.ts"), []);
    assert.deepEqual(await ruleIds(eslint, PROBES.log, "lib/__tests__/probe.ts"), []);
  });
});
