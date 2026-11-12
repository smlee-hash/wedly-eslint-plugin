// 앱이 TypeScript 로 이 꾸러미를 쓰는 모양 — test/types.test.mjs 가 이 파일을 strict 로 타입 검사한다.
// 맨 아래 @ts-expect-error 줄은 틀린 사용이 정말 타입 오류인지 본다. 타입이 any 로 풀리면 그 줄들이 오류가 아니게 되어
// 「쓰지 않은 @ts-expect-error」 오류가 나므로, 선언 파일이 없거나 느슨하면 시험이 실패한다.
import { ESLint } from "eslint";
import wedly from "@wedly/eslint-plugin";
import { probe, PROBE_RULES } from "@wedly/eslint-plugin/probe";
import type { ProbeResult, ProbeRule } from "@wedly/eslint-plugin/probe";

const blocks = wedly.preset({ code: ["src/**/*.ts"], typescript: ["src/**/*.ts"], tests: ["**/*.test.ts"], console: false });
const names: string[] = blocks.map((block) => block.name);
const recommended: number = wedly.configs.recommended.length;
const legacyPlugins: string[] = wedly.configs["legacy-recommended"].plugins;
const version: string = wedly.meta.version;
const ruleCount: number = Object.keys(wedly.rules).length;
// 타입의 규칙 이름이 아래 여섯 개와 꼭 같다(probe.cjs PROBE_RULES 와 같은 목록) — 하나가 빠지거나 더 있으면 타입 오류다.
const probeRules: Record<ProbeRule, true> = {
  "require-disable-reason": true,
  "require-disable-expiry": true,
  "no-shared-deep-import": true,
  "no-double-cast": true,
  "no-weak-assertion": true,
  "no-console": true,
};

export async function check(): Promise<boolean> {
  const rows: ProbeResult[] = await probe(new ESLint({ cwd: "." }), { cwd: ".", code: "a.ts", test: "a.test.ts" });
  const first: string = PROBE_RULES[0];
  const okRows = rows.every((row) => row.caught && !row.copy && !row.ignored && row.error === null && row.found.length >= 0 && row.file.length > 0);
  return okRows && first.length + names.length + recommended + legacyPlugins.length + version.length + ruleCount + Object.keys(probeRules).length > 0;
}

export async function wrong(): Promise<void> {
  const eslint = new ESLint({ cwd: "." });
  // @ts-expect-error code·test 경로는 꼭 넘겨야 한다
  await probe(eslint, { cwd: "." });
  const rows = await probe(eslint, { cwd: ".", code: "a.ts", test: "a.test.ts", console: false });
  // @ts-expect-error 결과 줄에 없는 칸
  void rows[0].nope;
  // @ts-expect-error preset 의 code 는 글롭 한 줄이 아니라 배열이다
  wedly.preset({ code: "src/**/*.ts" });
  // @ts-expect-error 없는 묶음 이름
  void wedly.configs.strict;
}
