// 검사를 끄는 주석 끝에 만료일과 승인자를 적게 하는 규칙 — 예외는 이유·만료일·승인자와 함께 남긴다(pstack 원칙, NO.700).
//
// 왜: 이유만 적은 예외는 언제까지 둘지, 누가 허락했는지 몰라 영구로 남는다. 꼴은
//   `// eslint-disable-next-line 규칙 -- 이유 (만료 2026-12-31, 승인 이상민)` — 괄호는 설명 맨 끝에 둔다.
// 만료일은 달력에 있는 날이어야 하고, 오늘에서 1년(366일) 안이어야 한다. 이미 지난 날짜는 막지 않는다 —
// 날짜만 지나도 바뀐 것 없는 빌드가 깨지면 안 되기 때문이다. 지난 예외를 찾아 다시 보는 일은 정기 점검이 맡는다.
// 옛 주석은 각 앱의 eslint-suppressions.json 에 동결하고 새로 쓰는 주석만 막는다.
// 한계: `eslint-disable wedly/require-disable-expiry` 처럼 이 규칙 자신을 끄는 주석은 자기 지적을 가린다 —
// `-next-line` 꼴은 자기 줄이 남아 지적되지만, 블록·`-line` 꼴은 그 자리부터 꺼져 지적이 안 나온다.
// 그 길은 규칙이 막지 못하니 각 앱이 자기 시험으로 막아야 한다(require-disable-reason 과 같은 한계).

"use strict";

const { isDisableComment, descriptionOf, approvalTail, visibleLength, EXPIRY_WORD, APPROVER_WORD } = require("./disable-comment.cjs");

const EXPIRY = /^만료\s*[:：]?\s*(\d{4})-(\d{2})-(\d{2})$/u;
const APPROVER = /^승인(?:자)?\s*[:：]?\s*(\S(?:.*\S)?)$/u;
const MIN_APPROVER_CHARS = 2;
const MAX_DAYS = 366;
const DAY_MS = 86_400_000;
const FORMAT = "`// eslint-disable-next-line 규칙 -- 이유 (만료 2026-12-31, 승인 이름)`";

/** 달력에 있는 날이면 그날 UTC 0시의 밀리초, 아니면 null. */
function calendarDay(year, month, day) {
  const time = Date.UTC(year, month - 1, day);
  const date = new Date(time);
  if (date.getUTCFullYear() !== year || date.getUTCMonth() !== month - 1 || date.getUTCDate() !== day) return null;
  return time;
}

/** 이 주석의 문제 하나(messageId·data). 문제가 없으면 null. */
function problemOf(comment) {
  const tail = approvalTail(descriptionOf(comment.value));
  if (!tail) return { messageId: "approvalRequired" };

  const expiry = tail.parts.find((part) => EXPIRY_WORD.test(part));
  const date = expiry && EXPIRY.exec(expiry);
  if (!date) return { messageId: "expiryRequired" };

  const approver = tail.parts.find((part) => APPROVER_WORD.test(part));
  const name = approver && APPROVER.exec(approver);
  if (!name || visibleLength(name[1]) < MIN_APPROVER_CHARS) return { messageId: "approverRequired" };

  const text = `${date[1]}-${date[2]}-${date[3]}`;
  const time = calendarDay(Number(date[1]), Number(date[2]), Number(date[3]));
  if (time === null) return { messageId: "badDate", data: { date: text } };

  const now = new Date();
  const today = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate());
  if ((time - today) / DAY_MS > MAX_DAYS) return { messageId: "tooFar", data: { date: text } };
  return null;
}

const rule = {
  meta: {
    type: "problem",
    docs: { description: "eslint-disable 주석 끝에 `(만료 YYYY-MM-DD, 승인 이름)` 을 요구한다(만료는 1년 안)" },
    schema: [],
    messages: {
      approvalRequired: `검사를 끄는 주석 끝에 만료일과 승인자를 적으세요: ${FORMAT}. 언제까지, 누가 허락했는지 없으면 예외가 영구로 남습니다.`,
      expiryRequired: `승인 괄호에 만료일을 \`만료 YYYY-MM-DD\` 꼴로 적으세요: ${FORMAT}.`,
      approverRequired: `승인 괄호에 승인한 사람 이름(두 글자 이상)을 적으세요: ${FORMAT}.`,
      badDate: "만료일 {{date}} 는 달력에 없는 날입니다. `만료 YYYY-MM-DD` 꼴의 실제 날짜를 적으세요.",
      tooFar: "만료일 {{date}} 는 오늘에서 1년(366일)보다 멉니다. 1년 안의 날짜를 적고, 그날이 오면 다시 보고 늘리세요.",
    },
  },
  create(context) {
    const sourceCode = context.sourceCode;
    return {
      Program() {
        for (const comment of sourceCode.getAllComments()) {
          if (!isDisableComment(comment)) continue;
          const problem = problemOf(comment);
          if (problem) context.report({ loc: comment.loc, ...problem });
        }
      },
    };
  },
};

module.exports = rule;
