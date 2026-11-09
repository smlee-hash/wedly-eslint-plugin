// 이중 단언(`x as unknown as T`·`(x as any) as T`·`<T><unknown>x`)을 막는 규칙 — 컴파일러의 검사를 통째로 끈다.
//
// 왜: 모양이 틀린 값이 그대로 흘러 운영에서야 터진다. 타입을 바로잡거나 타입 가드로 좁힌다.
// ERP 2026-11-08 기준 825곳(343개 파일)이 있었다. 옛 위반은 각 앱의 eslint-suppressions.json 에 동결하고 새로 쓰는 단언만 막는다.
// 자기 규칙 이름(wedly/no-double-cast)을 갖는 이유: no-restricted-syntax 같은 기존 규칙에 섞으면 그 규칙의 동결과 같은 칸에서 개수가 합쳐진다.
// 공용 묶음(preset)이 시험이 아닌 TypeScript 파일에만 건다 — 시험 파일은 일부러 깨진 값을 넣기도 한다.
//
// 지적하는 모양: `as`·꺾쇠 단언 어느 쪽이든 안쪽 피연산자(expression)가 또 단언이면 걸린다(섞어 써도 같다).
// ESTree 에는 괄호 노드가 없어 `(x as unknown) as T` 도 같은 모양이다. `x as const` 도 단언이라 안쪽에 있으면 센다.
// 단언이 세 겹이면 안쪽이 단언인 바깥 노드마다 하나씩 센다(`a as b as c as d` 는 두 곳).
// 사이에 널 아님 표시(`!`)가 몇 겹 끼어 있어도 건너뛰고 본다 — `(x as any)! as T` 도 같은 이중 단언이다.
// 안쪽에 단언이 없는 `x! as T` 는 단언이 하나뿐이라 막지 않는다.

"use strict";

const ASSERTION_TYPES = new Set(["TSAsExpression", "TSTypeAssertion"]);

/** 널 아님 표시(`x!`)를 몇 겹이든 벗기고 그 안쪽 식을 돌려준다. */
function skipNonNull(node) {
  let inner = node;
  while (inner.type === "TSNonNullExpression") inner = inner.expression;
  return inner;
}

/** @type {import("eslint").Rule.RuleModule} */
const rule = {
  meta: {
    type: "problem",
    docs: { description: "타입 단언을 겹쳐 쓰는 이중 단언(as unknown as T 등)을 막는다" },
    schema: [],
    messages: {
      doubleCast:
        "`as unknown as T`·`<T><unknown>x` 처럼 타입 단언을 겹쳐 쓰면 컴파일러에게 거짓말을 하는 거예요. 타입을 바로잡거나, 타입 가드(`is`)·검증 함수로 값을 좁혀서 쓰세요.",
    },
  },
  create(context) {
    const check = (node) => {
      if (ASSERTION_TYPES.has(skipNonNull(node.expression).type)) context.report({ node, messageId: "doubleCast" });
    };
    return { TSAsExpression: check, TSTypeAssertion: check };
  },
};

module.exports = rule;
