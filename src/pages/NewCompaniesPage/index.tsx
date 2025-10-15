// src/pages/NewCompaniesPage/index.tsx
import { useEffect, useMemo, useState } from 'react';
import RateSettingsModal from '../../components/RateSettingsModal';
import { useRateRules } from '../../rates/useRateRules';
import {
  Wrap,
  Toolbar,
  Title,
  RightBox,
  Button,
  TableWrap,
  Table,
  Th,
  Td,
  Input,
  Select,
} from './styles';

/** 10원 단위 내림 */
const floorTo10 = (v: number) => (Number.isFinite(v) ? Math.floor(v / 10) * 10 : 0);

/** 화면에서 다루는 행 스키마(필요 필드만) */
type Row = {
  id?: string | number;
  제휴처?: string;
  구분?: string; // 셀렉트에서 선택한 카테고리 라벨이 들어옵니다.
  MID명?: string | null;
  금액?: number | string | null;
  에이전시수수료?: number | string | null;
  // 필요 시 다른 컬럼들 자유롭게 추가 가능
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

  /** rows 변경 시 원하면 동기화 (옵션)
  useEffect(() => {
    localStorage.setItem(PREVIEW_KEY, JSON.stringify(rows));
  }, [rows]);
  */

  /** 행 업데이트 유틸 */
  const updateRow = (index: number, patch: Partial<Row>) => {
    setRows(prev => {
      const next = [...prev];
      next[index] = { ...next[index], ...patch };
      return next;
    });
  };

  /** 계산 컬럼 포함된 뷰 모델 */
  const view = useMemo(() => {
    return rows.map((r) => {
      // v2 평가기: (row 전체, 선택된 구분 라벨) → 최종 지급률(소수)
      const payRate = evaluatePayRate(r as any, r.구분 ?? '');
      const amount = toNum(r.금액);
      const payFee = floorTo10(amount * payRate);
      const receiveRate = calcReceiveRate(r); // 에이전시수수료/금액

      return {
        ...r,
        __payRate: payRate,         // 지급률(소수)
        __payFee: payFee,           // 지급수수료(10원 내림)
        __receiveRate: receiveRate, // 수입수수료(소수)
      };
    });
  }, [rows, evaluatePayRate]);

  /** 표 머리글 정의 */
  const headers = [
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
              // 서버 업로드용 초안(JSON) 예시 — 필요시 키명을 백엔드 스키마에 맞춰 수정
              const draft = view.map(v => ({
                partner: v.제휴처 ?? '',
                category: v.구분 ?? '',
                midName: v.MID명 ?? '',
                amount: toNum(v.금액),
                agencyFee: toNum(v.에이전시수수료),
                receiveRate: v.__receiveRate, // 소수
                payRate: v.__payRate,         // 소수
                payFee: v.__payFee,           // 10원 내림
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
                  표시할 데이터가 없습니다. (localStorage.registerPreview를 확인하세요)
                </Td>
              </tr>
            ) : (
              view.map((row, idx) => (
                <tr key={row.id ?? idx}>
                  {/* 제휴처: 인라인 편집 */}
                  <Td>
                    <Input
                      value={row.제휴처 ?? ''}
                      placeholder="제휴처 입력"
                      onChange={(e) => updateRow(idx, { 제휴처: e.target.value })}
                    />
                  </Td>

                  {/* 구분: 동적 라벨 옵션 */}
                  <Td>
                    <Select
                      value={row.구분 ?? ''}
                      onChange={(e) => updateRow(idx, { 구분: e.target.value })}
                    >
                      <option value="" disabled>
                        구분 선택
                      </option>
                      {categoryLabels.map(l => (
                        <option key={l} value={l}>
                          {l}
                        </option>
                      ))}
                    </Select>
                  </Td>

                  {/* MID명: 편집 허용 */}
                  <Td>
                    <Input
                      value={row.MID명 ?? ''}
                      placeholder="MID명"
                      onChange={(e) => updateRow(idx, { MID명: e.target.value })}
                    />
                  </Td>

                  {/* 금액: 숫자 입력 */}
                  <Td>
                    <Input
                      type="number"
                      inputMode="numeric"
                      value={toNum(row.금액)}
                      onChange={(e) => updateRow(idx, { 금액: Number(e.target.value) })}
                    />
                  </Td>

                  {/* 에이전시수수료: 숫자 입력 */}
                  <Td>
                    <Input
                      type="number"
                      inputMode="numeric"
                      value={toNum(row.에이전시수수료)}
                      onChange={(e) => updateRow(idx, { 에이전시수수료: Number(e.target.value) })}
                    />
                  </Td>

                  {/* 수입수수료(receive rate): 표시(소수) */}
                  <Td mono>{row.__receiveRate.toFixed(6)}</Td>

                  {/* 지급률(pay rate): 표시(소수) — 우선순위 규칙 적용 결과 */}
                  <Td mono>{row.__payRate.toFixed(6)}</Td>

                  {/* 지급수수료(pay fee): 표시(정수, 10원 단위 내림) */}
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
