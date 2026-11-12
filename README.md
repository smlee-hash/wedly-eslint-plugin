# @wedly/eslint-plugin

WEDLY 모든 앱(ERP·일루아·하이브·랩·공용 UI 꾸러미 …)이 함께 쓰는 ESLint 규칙 묶음이에요.
새 린트 규칙은 앱마다 따로 만들지 않고 여기에 한 번만 넣어요. 앱은 이 꾸러미를 가져와 쓰고, 옛 위반은 앱마다 동결해 두고, 새 위반만 빌드를 막아요.
각 앱은 `probe` 로 "공용 규칙이 내 앱 빌드에서 정말 도는지"를 자기 시험에서 확인해요.

## 규칙

| 규칙 | 한 줄 설명 | 왜 |
| --- | --- | --- |
| `wedly/require-disable-reason` | `eslint-disable` 주석에 ` -- 이유`(공백 뺀 다섯 글자 이상)를 적게 해요 | 이유 없이 끈 주석은 왜 껐는지 몰라 지우지도 못하고, 같은 줄을 베낀 새 코드가 같은 실수를 들여와요 |
| `wedly/require-disable-expiry` | `eslint-disable` 주석 끝에 `(만료 YYYY-MM-DD, 승인 이름)` 을 적게 해요(만료는 오늘에서 1년 안, 지난 날짜는 막지 않아요) | 언제까지 둘지, 누가 허락했는지 없는 예외는 영구로 남아요 |
| `wedly/no-shared-deep-import` | `@wedly/*` 꾸러미의 `src`·`dist`·`node_modules` 안쪽 파일을 직접 가져오지 못하게 해요 | 꾸러미가 폴더를 바꾸면 그 꾸러미를 쓰는 앱이 운영에서만 깨져요 |
| `wedly/no-double-cast` | `x as unknown as T` 같은 이중 타입 단언을 막아요 | 컴파일러의 검사를 통째로 꺼서, 모양이 틀린 값이 운영에서야 터져요 |
| `wedly/no-weak-assertion` | 시험의 `toBeDefined()`·`toBeTruthy()`·인자 없는 `.not.toThrow()` 같은 약한 확인을 막아요 | 값이 무엇이든 통과해서 고장 난 코드도 초록불이 돼요 |
| `no-console` (ESLint 기본 규칙) | `console.log`·`info`·`debug` 를 막아요(`warn`·`error` 는 허용) | 운영 로그에 값이 섞여 나가고 어디서 찍었는지 찾기 어려워요 |

시험 파일에는 `no-weak-assertion` 만 걸고, `no-double-cast`·`no-console` 은 시험이 아닌 파일에만 걸어요(시험은 일부러 깨진 값을 넣기도 하니까요).

규칙 이름은 ESLint 9(flat)에서는 `wedly/…`, ESLint 8(.eslintrc)에서는 `@wedly/…` 로 나와요.
앱의 동결 목록(`eslint-suppressions.json`)이 파일마다 **규칙 이름별 개수**를 세기 때문에, flat 설정의 플러그인 키는 꼭 `wedly` 여야 해요. 키를 바꾸면 동결해 둔 위반이 한꺼번에 새 위반이 돼요.

## ESLint 9 앱에 붙이기

1. `package.json` 에 커밋을 못 박아요(저장소가 공개라 Docker 빌드에도 토큰이 필요 없어요).

   ```json
   "devDependencies": {
     "@wedly/eslint-plugin": "github:smlee-hash/wedly-eslint-plugin#<commit>"
   }
   ```

2. `eslint.config.mjs` 에서 앱의 TypeScript 파서 블록 **뒤에** 펼쳐요.

   ```js
   import wedly from "@wedly/eslint-plugin";

   export default [
     // …앱의 TypeScript 파서 블록·다른 설정…
     ...wedly.configs.recommended,
   ];
   ```

3. 파일 범위를 앱에 맞게 좁히거나 `no-console` 을 빼려면 `preset` 에 옵션을 넘겨요. 모두 생략해도 돼요.

   ```js
   ...wedly.preset({
     code: ["src/**/*.{ts,tsx,js,jsx,mjs,cjs}"], // 모든 코드 파일 (기본 **/*.{ts,tsx,js,jsx,mjs,cjs})
     typescript: ["src/**/*.{ts,tsx}"],          // 이중 단언을 볼 파일 (기본 **/*.{ts,tsx})
     tests: ["**/*.test.{ts,tsx}", "**/__tests__/**/*.{ts,tsx}"], // 시험 파일 (기본값이 이 모양)
     console: false,                              // false 면 no-console 블록을 뺀다 (기본 true)
   })
   ```

`wedly.preset()` 은 옵션 없이 부르면 `wedly.configs.recommended` 와 같아요.

## ESLint 8 앱에 붙이기

`.eslintrc` 에 플러그인을 `@wedly` 로 등록하고 묶음을 가져와요. 파서는 묶음에 들어 있지 않아요 — 앱이 자기 파서를 두세요.

```js
module.exports = {
  parser: "@typescript-eslint/parser",
  plugins: ["@wedly"],
  extends: ["plugin:@wedly/legacy-recommended"],
};
```

## 옛 위반 동결하기(새 규칙만)

규칙을 새로 켜면 옛 코드에 있던 위반이 한꺼번에 빌드를 막아요. 그 **새 규칙의 위반만** 동결하고 새로 쓰는 코드만 막으세요.

```sh
npx eslint --suppress-rule wedly/<규칙 이름>
```

- 꼭 규칙을 지정하세요. `--suppress-all` 은 쓰지 않아요 — 다른 규칙의 새 위반까지 한꺼번에 묻어 버려요.
- 동결한 결과는 앱의 `eslint-suppressions.json` 에 들어가요. 옛 위반을 고치면 `npx eslint --prune-suppressions` 로 목록을 줄여요.
- ESLint 8 앱에는 `--suppress-rule` 이 없어요. 앱이 쓰는 자기 기준 파일(baseline)에 옛 위반을 적어 두세요.
- `require-disable-expiry` 를 처음 받는 앱은 옛 끄기 주석 전부가 걸려요. `npx eslint --suppress-rule wedly/require-disable-expiry` 로 그 규칙만 동결하세요.

## 앱마다 확인하기(probe)

공용 규칙이 이 앱 빌드에 정말 연결됐는지는 앱의 시험이 확인해요. `probe` 는 앱의 진짜 ESLint 설정으로 규칙마다 일부러 틀린 글을 린트해서, 그 규칙이 **오류**로 걸리는지 알려 줘요.

```js
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { ESLint } from "eslint";
import { probe } from "@wedly/eslint-plugin/probe";

describe("공용 린트 규칙이 이 앱 빌드에 연결돼 있다", () => {
  it("규칙마다 일부러 틀린 글이 오류로 걸린다", async () => {
    const cwd = process.cwd();
    const results = await probe(new ESLint({ cwd }), {
      cwd,
      code: "src/lib/wedly-probe.ts",       // 시험이 아닌 .ts 파일 경로(앱 루트 기준)
      test: "src/lib/wedly-probe.test.ts",  // 시험 .ts 파일 경로(앱 루트 기준)
    });
    for (const r of results) {
      assert.equal(r.caught, true, `${r.rule} 이 안 걸려요: ${JSON.stringify(r)}`);
    }
  });
});
```

- 두 경로는 앱 설정이 린트하는 곳이어야 해요. 파일이 실제로 없어도 되고, 파일은 쓰지 않아요(글을 직접 넘겨 린트해요).
- 규칙 여섯 개(`require-disable-reason`·`require-disable-expiry`·`no-shared-deep-import`·`no-double-cast`·`no-weak-assertion`·`no-console`)를 이 차례로 한 줄씩 돌려줘요. `no-console` 을 뺀 앱은 `console: false` 를 넘기세요.
- 각 줄은 `{ rule, file, caught, ignored, copy, found, error }` 예요.
  - `caught`: 이 꾸러미의 규칙(이름만 같은 규칙이 아니라 이 꾸러미가 내놓은 규칙)이 오류(severity 2)로 걸렸는가. 경고(warn)는 빌드를 막지 못해서 걸린 것으로 세지 않아요.
  - `ignored`: 앱 설정이 그 파일을 무시하는가. 무시하면 린트하지 않고 `caught` 는 거짓이에요.
  - `copy`: 같은 키(`wedly`)로 앱이 자기 사본 규칙을 등록해 걸린 경우 참이에요. 이름이 같아도 이 꾸러미의 규칙이 아니면 `caught` 는 거짓이에요 — 앱이 공용 꾸러미로 정말 바꿨는지를 확인하려는 거예요.
  - `found`: 그 글에서 오류로 나온 규칙 이름들. 다른 키(`local/no-double-cast` 등)로 등록한 같은 이름 규칙은 공용 규칙으로 세지 않아요.
  - `error`: 시험 글이 문법 오류로 읽히면 그 메시지, 아니면 `null`.
- 앱이 규칙을 끄거나 경고로 낮추거나 확인 파일을 무시하면 해당 줄의 `caught` 가 거짓이 되어 시험이 실패해요. ESLint 8(.eslintrc) 앱의 `@wedly/…` 규칙 이름도 걸린 것으로 세어 줘요.
