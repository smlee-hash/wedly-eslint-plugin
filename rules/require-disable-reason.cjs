// 검사를 끄는 주석(eslint-disable·-line·-next-line)에 ` -- 이유` 를 적게 하는 규칙 — 예외는 이유와 함께 남긴다(pstack 원칙).
//
// 왜: 이유 없이 끈 주석은 몇 달 뒤 왜 껐는지 아무도 몰라 지우지도 못하고, 같은 줄을 베껴 쓴 새 코드가 같은 실수를 그대로 들여온다.
// ERP 2026-11-08 기준 이유 없는 곳 149곳(93개 파일)이 있었다. 옛 위반은 각 앱의 eslint-suppressions.json 에 동결하고 새로 쓰는 주석만 막는다.
// 새 npm 패키지(eslint-plugin-eslint-comments)를 들이지 않으려고 이 패키지에 직접 둔다 — 앱은 `wedly` 플러그인으로 등록한다.
//
// 읽는 법은 ESLint 가 지시문을 읽는 법과 같다: 주석 글을 다듬은 뒤 맨 앞 낱말이 지시문이고, 설명은 `\s--\s` 뒤 글이다.
// 한계: `eslint-disable wedly/require-disable-reason` 처럼 이 규칙 자신을 끄는 주석은 자기 지적을 가린다 —
// 그 길은 규칙이 막지 못하니 각 앱이 자기 시험으로 막아야 한다(ERP 는 시험으로 막는다).

"use strict";

// eslint-enable 은 이유가 필요 없다 — 다시 켜는 쪽이라 지시문 낱말에 넣지 않는다
const DISABLE_DIRECTIVE = /^eslint-disable(?:-next-line|-line)?(?:\s|$)/u;
const DESCRIPTION_SEPARATOR = /\s-{2,}\s/u;
const MIN_REASON_CHARS = 5;

/** 지시문 주석 글에서 ` -- ` 뒤 설명만 꺼낸다. 없으면 빈 글. */
function reasonOf(value) {
  const match = DESCRIPTION_SEPARATOR.exec(value);
  return match ? value.slice(match.index + match[0].length) : "";
}

/** 공백을 뺀 글자 수(이모지 한 글자는 한 글자로 센다). */
function visibleLength(text) {
  return [...text.replace(/\s+/gu, "")].length;
}

const rule = {
  meta: {
    type: "problem",
    docs: { description: "eslint-disable 주석에 ` -- 이유`(공백 뺀 다섯 글자 이상)를 요구한다" },
    schema: [],
    messages: {
      reasonRequired:
        "검사를 끄는 주석에는 이유(다섯 글자 이상)를 적으세요: `// eslint-disable-next-line 규칙 -- 이유`. 이유 없이 끄면 같은 실수가 다시 들어옵니다.",
    },
  },
  create(context) {
    const sourceCode = context.sourceCode;
    return {
      Program() {
        for (const comment of sourceCode.getAllComments()) {
          // 첫 줄 `#!` 은 주석이 아니다
          if (comment.type !== "Line" && comment.type !== "Block") continue;
          if (!DISABLE_DIRECTIVE.test(comment.value.trim())) continue;
          if (visibleLength(reasonOf(comment.value)) >= MIN_REASON_CHARS) continue;
          context.report({ loc: comment.loc, messageId: "reasonRequired" });
        }
      },
    };
  },
};

module.exports = rule;
