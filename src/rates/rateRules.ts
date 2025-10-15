// src/rates/rateRules.ts

/** 카테고리(구분) 정의: 레이블과 지급률(소수) */
export interface CategoryDef {
  id: string;      // 안정적 식별자 (예: uuid or 'cat-영세')
  label: string;   // 화면에 보이는 라벨 (예: '영세')
  rate: number;    // 0.0017 처럼 소수
}

/** 조건식: 단일 조건 */
export type FieldKey =
  | 'MID명'
  | '금액'
  | '에이전시수수료'
  | '구분인덱스'
  | '사업자번호'
  | 'MID'
  | 'GID';

export type Operator =
  | 'contains'
  | 'not_contains'
  | '=='
  | '!='
  | '>'
  | '>='
  | '<'
  | '<='
  | 'in'
  | 'not_in'
  | 'is_empty'
  | 'not_empty';

export interface Condition {
  field: FieldKey;
  op: Operator;
  value?: any; // in/not_in 은 배열 허용, 비교는 number/string
}

/** 룰 효과 */
export type RuleEffect =
  | { type: 'setPayRate'; value: number }       // 지급률 강제
  | { type: 'setCategory'; categoryId: string } // 카테고리 강제

export interface Rule {
  id: string;            // 식별자
  name: string;          // 관리용 이름
  priority: number;      // 낮을수록 먼저
  conditions: Condition[]; // AND 조합
  effect: RuleEffect;
  enabled: boolean;
}

/** 전체 규칙 스냅샷 */
export interface RateRulesV2 {
  version: 2;
  categories: CategoryDef[];
  rules: Rule[];
}

/** v2 저장 키 */
export const RATE_RULES_STORAGE_KEY_V2 = 'rateRules:v2';

/** 기본값 (현행 유지) */
export const DEFAULT_RATE_RULES_V2: RateRulesV2 = {
  version: 2,
  categories: [
    { id: 'cat-youngse', label: '영세',  rate: 0.0017 },
    { id: 'cat-mid1',    label: '중소1', rate: 0.0019 },
    { id: 'cat-mid2',    label: '중소2', rate: 0.0024 },
    { id: 'cat-mid3',    label: '중소3', rate: 0.0019 },
    { id: 'cat-normal',  label: '일반',  rate: 0.0008 },
  ],
  rules: [
    // 특례: MID명에 '_분담무이자' 포함 → 지급률 0.0008 강제
    {
      id: 'rule-bundan',
      name: '분담무이자 특례',
      priority: 10,
      enabled: true,
      conditions: [{ field: 'MID명', op: 'contains', value: '_분담무이자' }],
      effect: { type: 'setPayRate', value: 0.0008 },
    },
    // 필요 시: 금액이 일정 이상이면 특정 카테고리로 강제 등 예시 추가 가능
    // {
    //   id: 'rule-high-amount',
    //   name: '고액 거래 카테고리',
    //   priority: 20,
    //   enabled: true,
    //   conditions: [{ field: '금액', op: '>=', value: 500000 }],
    //   effect: { type: 'setCategory', categoryId: 'cat-normal' },
    // },
  ],
};

