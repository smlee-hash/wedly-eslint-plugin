// 앱별 확인(probe): 앱의 진짜 ESLint 설정으로 규칙마다 일부러 틀린 글을 린트해 그 규칙이 오류로 걸리는지 본다.
// 앱은 자기 시험 파일에서 probe 를 불러 모든 항목이 걸렸는지 확인한다 — 공용 규칙이 그 앱 빌드에 정말 연결됐다는 근거.
// 파일은 쓰지 않는다(lintText). 경고(1)는 빌드를 막지 못하므로 오류(2)만 걸린 것으로 센다.
// caught 는 이 꾸러미의 규칙 자신이 오류로 걸렸다는 뜻이다 — 같은 키(wedly)로 앱이 베껴 둔 사본 규칙은 copy 로 따로 알린다.

"use strict";

const path = require("node:path");
// 앱의 ESLint 가 꾸러미를 불러올 때 쓴 것과 같은 CommonJS 모듈 — 규칙의 meta 객체가 같은지로 이 꾸러미 규칙인지 가린다
const { rules } = require("./index.cjs");

const PROBE_RULES = ["require-disable-reason", "require-disable-expiry", "no-shared-deep-import", "no-double-cast", "no-weak-assertion", "no-console"];

// 규칙마다 일부러 틀린 글. on 은 어느 파일 이름으로 린트할지(code: 시험이 아닌 .ts, test: 시험 .ts)
const CASES = {
  "require-disable-reason": { on: "code", text: "// eslint-disable-next-line no-debugger\ndebugger;\n" },
  // 이유는 있고 만료·승인 괄호가 없다 — 이유 규칙은 지나가고 이 규칙만 걸린다
  "require-disable-expiry": { on: "code", text: "// eslint-disable-next-line no-debugger -- 시작 알림이라 남긴다\ndebugger;\n" },
  "no-shared-deep-import": { on: "code", text: 'import { Thing } from "@wedly/ui-shared/src/thing";\nexport const t = Thing;\n' },
  "no-double-cast": { on: "code", text: "export const n = (globalThis as unknown as { n: number }).n;\n" },
  "no-weak-assertion": { on: "test", text: 'import { expect, it } from "vitest";\nit("x", () => {\n  expect(globalThis).toBeDefined();\n});\n' },
  "no-console": { on: "code", text: "console.log(1);\n" },
};

/** 이 규칙이 걸렸다고 볼 규칙 이름 — flat 앱은 wedly/…, ESLint 8 앱은 @wedly/…, no-console 은 ESLint 기본 규칙이다. */
function caughtIds(rule) {
  return rule === "no-console" ? ["no-console"] : [`wedly/${rule}`, `@wedly/${rule}`];
}

/**
 * @param {{ lintText: Function, isPathIgnored: Function, getRulesMetaForResults: Function }} eslint 앱이 자기 설정으로 만든 ESLint 객체(9 flat 또는 8)
 * @param {{ cwd: string, code: string, test: string, console?: boolean }} options
 *   cwd: 앱 루트, code·test: 앱 루트 기준 파일 경로(시험이 아닌 .ts 와 시험 .ts), console: false 면 no-console 을 보지 않는다
 * @returns {Promise<{ rule: string, file: string, caught: boolean, ignored: boolean, copy: boolean, found: string[], error: string | null }[]>}
 *   caught: 이 꾸러미의 규칙이 오류로 걸렸는가, copy: 같은 이름의 앱 사본 규칙이 오류로 걸렸는가(이때 caught 는 거짓)
 */
async function probe(eslint, { cwd, code, test, console: withConsole = true }) {
  const files = { code, test };
  const results = [];
  for (const rule of PROBE_RULES) {
    if (rule === "no-console" && withConsole === false) continue;
    const { on, text } = CASES[rule];
    const file = files[on];
    const filePath = path.join(cwd, file);

    const ignored = await eslint.isPathIgnored(filePath);
    if (ignored) {
      results.push({ rule, file, caught: false, ignored: true, copy: false, found: [], error: null });
      continue;
    }

    const lintResults = await eslint.lintText(text, { filePath });
    const [result] = lintResults;
    const messages = result ? result.messages : [];
    const fatal = messages.find((message) => message.fatal);
    if (fatal) {
      results.push({ rule, file, caught: false, ignored: false, copy: false, found: [], error: fatal.message });
      continue;
    }

    const found = [...new Set(messages.filter((message) => message.severity === 2 && typeof message.ruleId === "string").map((message) => message.ruleId))];
    const matching = caughtIds(rule).filter((id) => found.includes(id));
    let caught = false;
    let copy = false;
    if (rule === "no-console") {
      caught = matching.length > 0;
    } else if (matching.length > 0) {
      // 이름이 같아도 앱이 베낀 규칙일 수 있다 — 규칙의 meta 객체가 이 꾸러미 것과 같은 객체일 때만 이 꾸러미 규칙으로 센다
      const metas = eslint.getRulesMetaForResults(lintResults);
      caught = matching.some((id) => metas[id] === rules[rule].meta);
      copy = !caught;
    }
    results.push({ rule, file, caught, ignored: false, copy, found, error: null });
  }
  return results;
}

module.exports = { probe, PROBE_RULES };
