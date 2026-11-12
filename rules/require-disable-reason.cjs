// 검사를 끄는 주석(eslint-disable·-line·-next-line)에 ` -- 이유` 를 적게 하는 규칙 — 예외는 이유와 함께 남긴다(pstack 원칙).
//
// 왜: 이유 없이 끈 주석은 몇 달 뒤 왜 껐는지 아무도 몰라 지우지도 못하고, 같은 줄을 베껴 쓴 새 코드가 같은 실수를 그대로 들여온다.
// ERP 2026-11-08 기준 이유 없는 곳 149곳(93개 파일)이 있었다. 옛 위반은 각 앱의 eslint-suppressions.json 에 동결하고 새로 쓰는 주석만 막는다.
// 새 npm 패키지(eslint-plugin-eslint-comments)를 들이지 않으려고 이 패키지에 직접 둔다 — 앱은 `wedly` 플러그인으로 등록한다.
//
// 읽는 법은 disable-comment.cjs 가 정한다. 설명 끝의 만료·승인 괄호(require-disable-expiry)는 이유로 세지 않는다 —
// 그 밖의 괄호는 이유의 일부라 그대로 세어, 옛 주석의 판정이 바뀌어 동결 개수가 흔들리지 않게 한다.
// 한계: `eslint-disable wedly/require-disable-reason` 처럼 이 규칙 자신을 끄는 주석은 자기 지적을 가린다 —
// 그 길은 규칙이 막지 못하니 각 앱이 자기 시험으로 막아야 한다(ERP 는 시험으로 막는다).

"use strict";

const { isDisableComment, descriptionOf, approvalTail, visibleLength } = require("./disable-comment.cjs");

const MIN_REASON_CHARS = 5;

/** 설명에서 끝의 승인 괄호를 뺀 이유 글. */
function reasonOf(value) {
  const description = descriptionOf(value);
  const tail = approvalTail(description);
  return tail ? tail.reason : description;
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
          if (!isDisableComment(comment)) continue;
          if (visibleLength(reasonOf(comment.value)) >= MIN_REASON_CHARS) continue;
          context.report({ loc: comment.loc, messageId: "reasonRequired" });
        }
      },
    };
  },
};

module.exports = rule;
