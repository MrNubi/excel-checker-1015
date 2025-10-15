// src/rates/useRateRules.tsx
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  DEFAULT_RATE_RULES_V2,
  RATE_RULES_STORAGE_KEY_V2,
  type RateRulesV2,
  type CategoryDef,
  type FieldKey,
  type Operator,
  type Condition,
  type Rule,
} from './rateRules';

/** 저장/로드 (나중에 API로 교체할 포인트) */
function load(): RateRulesV2 | null {
  try {
    const raw = localStorage.getItem(RATE_RULES_STORAGE_KEY_V2);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as RateRulesV2;
    if (parsed?.version !== 2) return null;
    return parsed;
  } catch {
    return null;
  }
}
function save(v: RateRulesV2) {
  localStorage.setItem(RATE_RULES_STORAGE_KEY_V2, JSON.stringify(v));
}

/** 숫자 캐스팅 유틸 */
const toNum = (v: unknown) => {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
};

function useRateRules() {
  const [snapshot, setSnapshot] = useState<RateRulesV2>(() => load() ?? DEFAULT_RATE_RULES_V2);

  useEffect(() => {
    save(snapshot);
  }, [snapshot]);

  /** 카테고리 CRUD */
  const addCategory = useCallback((label: string, rate: number) => {
    const id = `cat-${label}-${Math.random().toString(36).slice(2, 8)}`;
    setSnapshot(prev => ({
      ...prev,
      categories: [...prev.categories, { id, label, rate }],
    }));
  }, []);

  const updateCategory = useCallback((id: string, patch: Partial<CategoryDef>) => {
    setSnapshot(prev => ({
      ...prev,
      categories: prev.categories.map(c => (c.id === id ? { ...c, ...patch } : c)),
    }));
  }, []);

  const removeCategory = useCallback((id: string) => {
    setSnapshot(prev => ({
      ...prev,
      categories: prev.categories.filter(c => c.id !== id),
    }));
  }, []);

  /** 룰 CRUD */
  const addRule = useCallback((rule: Omit<Rule, 'id'>) => {
    const id = `rule-${Math.random().toString(36).slice(2, 8)}`;
    setSnapshot(prev => ({ ...prev, rules: [...prev.rules, { ...rule, id }] }));
  }, []);

  const updateRule = useCallback((id: string, patch: Partial<Rule>) => {
    setSnapshot(prev => ({
      ...prev,
      rules: prev.rules.map(r => (r.id === id ? { ...r, ...patch } : r)),
    }));
  }, []);

  const removeRule = useCallback((id: string) => {
    setSnapshot(prev => ({ ...prev, rules: prev.rules.filter(r => r.id !== id) }));
  }, []);

  /** 평가기: row + 선택된 카테고리ID(또는 라벨) → payRate */
  const evaluatePayRate = useCallback(
    (row: Record<string, any>, selectedCategoryLabel?: string | null): number => {
      const cats = snapshot.categories;
      const catIndex = selectedCategoryLabel
        ? cats.findIndex(c => c.label === selectedCategoryLabel)
        : -1;

      // 룰 평가: priority 오름차순, enabled만
      const sorted = [...snapshot.rules]
        .filter(r => r.enabled)
        .sort((a, b) => a.priority - b.priority);

      // 필드값 추출기
      const getFieldValue = (field: FieldKey): any => {
        switch (field) {
          case 'MID명': return row['MID명'] ?? '';
          case '금액': return toNum(row['금액']);
          case '에이전시수수료': return toNum(row['에이전시수수료']);
          case '구분인덱스': return catIndex;
          case '사업자번호': return row['사업자번호'] ?? '';
          case 'MID': return row['MID'] ?? '';
          case 'GID': return row['GID'] ?? '';
        }
      };

      const matchCond = (cond: Condition): boolean => {
        const left = getFieldValue(cond.field);
        const op = cond.op as Operator;
        const right = cond.value;

        switch (op) {
          case 'contains':     return String(left).includes(String(right ?? ''));
          case 'not_contains': return !String(left).includes(String(right ?? ''));
          case '==':           return left == right;
          case '!=':           return left != right;
          case '>':            return Number(left) > Number(right);
          case '>=':           return Number(left) >= Number(right);
          case '<':            return Number(left) < Number(right);
          case '<=':           return Number(left) <= Number(right);
          case 'in':           return Array.isArray(right) && right.includes(left);
          case 'not_in':       return Array.isArray(right) && !right.includes(left);
          case 'is_empty':     return left === null || left === undefined || String(left) === '';
          case 'not_empty':    return !(left === null || left === undefined || String(left) === '');
          default:             return false;
        }
      };

for (const rule of sorted) {
   if (!rule.conditions.every(matchCond)) continue;
   const eff = rule.effect; // 변수에 담아두면 TS가 좁히기 쉬움
   if (eff.type === 'setPayRate') {
     return eff.value;
   }
   if (eff.type === 'setCategory') {
     const target = cats.find(c => c.id === eff.categoryId);
     if (target) return target.rate;
   }
 }

      // 룰 미적용이면, 선택 카테고리의 기본 rate 사용
      if (catIndex >= 0 && cats[catIndex]) return cats[catIndex].rate;

      // 선택이 비어있으면 기본 카테고리(첫 번째) 또는 0
      return cats[0]?.rate ?? 0;
    },
    [snapshot]
  );

  /** 선택 리스트(Select)용 라벨 배열 */
  const categoryLabels = useMemo(() => snapshot.categories.map(c => c.label), [snapshot]);

  return {
    snapshot, setSnapshot,
    // 카테고리
    categoryLabels, addCategory, updateCategory, removeCategory,
    // 룰
    addRule, updateRule, removeRule,
    // 평가
    evaluatePayRate,
  };
}

export {useRateRules}
export default useRateRules