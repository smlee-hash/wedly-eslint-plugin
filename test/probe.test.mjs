// 앱별 확인(probe): 앱의 진짜 ESLint 설정으로 규칙마다 일부러 틀린 글을 린트해 그 규칙이 오류로 걸리는지 본다.
// 앱은 자기 시험 파일에서 probe 를 불러 모든 항목이 걸렸는지 확인한다 — 공용 규칙이 그 앱 빌드에 정말 연결됐다는 근거.
// 파일은 쓰지 않는다(lintText). 경고(1)는 빌드를 막지 못하므로 오류(2)만 걸린 것으로 센다.
import { createRequire } from "node:module";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { ESLint } from "eslint";
import { ESLint as ESLint8 } from "eslint8";
import tsParser from "@typescript-eslint/parser";
import plugin from "../index.mjs";
import { probe, PROBE_RULES } from "../probe.mjs";

const require = createRequire(import.meta.url);
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const TS = { languageOptions: { parser: tsParser } };
const FILES = { cwd: ROOT, code: "src/lib/wedly-probe.ts", test: "src/lib/wedly-probe.test.ts" };
const ALL = ["require-disable-reason", "no-shared-deep-import", "no-double-cast", "no-weak-assertion", "no-console"];

function flat(config) {
  return new ESLint({ cwd: ROOT, overrideConfigFile: true, overrideConfig: [TS, ...config] });
}

const byRule = (results) => Object.fromEntries(results.map((r) => [r.rule, r]));

describe("probe", () => {
  it("가져오는 길: require 와 import 가 같은 함수를 주고, 규칙 다섯 개를 정해진 차례로 갖는다", () => {
    const viaRequire = require("@wedly/eslint-plugin/probe");
    assert.equal(viaRequire.probe, probe);
    assert.deepEqual(PROBE_RULES, ALL);
  });

  it("공용 묶음을 그대로 펼친 설정이면 다섯 규칙이 모두 걸린다", async () => {
    const results = await probe(flat(plugin.configs.recommended), FILES);
    assert.deepEqual(results.map((r) => r.rule), ALL);
    for (const r of results) {
      assert.equal(r.caught, true, `${r.rule} 이 안 걸림: ${JSON.stringify(r)}`);
      assert.equal(r.ignored, false, r.rule);
      assert.equal(r.copy, false, r.rule);
    }
    const rows = byRule(results);
    assert.equal(rows["no-double-cast"].file, "src/lib/wedly-probe.ts");
    assert.equal(rows["no-weak-assertion"].file, "src/lib/wedly-probe.test.ts");
    assert.deepEqual(rows["no-double-cast"].found, ["wedly/no-double-cast"]);
  });

  it("앱이 규칙 하나를 끄거나 경고로 낮추면 그 규칙만 안 걸린 것으로 나온다", async () => {
    const off = byRule(await probe(flat([...plugin.configs.recommended, { files: ["**/*.ts"], rules: { "wedly/no-double-cast": "off" } }]), FILES));
    assert.equal(off["no-double-cast"].caught, false);
    assert.equal(off["require-disable-reason"].caught, true);
    const warn = byRule(await probe(flat([...plugin.configs.recommended, { files: ["**/*.ts"], rules: { "wedly/no-shared-deep-import": "warn" } }]), FILES));
    assert.equal(warn["no-shared-deep-import"].caught, false);
    assert.equal(warn["no-double-cast"].caught, true);
  });

  it("설정이 확인 파일을 무시하면 걸리지 않은 것으로, ignored 를 참으로 남긴다", async () => {
    const results = byRule(await probe(flat([...plugin.configs.recommended, { ignores: ["src/lib/wedly-probe.test.ts"] }]), FILES));
    assert.equal(results["no-weak-assertion"].caught, false);
    assert.equal(results["no-weak-assertion"].ignored, true);
    assert.equal(results["no-double-cast"].ignored, false);
  });

  it("console: false 면 no-console 을 보지 않는다", async () => {
    const results = await probe(flat(plugin.preset({ console: false })), { ...FILES, console: false });
    assert.deepEqual(results.map((r) => r.rule), ALL.slice(0, 4));
    assert.ok(results.every((r) => r.caught));
  });

  it("ESLint 8(.eslintrc) 앱의 @wedly/… 규칙 이름도 걸린 것으로 센다", async () => {
    const eslint = new ESLint8({
      cwd: ROOT,
      useEslintrc: false,
      plugins: { "@wedly": plugin },
      baseConfig: { ...plugin.configs["legacy-recommended"], parser: "@typescript-eslint/parser" },
    });
    const results = await probe(eslint, FILES);
    assert.deepEqual(results.map((r) => [r.rule, r.caught, r.copy]), ALL.map((rule) => [rule, true, false]));
    assert.deepEqual(byRule(results)["no-double-cast"].found, ["@wedly/no-double-cast"]);
  });

  it("앱이 같은 wedly 키로 자기 사본 규칙을 등록하면 걸린 것으로 세지 않고 copy 를 참으로 남긴다", async () => {
    // 규칙 본문은 같고 meta 만 새 객체 — 앱 폴더에 규칙 파일을 베껴 둔 경우와 같다
    const copy = {
      meta: { name: "wedly" },
      rules: Object.fromEntries(Object.entries(plugin.rules).map(([name, rule]) => [name, { meta: { ...rule.meta }, create: rule.create }])),
    };
    const local = [
      { files: ["**/*.ts"], plugins: { wedly: copy }, rules: { "wedly/require-disable-reason": "error", "wedly/no-shared-deep-import": "error", "wedly/no-double-cast": "error", "wedly/no-weak-assertion": "error" } },
      { files: ["**/*.ts"], ignores: ["**/*.test.ts"], rules: { "no-console": ["error", { allow: ["warn", "error"] }] } },
    ];
    const results = byRule(await probe(flat(local), FILES));
    for (const rule of ALL.slice(0, 4)) {
      assert.equal(results[rule].caught, false, `${rule} 사본이 공용 규칙으로 셈: ${JSON.stringify(results[rule])}`);
      assert.equal(results[rule].copy, true, rule);
      assert.deepEqual(results[rule].found.includes(`wedly/${rule}`), true, rule);
    }
    // no-console 은 ESLint 기본 규칙이라 사본이 있을 수 없다
    assert.equal(results["no-console"].caught, true);
    assert.equal(results["no-console"].copy, false);
  });

  it("다른 키로 등록한 같은 이름 규칙은 공용 규칙으로 세지 않는다", async () => {
    const other = { rules: plugin.rules };
    const results = byRule(await probe(flat([{ files: ["**/*.ts"], plugins: { local: other }, rules: { "local/no-double-cast": "error" } }]), FILES));
    assert.equal(results["no-double-cast"].caught, false);
    assert.equal(results["no-double-cast"].copy, false);
    assert.deepEqual(results["no-double-cast"].found, ["local/no-double-cast"]);
  });
});
