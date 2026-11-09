// 타입 선언: TypeScript 앱(ERP 의 vitest 시험 등)이 꾸러미와 probe 를 strict 로 가져다 쓸 수 있는지 본다.
// test/fixtures/consumer.ts 를 앱이 흔히 쓰는 두 모듈 해석 방식(bundler·NodeNext)으로 검사해 오류가 하나도 없어야 한다.
// 선언 파일 자체도 skipLibCheck 없이 따로 검사한다 — 앱 설정에서 skipLibCheck 가 꺼져 있어도 깨지지 않게.
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import ts from "typescript";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const FIXTURE = path.join(ROOT, "test/fixtures/consumer.ts");
const BASE = { strict: true, noEmit: true, target: ts.ScriptTarget.ES2022, esModuleInterop: true, types: [] };

function errors(files, options) {
  const program = ts.createProgram(files, { ...BASE, ...options });
  return ts.getPreEmitDiagnostics(program).map((d) => {
    const where = d.file ? `${path.relative(ROOT, d.file.fileName)}:${d.file.getLineAndCharacterOfPosition(d.start ?? 0).line + 1}` : "";
    return `${where} ${ts.flattenDiagnosticMessageText(d.messageText, "\n")}`;
  });
}

describe("타입 선언", () => {
  it("bundler 해석(ERP 등 Next 앱)으로 사용 예가 오류 없이 검사된다", () => {
    assert.deepEqual(errors([FIXTURE], { module: ts.ModuleKind.ESNext, moduleResolution: ts.ModuleResolutionKind.Bundler, skipLibCheck: true }), []);
  });

  it("NodeNext 해석으로도 사용 예가 오류 없이 검사된다", () => {
    assert.deepEqual(errors([FIXTURE], { module: ts.ModuleKind.NodeNext, moduleResolution: ts.ModuleResolutionKind.NodeNext, skipLibCheck: true }), []);
  });

  it("선언 파일 자체에 오류가 없다(skipLibCheck 없이)", () => {
    const files = ["index.d.ts", "probe.d.ts"].map((file) => path.join(ROOT, file));
    assert.deepEqual(errors(files, { module: ts.ModuleKind.NodeNext, moduleResolution: ts.ModuleResolutionKind.NodeNext, skipLibCheck: false }), []);
  });
});
