// 앱별 확인(probe)의 타입 — probe.cjs 가 내는 probe 와 PROBE_RULES 모양 그대로다. eslint 를 가져오지 않아 ESLint 8·9 앱 모두 쓴다.

export type ProbeRule = "require-disable-reason" | "no-shared-deep-import" | "no-double-cast" | "no-weak-assertion" | "no-console";

export interface ProbeResult {
  rule: ProbeRule;
  file: string;
  /** 이 꾸러미의 규칙이 오류로 걸렸는가 */
  caught: boolean;
  /** 그 파일이 앱 설정에서 린트 제외인가 */
  ignored: boolean;
  /** 같은 이름의 앱 사본 규칙이 오류로 걸렸는가(이때 caught 는 거짓) */
  copy: boolean;
  /** 오류(2)로 걸린 규칙 이름들 */
  found: string[];
  /** 린트가 치명적으로 실패했을 때의 메시지 */
  error: string | null;
}

export interface ProbeOptions {
  /** 앱 루트 */
  cwd: string;
  /** 앱 루트 기준, 시험이 아닌 .ts 파일 경로 */
  code: string;
  /** 앱 루트 기준, 시험 .ts 파일 경로 */
  test: string;
  /** false 면 no-console 을 보지 않는다 */
  console?: boolean;
}

/** probe 가 부르는 ESLint 객체의 최소 모양 — ESLint 9(flat)·8 의 ESLint 클래스 인스턴스가 그대로 들어맞는다. */
export interface ProbeESLint {
  isPathIgnored(filePath: string): Promise<boolean>;
  lintText(
    code: string,
    options?: { filePath?: string },
  ): Promise<Array<{ messages: Array<{ ruleId: string | null; severity: number; fatal?: boolean; message: string }> }>>;
  getRulesMetaForResults(results: any): Record<string, unknown>;
}

export declare function probe(eslint: ProbeESLint, options: ProbeOptions): Promise<ProbeResult[]>;

export declare const PROBE_RULES: readonly ProbeRule[];
