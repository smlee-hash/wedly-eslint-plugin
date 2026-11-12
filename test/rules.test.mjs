// 규칙 다섯 개를 ESLint RuleTester 로 하나씩 확인한다 — 어떤 모양을 지적하고 어떤 모양은 두는지만 본다.
// 어느 파일에 걸리는지(묶음의 파일 범위)는 presets.test.mjs 가 본다.
// 앞 세 규칙의 시험 글은 ERP src/lib/nav/lint-wedly-rules.test.ts(af94994)를 그대로 옮겼고,
// 끄기 주석 이유 규칙은 ERP lint-pstack-rules.test.ts 「규칙 1」 의 글을 옮겼다.
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { ESLint, RuleTester } from "eslint";
import tsParser from "@typescript-eslint/parser";
import plugin from "../index.mjs";

const {
  "no-double-cast": noDoubleCast,
  "no-shared-deep-import": noSharedDeepImport,
  "no-weak-assertion": noWeakAssertion,
  "require-disable-reason": requireDisableReason,
  "require-disable-expiry": requireDisableExpiry,
} = plugin.rules;

// RuleTester 가 node:test 의 describe·it 로 시험을 만들게 이어 준다
RuleTester.describe = describe;
RuleTester.it = it;
RuleTester.itOnly = it.only;

const tester = new RuleTester({ languageOptions: { parser: tsParser } });

// 꺾쇠 단언(`<T>x`)과 `import x = require()` 는 .ts 에서만 읽힌다 — 모든 글을 .ts 파일로 읽게 한다
const FILE = "rule.ts";
const 통과 = (code, filename = FILE) => ({ code, filename });
const 지적 = (code, ...errors) => ({ code, filename: FILE, errors });

tester.run("no-weak-assertion", noWeakAssertion, {
  valid: [
    // 실제 값을 확인한다
    통과("expect(1).toBe(1);"),
    통과("expect({ a: 1 }).toEqual({ a: 1 });"),
    통과("expect([1]).toHaveLength(1);"),
    통과("expect(1).not.toBe(null);"),
    // 값이 정확히 null·undefined 여야 한다는 확인은 약하지 않다(`.not` 없이)
    통과("expect(null).toBeNull();"),
    통과("expect(undefined).toBeUndefined();"),
    // `.not.toBeDefined()` 는 `toBeUndefined()` 와 똑같이 값이 정확히 undefined 여야 한다는 확인이다
    통과("expect(undefined).not.toBeDefined();"),
    통과("expect(Promise.resolve(undefined)).resolves.not.toBeDefined();"),
    통과('expect(1).not["toBeDefined"]();'),
    // 터져야 한다는 확인, 오류 종류·메시지를 정한 확인
    통과("expect(() => 1).toThrow();"),
    통과('expect(() => 1).toThrow("메시지");'),
    통과("expect(() => 1).not.toThrow(TypeError);"),
    통과('expect(() => 1).not.toThrow("메시지");'),
    통과('expect(Promise.reject(new Error("x"))).rejects.toThrow("x");'),
    통과("expect(Promise.resolve(1)).resolves.toBe(1);"),
    // expect 짝이 아닌 같은 이름의 일반 함수, 변수로 고른 이름은 읽지 않는다
    통과("toBeDefined();"),
    통과("expect(1)[matcher]();"),
    통과("expect(1).not[matcher]();"),
    // 부르지 않은 참조는 확인이 아니다
    통과("const f = expect(1).toBeDefined;"),
  ],
  invalid: [
    지적("expect(1).toBeDefined();", { messageId: "weakValue", type: "CallExpression" }),
    지적("expect(1).toBeTruthy();", { messageId: "weakValue", type: "CallExpression" }),
    지적("expect(a).toBeTruthy();", { messageId: "weakValue", type: "CallExpression" }),
    지적("expect(0).toBeFalsy();", { messageId: "weakValue", type: "CallExpression" }),
    // .rejects·.resolves 를 거쳐도 인자가 없으면 같다
    지적("expect(Promise.resolve(1)).resolves.toBeDefined();", { messageId: "weakValue", type: "CallExpression" }),
    // .not 이 붙어도 toBeTruthy·toBeFalsy 는 약한 값 확인이다(toBeDefined 만 .not 이 붙으면 정확한 확인)
    지적("expect(1).not.toBeTruthy();", { messageId: "weakValue", type: "CallExpression" }),
    지적("expect(1).not.toBeFalsy();", { messageId: "weakValue", type: "CallExpression" }),
    지적("expect(1).not.toBeUndefined();", { messageId: "weakNot", type: "CallExpression" }),
    지적("expect(1).not.toBeNull();", { messageId: "weakNot", type: "CallExpression" }),
    지적("expect(Promise.resolve(1)).resolves.not.toBeNull();", { messageId: "weakNot", type: "CallExpression" }),
    지적("expect(() => 1).not.toThrow();", { messageId: "weakThrow", type: "CallExpression" }),
    지적("expect(Promise.resolve(1)).resolves.not.toThrow();", { messageId: "weakThrow", type: "CallExpression" }),
    // 따옴표 글자 속성·옵셔널 체인도 같은 호출이다
    지적('expect(1)["toBeDefined"]();', { messageId: "weakValue", type: "CallExpression" }),
    지적('expect(1).not["toBeNull"]();', { messageId: "weakNot", type: "CallExpression" }),
    지적("expect(1)?.toBeTruthy();", { messageId: "weakValue", type: "CallExpression" }),
    // 한 글에 둘이면 둘 다 센다
    지적(
      "expect(1).toBeDefined();\nexpect(2).not.toBeNull();",
      { messageId: "weakValue", type: "CallExpression" },
      { messageId: "weakNot", type: "CallExpression" },
    ),
  ],
});

tester.run("no-double-cast", noDoubleCast, {
  valid: [
    통과("const a = x as number;"),
    통과("const a = <number>x;"),
    통과("const a = { x: 1 } as const;"),
    통과("const a = [x as number] as number[];"),
    통과("const a = (x as number) + (y as number);"),
    // 호출을 사이에 두면 겹친 단언이 아니다
    통과("const a = f(x as unknown) as number;"),
    통과("const a = f(x as unknown)! as number;"),
    // `x!` 는 단언이 아니라 널 아님 표시다 — 안쪽에 단언이 없으면 단언은 하나뿐이다
    통과("const a = x! as number;"),
    통과("const a = x!! as number;"),
    통과("const a = (x as unknown)!;"),
    통과("const a = (x as unknown)!.length;"),
  ],
  invalid: [
    지적("const a = x as unknown as T;", { messageId: "doubleCast", type: "TSAsExpression" }),
    지적("const a = (x as unknown) as T;", { messageId: "doubleCast", type: "TSAsExpression" }),
    지적("const a = (x as any) as T;", { messageId: "doubleCast", type: "TSAsExpression" }),
    지적("const a = <T><unknown>x;", { messageId: "doubleCast", type: "TSTypeAssertion" }),
    // 두 표기를 섞어도 같다
    지적("const a = <T>(x as unknown);", { messageId: "doubleCast", type: "TSTypeAssertion" }),
    지적("const a = (<unknown>x) as T;", { messageId: "doubleCast", type: "TSAsExpression" }),
    // `as const` 도 단언이라 안쪽에 있으면 센다
    지적("const a = (x as const) as T;", { messageId: "doubleCast", type: "TSAsExpression" }),
    // 사이에 널 아님 표시(`!`)를 끼워도 겹친 단언이다 — 몇 겹이든, 두 표기를 섞어도 같다
    지적("const a = (x as any)! as T;", { messageId: "doubleCast", type: "TSAsExpression" }),
    지적("const a = (x as unknown)!! as T;", { messageId: "doubleCast", type: "TSAsExpression" }),
    지적("const a = (<unknown>x)! as T;", { messageId: "doubleCast", type: "TSAsExpression" }),
    지적("const a = <T>(x as unknown)!;", { messageId: "doubleCast", type: "TSTypeAssertion" }),
    // 안쪽 단언의 피연산자에만 `!` 가 있으면 안쪽은 단언이 아니라서 바깥 하나만 센다
    지적("const a = (x! as unknown) as T;", { messageId: "doubleCast", type: "TSAsExpression" }),
    // 다른 식 안에 있어도 잡는다
    지적("const a = f(x as unknown as T);", { messageId: "doubleCast", type: "TSAsExpression" }),
    지적("const a = { b: x as unknown as T };", { messageId: "doubleCast", type: "TSAsExpression" }),
    // 세 겹이면 안쪽이 단언인 바깥 노드마다 하나씩 센다(맨 바깥 노드부터 보고)
    지적(
      "const a = x as b as c as d;",
      { messageId: "doubleCast", type: "TSAsExpression" },
      { messageId: "doubleCast", type: "TSAsExpression" },
    ),
  ],
});

tester.run("no-shared-deep-import", noSharedDeepImport, {
  valid: [
    // package.json exports 로 열린 입구
    통과('import a from "@wedly/ui-shared";'),
    통과('import { a } from "@wedly/ui-shared/ui";'),
    통과('import a from "@wedly/ui-shared/basic-recovery";'),
    통과('import a from "@wedly/policy-match-shared/serve/verdict";'),
    통과('import a from "@wedly/policy-match-shared/collect/attachment-text";'),
    통과('export { a } from "@wedly/ui-shared/ui";'),
    통과('export * from "@wedly/ui-shared/ui";'),
    통과('export const load = () => import("@wedly/ui-shared/ui");'),
    통과('const c = require("@wedly/ui-shared/ui");'),
    통과('import c = require("@wedly/ui-shared/ui");'),
    // 낱말이 그저 src·dist 로 시작할 뿐인 주소, 다른 범위·상대 주소
    통과('import a from "@wedly/srcish/thing";'),
    통과('import a from "@wedly/ui-shared/distant";'),
    통과('import a from "@other/x/src/a";'),
    통과('import a from "./src/a";'),
    통과('import a from "@/lib/x/src/a";'),
    // 가져오기가 아닌 글자, 변수·조립한 주소, 내보내기만 하는 글
    통과('const s = "@wedly/x/src/a";'),
    통과('const c = other("@wedly/x/src/a");'),
    통과("export const load = (name: string) => import(name);"),
    통과("export const load = (n: string) => import(`@wedly/x/${n}`);"),
    통과("const c = (name: string) => require(name);"),
    통과("const c = require();"),
    통과("const a = 1;\nexport { a };"),
  ],
  invalid: [
    // 가져오기 — src·dist·node_modules 와 그 아래, 낱말만 있는 주소도
    지적('import { a } from "@wedly/x/src/a";', { messageId: "deepImport", type: "Literal" }),
    지적('import { a } from "@wedly/ui-shared/src";', { messageId: "deepImport", type: "Literal" }),
    지적('import { a } from "@wedly/ui-shared/dist/index.js";', { messageId: "deepImport", type: "Literal" }),
    지적('import { a } from "@wedly/x/dist";', { messageId: "deepImport", type: "Literal" }),
    지적('import { a } from "@wedly/x/node_modules";', { messageId: "deepImport", type: "Literal" }),
    지적('import { a } from "@wedly/policy-match-shared/node_modules/zod/index.js";', { messageId: "deepImport", type: "Literal" }),
    지적('import type { A } from "@wedly/x/src/types";', { messageId: "deepImport", type: "Literal" }),
    지적('import "@wedly/x/src/a";', { messageId: "deepImport", type: "Literal" }),
    // 다시 내보내기
    지적('export { a } from "@wedly/x/src/a";', { messageId: "deepImport", type: "Literal" }),
    지적('export * from "@wedly/x/src/a";', { messageId: "deepImport", type: "Literal" }),
    지적('export * as ns from "@wedly/x/src/a";', { messageId: "deepImport", type: "Literal" }),
    // 동적 import — 따옴표 글자와 `${}` 없는 백틱 글자
    지적('export const load = () => import("@wedly/x/dist/b");', { messageId: "deepImport", type: "Literal" }),
    지적("export const load = () => import(`@wedly/x/dist/b`);", { messageId: "deepImport", type: "TemplateLiteral" }),
    // require, import = require
    지적('const c = require("@wedly/x/node_modules/c");', { messageId: "deepImport", type: "Literal" }),
    지적('import c = require("@wedly/x/src/c");', { messageId: "deepImport", type: "Literal" }),
    // 한 글에 둘이면 둘 다 센다
    지적(
      'import { a } from "@wedly/x/src/a";\nconst b = require("@wedly/x/dist/b");',
      { messageId: "deepImport", type: "Literal" },
      { messageId: "deepImport", type: "Literal" },
    ),
  ],
});

// 끄기 주석이 가리키는 규칙(no-console)은 이 시험에서 켜지 않는다 — 「쓰지 않은 끄기 주석」 알림이 섞이지 않게 끈다
const reasonTester = new RuleTester({
  languageOptions: { parser: tsParser },
  linterOptions: { reportUnusedDisableDirectives: "off" },
});
const 이유없음 = (code, filename = FILE) => ({ code, filename, errors: [{ messageId: "reasonRequired" }] });

reasonTester.run("require-disable-reason", requireDisableReason, {
  valid: [
    통과("// eslint-disable-next-line no-console -- 시작 알림이라 남긴다\nconsole.log(1);"),
    통과("console.log(1); // eslint-disable-line no-console -- 시작 알림이라 남긴다"),
    // 다시 켜는 주석은 이유가 필요 없다
    통과("/* eslint-disable no-console -- 이 구간은 로그 도구라서 */\nconsole.log(1);\n/* eslint-enable no-console */"),
    // 공백 뺀 정확히 다섯 글자, 대시 세 개, 영어 이유
    통과("// eslint-disable-next-line no-console -- 다섯글자요\nconsole.log(1);"),
    통과("// eslint-disable-next-line no-console --- 세 줄 대시도 설명이다\nconsole.log(1);"),
    통과("// eslint-disable-next-line no-console -- startup banner\nconsole.log(1);"),
    // 지시문이 아닌 주석·글자
    통과("// 이 줄은 eslint-disable 을 설명할 뿐이다\nexport const a = 1;"),
    통과("// eslint-disabled-by-hand\nexport const a = 1;"),
    통과("/** eslint-disable-next-line no-console */\nexport const a = 1;"),
    통과('export const a = "// eslint-disable-next-line no-console";'),
    // JSX 안의 블록 주석도 같은 지시문이다
    통과("export const el = <div>{/* eslint-disable-next-line no-console -- 마운트 때 한 번만 읽는다 */}<b /></div>;", "rule.tsx"),
  ],
  invalid: [
    이유없음("// eslint-disable-next-line no-console\nconsole.log(1);"),
    이유없음("console.log(1); // eslint-disable-line no-console"),
    이유없음("/* eslint-disable no-console */\nconsole.log(1);"),
    이유없음("/*eslint-disable no-console*/\nconsole.log(1);"),
    이유없음("/* eslint-disable-next-line no-console */\nconsole.log(1);"),
    // 규칙 이름이 없어도 끄는 주석이다
    이유없음("// eslint-disable-next-line\nexport const a = 1;"),
    // 이유가 다섯 글자보다 짧거나 비었다(공백은 세지 않는다)
    이유없음("// eslint-disable-next-line no-console -- 짧음\nconsole.log(1);"),
    이유없음("/* eslint-disable no-console -- 네글자요 */\nconsole.log(1);"),
    이유없음("// eslint-disable-next-line no-console -- 가 나 다 라\nconsole.log(1);"),
    이유없음("export const el = <div>{/* eslint-disable-next-line no-console */}<b /></div>;", "rule.tsx"),
    // 끝의 만료·승인 괄호는 이유가 아니다 — 괄호만 적으면 이유가 없다
    이유없음("// eslint-disable-next-line no-console -- (만료 2026-12-31, 승인 이상민)\nconsole.log(1);"),
    이유없음("// eslint-disable-next-line no-console -- 짧음 (만료 2026-12-31, 승인 이상민)\nconsole.log(1);"),
  ],
});

// 승인 괄호가 아닌 괄호는 이유의 일부라 그대로 센다 — 옛 주석의 글자 수가 바뀌어 동결 개수가 흔들리지 않게
reasonTester.run("require-disable-reason — 괄호", requireDisableReason, {
  valid: [
    통과("// eslint-disable-next-line no-console -- (시작 알림)\nconsole.log(1);"),
    통과("// eslint-disable-next-line no-console -- 시작 알림이라 남긴다 (만료 2026-12-31, 승인 이상민)\nconsole.log(1);"),
    통과("// eslint-disable-next-line no-console -- 승인 받은 화면만 (관리자)\nconsole.log(1);"),
  ],
  invalid: [],
});

const 승인없음 = (code, messageId = "approvalRequired", filename = FILE) => ({ code, filename, errors: [{ messageId }] });
// 오늘에서 days 날 뒤의 날짜(UTC, YYYY-MM-DD) — 1년 경계는 시험을 돌리는 날 기준이다
const 날뒤 = (days) => new Date(Date.now() + days * 86_400_000).toISOString().slice(0, 10);
const 승인주석 = (date) => `// eslint-disable-next-line no-console -- 시작 알림이라 남긴다 (만료 ${date}, 승인 이상민)\nconsole.log(1);`;

reasonTester.run("require-disable-expiry", requireDisableExpiry, {
  valid: [
    통과("// eslint-disable-next-line no-console -- 시작 알림이라 남긴다 (만료 2026-12-31, 승인 이상민)\nconsole.log(1);"),
    통과("console.log(1); // eslint-disable-line no-console -- 시작 알림이라 남긴다 (승인 이상민, 만료 2026-12-31)"),
    통과("/* eslint-disable no-console -- 로그 도구라서 (만료: 2026-12-31 · 승인자: 이아영) */\nconsole.log(1);\n/* eslint-enable no-console */"),
    // 전각 괄호·쉼표, 영어 이름도 받는다
    통과("// eslint-disable-next-line no-console -- 시작 알림이라 남긴다（만료 2026-12-31，승인 smlee）\nconsole.log(1);"),
    // 이미 지난 날짜도 막지 않는다 — 날짜만 지나도 바뀐 것 없는 빌드가 깨지면 안 된다
    통과("// eslint-disable-next-line no-console -- 시작 알림이라 남긴다 (만료 2020-01-31, 승인 이상민)\nconsole.log(1);"),
    통과(승인주석(날뒤(364))),
    // 경계: 366일째까지 통과, 367일째부터 tooFar
    통과(승인주석(날뒤(366))),
    통과("export const el = <div>{/* eslint-disable-next-line no-console -- 마운트 때 한 번만 (만료 2026-12-31, 승인 이상민) */}<b /></div>;", "rule.tsx"),
    // 다시 켜는 주석·지시문이 아닌 주석
    통과("/* eslint-enable no-console */\nexport const a = 1;"),
    통과("// 이 줄은 eslint-disable 을 설명할 뿐이다\nexport const a = 1;"),
  ],
  invalid: [
    승인없음("// eslint-disable-next-line no-console -- 시작 알림이라 남긴다\nconsole.log(1);"),
    승인없음("// eslint-disable-next-line no-console\nconsole.log(1);"),
    승인없음("/* eslint-disable no-console */\nconsole.log(1);"),
    승인없음("// eslint-disable-next-line no-console -- 시작 알림이라 남긴다 (관리자 화면)\nconsole.log(1);"),
    // 괄호가 끝에 있지 않으면 승인 괄호가 아니다
    승인없음("// eslint-disable-next-line no-console -- (만료 2026-12-31, 승인 이상민) 시작 알림\nconsole.log(1);"),
    승인없음("// eslint-disable-next-line no-console -- 시작 알림이라 남긴다 (승인 이상민)\nconsole.log(1);", "expiryRequired"),
    승인없음("// eslint-disable-next-line no-console -- 시작 알림이라 남긴다 (만료 2026/12/31, 승인 이상민)\nconsole.log(1);", "expiryRequired"),
    승인없음("// eslint-disable-next-line no-console -- 시작 알림이라 남긴다 (만료 2026-12-31)\nconsole.log(1);", "approverRequired"),
    승인없음("// eslint-disable-next-line no-console -- 시작 알림이라 남긴다 (만료 2026-12-31, 승인)\nconsole.log(1);", "approverRequired"),
    승인없음("// eslint-disable-next-line no-console -- 시작 알림이라 남긴다 (만료 2026-12-31, 승인 이)\nconsole.log(1);", "approverRequired"),
    승인없음("// eslint-disable-next-line no-console -- 시작 알림이라 남긴다 (만료 2026-02-30, 승인 이상민)\nconsole.log(1);", "badDate"),
    승인없음("// eslint-disable-next-line no-console -- 시작 알림이라 남긴다 (만료 2026-13-01, 승인 이상민)\nconsole.log(1);", "badDate"),
    // 1년보다 먼 날짜는 영구로 끄는 것과 같다
    승인없음("// eslint-disable-next-line no-console -- 시작 알림이라 남긴다 (만료 2099-12-31, 승인 이상민)\nconsole.log(1);", "tooFar"),
    승인없음(승인주석(날뒤(367)), "tooFar"),
    승인없음(승인주석(날뒤(368)), "tooFar"),
    승인없음("export const el = <div>{/* eslint-disable-next-line no-console -- 마운트 때 한 번만 */}<b /></div>;", "approvalRequired", "rule.tsx"),
  ],
});

// `--` 뒤가 비었거나 `--` 에 이유를 붙여 쓴 주석은 ESLint 가 `no-console --` 를 규칙 이름으로 읽어 「규칙 없음」 오류를 따로 낸다.
// RuleTester 는 그 오류까지 세므로, 이 둘은 이 규칙의 지적만 센다(ERP 진짜 설정 시험도 규칙 이름으로만 셌다).
describe("require-disable-reason — ESLint 가 규칙 이름으로 잘못 읽는 주석", () => {
  const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
  const eslint = new ESLint({
    cwd: ROOT,
    overrideConfigFile: true,
    overrideConfig: [{ files: ["**/*.ts"], languageOptions: { parser: tsParser }, plugins: { wedly: plugin }, rules: { "wedly/require-disable-reason": "error" } }],
  });
  for (const code of [
    "// eslint-disable-next-line no-console --\nconsole.log(1);",
    "// eslint-disable-next-line no-console --이유를붙여씀\nconsole.log(1);",
  ]) {
    it(code, async () => {
      const [result] = await eslint.lintText(code, { filePath: path.join(ROOT, "rule.ts") });
      assert.equal(result.messages.filter((m) => m.ruleId === "wedly/require-disable-reason").length, 1);
    });
  }
});
