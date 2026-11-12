// 검사를 끄는 주석을 읽는 공용 도우미 — require-disable-reason 과 require-disable-expiry 가 같은 법으로 읽는다.
//
// 읽는 법은 ESLint 가 지시문을 읽는 법과 같다: 주석 글을 다듬은 뒤 맨 앞 낱말이 지시문이고, 설명은 `\s--\s` 뒤 글이다.
// 승인 괄호: 설명 맨 끝의 괄호 하나(반각·전각)에 `만료 …`·`승인 …` 조각이 하나라도 있으면 승인 괄호로 본다.
//   예: `-- 시작 알림이라 남긴다 (만료 2026-12-31, 승인 이상민)`. 그 밖의 괄호(`(관리자 화면)`)는 이유의 일부다.

"use strict";

// eslint-enable 은 이유가 필요 없다 — 다시 켜는 쪽이라 지시문 낱말에 넣지 않는다
const DISABLE_DIRECTIVE = /^eslint-disable(?:-next-line|-line)?(?:\s|$)/u;
const DESCRIPTION_SEPARATOR = /\s-{2,}\s/u;
const TAIL = /[(（]([^()（）]*)[)）]\s*$/u;
const PART_SEPARATOR = /\s*[,，·、]\s*/u;
const EXPIRY_WORD = /^만료(?:\s|[:：]|$)/u;
const APPROVER_WORD = /^승인(?:자)?(?:\s|[:：]|$)/u;

/** 검사를 끄는 주석(eslint-disable·-line·-next-line)인가. 첫 줄 `#!` 은 주석이 아니다. */
function isDisableComment(comment) {
  if (comment.type !== "Line" && comment.type !== "Block") return false;
  return DISABLE_DIRECTIVE.test(comment.value.trim());
}

/** 지시문 주석 글에서 ` -- ` 뒤 설명만 꺼낸다. 없으면 빈 글. */
function descriptionOf(value) {
  const match = DESCRIPTION_SEPARATOR.exec(value);
  return match ? value.slice(match.index + match[0].length) : "";
}

/** 설명 끝의 승인 괄호. 없으면 null. reason 은 괄호 앞 글, parts 는 괄호 안 조각들. */
function approvalTail(description) {
  const match = TAIL.exec(description);
  if (!match) return null;
  const parts = match[1].trim().split(PART_SEPARATOR).filter(Boolean);
  if (!parts.some((part) => EXPIRY_WORD.test(part) || APPROVER_WORD.test(part))) return null;
  return { reason: description.slice(0, match.index), parts };
}

/** 공백을 뺀 글자 수(이모지 한 글자는 한 글자로 센다). */
function visibleLength(text) {
  return [...text.replace(/\s+/gu, "")].length;
}

module.exports = { isDisableComment, descriptionOf, approvalTail, visibleLength, EXPIRY_WORD, APPROVER_WORD };
