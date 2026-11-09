// 시험의 약한 확인(`expect(x).toBeDefined()` 등)을 막는 규칙 — 값이 있기만 하면 통과해 고장 난 코드도 초록불이 된다.
//
// 왜: 기대하는 실제 값이나 실제 오류를 적게 한다. ERP 2026-11-08 기준 1,627곳(622개 파일)이 있었다.
// 옛 위반은 각 앱의 eslint-suppressions.json 에 동결하고 새로 쓰는 확인만 막는다.
// 자기 규칙 이름(wedly/no-weak-assertion)을 갖는 이유: no-restricted-syntax 같은 기존 규칙에 섞으면 그 규칙의 동결과 같은 칸에서 개수가 합쳐져
// 한쪽을 고친 만큼 다른 쪽이 새로 들어와도 빌드가 못 잡는다. 공용 묶음(preset)이 시험 파일(*.test.ts·__tests__)에만 건다.
//
// 지적하는 모양(인자가 없을 때만):
//   - `.toBeDefined()` · `.toBeTruthy()` · `.toBeFalsy()` (뒤의 둘은 `.not` 이 붙어도 같다)
//   - `.not.toBeUndefined()` · `.not.toBeNull()` · `.not.toThrow()`
// 막지 않는 모양: `.not.toBeDefined()` 는 `toBeUndefined()` 와 똑같이 값이 정확히 undefined 여야 한다는 확인이다.
// 인자가 있으면 오류 종류·메시지를 확인하는 것이라 막지 않는다(`.not.toThrow(TypeError)`·`.rejects.toThrow("메시지")`).

"use strict";

// `.not` 이 붙어도 약한 확인
const ALWAYS_WEAK = new Set(["toBeTruthy", "toBeFalsy"]);
// `.not` 이 없을 때만 약한 확인 — `.not.toBeDefined()` 는 정확한 확인이다
const WEAK_WITHOUT_NOT = new Set(["toBeDefined"]);
const WEAK_WHEN_NOT = new Set(["toBeUndefined", "toBeNull"]);

/** `a.b` 와 `a["b"]` 의 b. `a[b]` 처럼 변수로 고른 이름은 알 수 없어 null. */
function propertyName(member) {
  if (member.type !== "MemberExpression") return null;
  const { property } = member;
  if (!member.computed) return property.type === "Identifier" ? property.name : null;
  return property.type === "Literal" && typeof property.value === "string" ? property.value : null;
}

/** `expect(x).not.toBeNull` 처럼 부른 쪽 바로 앞이 `.not` 인가. */
function followsNot(member) {
  return propertyName(member.object) === "not";
}

/** @type {import("eslint").Rule.RuleModule} */
const rule = {
  meta: {
    type: "problem",
    docs: { description: "시험에서 값이 무엇이든 통과하는 약한 확인(toBeDefined·toBeTruthy·toBeFalsy·인자 없는 .not 확인)을 막는다" },
    schema: [],
    messages: {
      weakValue:
        "`toBeDefined`·`toBeTruthy`·`toBeFalsy` 는 값이 무엇이든 통과해 고장 난 코드도 초록불이 돼요. 실제 값을 확인하세요: `toBe(값)`·`toEqual(값)` 처럼 기대하는 값을 그대로 적으세요.",
      weakNot:
        "`.not.toBeUndefined()`·`.not.toBeNull()` 은 어떤 값이든 통과해요. 실제 값을 확인하세요: `toBe(값)`·`toEqual(값)` 처럼 기대하는 값을 그대로 적으세요.",
      weakThrow:
        "`.not.toThrow()` 는 인자 없이 쓰면 '안 터졌다'만 확인해요. 실제 결과 값을 `toBe`·`toEqual` 로 확인하고, 터져야 하는 경우는 `toThrow(메시지)` 로 실제 오류를 확인하세요.",
    },
  },
  create(context) {
    return {
      CallExpression(node) {
        if (node.arguments.length > 0) return;
        const name = propertyName(node.callee);
        if (name === null) return;
        if (ALWAYS_WEAK.has(name)) context.report({ node, messageId: "weakValue" });
        else if (WEAK_WITHOUT_NOT.has(name) && !followsNot(node.callee)) context.report({ node, messageId: "weakValue" });
        else if (WEAK_WHEN_NOT.has(name) && followsNot(node.callee)) context.report({ node, messageId: "weakNot" });
        else if (name === "toThrow" && followsNot(node.callee)) context.report({ node, messageId: "weakThrow" });
      },
    };
  },
};

module.exports = rule;
