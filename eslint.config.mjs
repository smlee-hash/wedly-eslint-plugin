// 이 꾸러미 자신도 WEDLY 공용 규칙 묶음으로 검사한다 — 앱과 같은 `wedly` 키로 등록되는 recommended 를 그대로 펼친다.
// 린트 동결(eslint-suppressions.json)은 wedly-lint-freeze init 이 만든다.
import tsParser from "@typescript-eslint/parser";
import wedly from "./index.mjs";

export default [
  { ignores: ["ref/**"] },
  {
    // 타입 선언·시험용 소비자 파일(.ts)은 TypeScript 파서로 읽는다
    files: ["**/*.ts"],
    languageOptions: { parser: tsParser },
  },
  ...wedly.configs.recommended,
];
