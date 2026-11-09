// WEDLY 공용 ESLint 플러그인의 타입 — index.cjs 가 내는 객체 모양 그대로다. eslint 를 가져오지 않아 ESLint 8 앱도 그대로 쓴다.

declare namespace plugin {
  /** preset() 에 넘기는 파일 범위(글롭 배열). 빼면 꾸러미 기본값을 쓴다. */
  interface PresetOptions {
    /** 모든 코드 파일 */
    code?: string[];
    /** 이중 단언을 볼 TypeScript 파일 */
    typescript?: string[];
    /** 시험 파일 */
    tests?: string[];
    /** false 면 no-console 블록을 뺀다 */
    console?: boolean;
  }

  /** flat config(ESLint 9) 블록 하나. */
  interface FlatBlock {
    name: string;
    files: string[];
    ignores?: string[];
    plugins?: Record<string, unknown>;
    rules: Record<string, unknown>;
  }

  /** .eslintrc(ESLint 8) 의 overrides 한 줄. */
  interface LegacyOverride {
    files: string[];
    excludedFiles?: string[];
    rules: Record<string, unknown>;
  }

  /** .eslintrc(ESLint 8) 앱용 묶음 — `plugin:@wedly/legacy-recommended`. */
  interface LegacyConfig {
    plugins: string[];
    overrides: LegacyOverride[];
  }

  /** 규칙의 meta 객체. */
  interface RuleMeta {
    type: "problem" | "suggestion" | "layout";
    docs: { description: string };
    schema: unknown[];
    messages: Record<string, string>;
  }

  /** 규칙 모듈 — meta 와 create. ESLint 가 부르므로 구조만 적는다(eslint 타입은 가져오지 않는다). */
  interface RuleModule {
    meta: RuleMeta;
    create(context: any): Record<string, (node: any) => void>;
  }

  interface WedlyPlugin {
    meta: { name: string; version: string };
    rules: {
      "require-disable-reason": RuleModule;
      "no-weak-assertion": RuleModule;
      "no-double-cast": RuleModule;
      "no-shared-deep-import": RuleModule;
    };
    /** flat config 블록 배열을 새로 만든다. */
    preset(options?: PresetOptions): FlatBlock[];
    configs: {
      recommended: FlatBlock[];
      "legacy-recommended": LegacyConfig;
    };
  }
}

// eslint-disable-next-line @typescript-eslint/no-redeclare -- 같은 이름의 namespace 와 값을 합쳐 export = 로 타입도 함께 내는 TypeScript 선언 병합이다
declare const plugin: plugin.WedlyPlugin;

export = plugin;
