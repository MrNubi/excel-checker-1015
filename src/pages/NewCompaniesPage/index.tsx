// src/pages/NewCompaniesPage/index.tsx
import { useMemo, useState } from 'react';
import RateSettingsModal from '../../components/RateSettingsModal';
import { useRateRules } from '../../rates/useRateRules';
import {
  Wrap, Toolbar, Title, RightBox, Button,
  TableWrap, Table, Th, Td, Input, Select, ReadOnly, ReadOnlyMono,
} from './styles';

/** 10원 단위 내림 */
const floorTo10 = (v: number) => (Number.isFinite(v) ? Math.floor(v / 10) * 10 : 0);

/** 화면에서 다루는 행 스키마(필요 필드만) */
type Row = {
  id?: string | number;
  제휴처?: string;
  구분?: string; // 카테고리 라벨
  MID명?: string | null;
  금액?: number | string | null;
  에이전시수수료?: number | string | null;
};

/** 계산 컬럼 포함 뷰 모델 */
type ViewRow = Row & {
  __payRate: number;      // 지급률(소수)
  __payFee: number;       // 지급수수료(10원 내림)
  __receiveRate: number;  // 수입수수료(소수)
  __indexNo: number;      // 화면/업로드용 index_no
};

/** 초기 데이터 로딩용 키 (기존 워크플로우 유지) */
const PREVIEW_KEY = 'registerPreview';

/** 안전한 숫자 변환 */
function toNum(v: unknown): number {
  if (v === null || v === undefined) return 0;
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}

/** 수입수수료(소수) = 에이전시수수료 / 금액 */
function calcReceiveRate(row: Row): number {
  const fee = toNum(row.에이전시수수료);
  const amt = toNum(row.금액);
  if (amt <= 0) return 0;
  return fee / amt;
}

/** JSON 다운로드 헬퍼 */
function downloadJson(data: unknown, filename = 'new-companies.json') {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

/** 공통 정규화 */
const norm = (s: unknown) => String(s ?? '').trim().toUpperCase();

/** 매칭 키 생성: 제휴처 + MID명
 *  필요 시 여기만 바꿔 다른 기준으로도 매칭 가능(예: 제휴처+상호)
 */
const buildKey = (partner?: string, midName?: string | null) =>
  `${norm(partner)}|${norm(midName)}`;

/** 레거시 index_no 로더 (localStorage 기반) */
function useLegacyIndexNos() {
  // 1) localStorage
  let legacyRaw: unknown = null;
  try { legacyRaw = JSON.parse(localStorage.getItem('legacyIndexNos') || 'null'); } catch {}
  // 2) window 전역(선택)
  // @ts-ignore
  if (!legacyRaw && typeof window !== 'undefined' && (window as any).__legacyIndexNos) {
    // @ts-ignore
    legacyRaw = (window as any).__legacyIndexNos;
  }
  const list: any[] = Array.isArray(legacyRaw) ? legacyRaw : [];

  // 다양한 키 이름 지원
  const map = new Map<string, number>();

  list.forEach((x) => {
    const partner = x.제휴처 ?? x.partner_name ?? x.partner ?? '';
    const midName = x.MID명 ?? x.mid_name_raw ?? x.midName ?? '';
    const key = buildKey(partner, midName);
    const idx = Number(x.index_no ?? x.indexNo ?? x.index ?? NaN);
    if (Number.isFinite(idx)) map.set(key, Math.floor(Math.max(0, Math.min(65535, idx))));
  });

  return { legacyIndexMap: map };
}

export default function NewCompaniesPage() {
  // v2 규칙 훅: 동적 카테고리 라벨, 룰 기반 평가기
  const { categoryLabels, evaluatePayRate } = useRateRules();
  const [rateModalOpen, setRateModalOpen] = useState(false);

  /** 초기 행 로드: 기존 동작 유지 (localStorage.registerPreview) */
  const [rows, setRows] = useState<Row[]>(() => {
    try {
      const raw = localStorage.getItem(PREVIEW_KEY);
      if (!raw) return [];
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? (parsed as Row[]) : [];
    } catch {
      return [];
    }
  });

  /** 행 업데이트 유틸 */
  const updateRow = (index: number, patch: Partial<Row>) => {
    setRows(prev => {
      const next = [...prev];
      next[index] = { ...next[index], ...patch };
      return next;
    });
  };

  /** 레거시 index_no 매핑 */
  const { legacyIndexMap } = useLegacyIndexNos();

  /** smallint unsigned 안전 클램프 */
  const clampIndex = (n: number) => Math.max(0, Math.min(65535, Math.floor(n)));

  /** ➊ 전역 최대 index_no를 구해, 없는 애들엔 맨 아래에서 +1씩 부여 */
  const rowsWithIndexAssigned = useMemo<ViewRow[]>(() => {
    // ① 레거시에서 전역 max 탐색
    let globalMax = 0;
    legacyIndexMap.forEach(v => {
      if (Number.isFinite(v)) globalMax = Math.max(globalMax, Number(v));
    });

    // ② 일단 레거시 존재하는 행은 그대로 넣고, 없는 행은 표시만 해둠
    const prelim = rows.map((r) => {
      const key = buildKey(r.제휴처, r.MID명);
      const legacyIdx = legacyIndexMap.get(key);
      const amount = toNum(r.금액);
      const payRate = evaluatePayRate(r as any, r.구분 ?? '');
      const payFee = floorTo10(amount * payRate);
      const receiveRate = calcReceiveRate(r);
      return {
        ...r,
        __payRate: payRate,
        __payFee: payFee,
        __receiveRate: receiveRate,
        __indexNo: Number.isFinite(legacyIdx) ? clampIndex(Number(legacyIdx)) : Number.NaN, // NaN이면 미할당
      };
    });

    // ③ 미할당(NaN)인 행들을 "맨 아래"에 두고 전역 max+1부터 순차 배정
    let next = globalMax;
    const assigned = prelim.map(row => {
      if (Number.isFinite(row.__indexNo)) return row;
      next += 1;
      return { ...row, __indexNo: clampIndex(next) };
    });

    return assigned;
  }, [rows, evaluatePayRate, legacyIndexMap]);

  /** ➋ 정렬: 전역 index_no ASC */
const view = useMemo<ViewRow[]>(() => {
  return [...rowsWithIndexAssigned].sort(
    (a, b) => (a.__indexNo ?? Number.POSITIVE_INFINITY) - (b.__indexNo ?? Number.POSITIVE_INFINITY)
  );
}, [rowsWithIndexAssigned]);

  /** 표 머리글 정의 (INDEX_NO 열: 제휴처 앞) */
  const headers = [
    'INDEX_NO',                    // ★ 추가
    '제휴처',
    '구분',
    'MID명',
    '금액',
    '에이전시수수료',
    '수입수수료(receive rate)',
    '지급률(pay rate)',
    '지급수수료(pay fee)',
  ];

  return (
    <Wrap>
      <Toolbar>
        <Title>신규 등록 검토</Title>
        <RightBox>
          <Button onClick={() => setRateModalOpen(true)}>지급률 설정</Button>
          <Button
            variant="ghost"
            onClick={() => downloadJson(rows, 'new-companies-raw.json')}
            title="현재 화면의 원본 rows(JSON) 저장"
          >
            원본 JSON 저장
          </Button>
          <Button
            variant="primary"
            onClick={() => {
              // 서버 업로드용 초안(JSON) — index_no 포함
              const draft = view.map(v => ({
                index_no: v.__indexNo,
                partner: v.제휴처 ?? '',
                category: v.구분 ?? '',
                midName: v.MID명 ?? '',
                amount: toNum(v.금액),
                agencyFee: toNum(v.에이전시수수료),
                receiveRate: v.__receiveRate,  // 소수
                payRate: v.__payRate,          // 소수
                payFee: v.__payFee,            // 10원 내림
              }));
              downloadJson(draft, 'new-companies-draft.json');
            }}
            title="서버 업로드용 초안(JSON) 저장"
          >
            정산 초안 JSON 저장
          </Button>
        </RightBox>
      </Toolbar>

      <TableWrap>
        <Table>
          <thead>
            <tr>
              {headers.map(h => (
                <Th key={h}>{h}</Th>
              ))}
            </tr>
          </thead>
          <tbody>
            {view.length === 0 ? (
              <tr>
                <Td colSpan={headers.length} style={{ textAlign: 'center', color: '#666' }}>
                  표시할 데이터가 없습니다.
                  <br />localStorage.registerPreview / legacyIndexNos를 확인하세요.
                </Td>
              </tr>
            ) : (
              view.map((row, idx) => (
                <tr key={row.id ?? idx}>
                  {/* INDEX_NO: 읽기 전용 표시 */}
                  <Td mono>
                    <ReadOnlyMono title="index_no">{row.__indexNo}</ReadOnlyMono>
                  </Td>

                  {/* 제휴처: 인라인 편집 */}
                  <Td>
                    <Input
                      value={row.제휴처 ?? ''}
                      placeholder="제휴처 입력"
                      onChange={(e) => updateRow(idx, { 제휴처: e.target.value })}
                    />
                  </Td>

                  {/* 구분: 동적 라벨 옵션 (편집 가능) */}
                  <Td>
                    <Select
                      value={row.구분 ?? ''}
                      onChange={(e) => updateRow(idx, { 구분: e.target.value })}
                    >
                      <option value="" disabled>구분 선택</option>
                      {categoryLabels.map(l => (
                        <option key={l} value={l}>{l}</option>
                      ))}
                    </Select>
                  </Td>

                  {/* MID명: 🔒 읽기전용 */}
                  <Td>
                    <ReadOnly title="읽기전용">{row.MID명 ?? ''}</ReadOnly>
                  </Td>

                  {/* 금액: 🔒 읽기전용 */}
                  <Td mono>
                    <ReadOnlyMono title="읽기전용">
                      {toNum(row.금액).toLocaleString()}
                    </ReadOnlyMono>
                  </Td>

                  {/* 에이전시수수료: 🔒 읽기전용 */}
                  <Td mono>
                    <ReadOnlyMono title="읽기전용">
                      {toNum(row.에이전시수수료).toLocaleString()}
                    </ReadOnlyMono>
                  </Td>

                  {/* 수입수수료 */}
                  <Td mono>{row.__receiveRate.toFixed(6)}</Td>

                  {/* 지급률 */}
                  <Td mono>{row.__payRate.toFixed(6)}</Td>

                  {/* 지급수수료 */}
                  <Td mono>{row.__payFee.toLocaleString()}</Td>
                </tr>
              ))
            )}
          </tbody>
        </Table>
      </TableWrap>

      <RateSettingsModal open={rateModalOpen} onClose={() => setRateModalOpen(false)} />
    </Wrap>
  );
}
