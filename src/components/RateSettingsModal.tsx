import { useEffect, useMemo, useState } from 'react';
import styled from 'styled-components';
import {useRateRules} from '../rates/useRateRules'; // default import도 동작하도록 맞추세요
import type { CategoryDef } from '../rates/rateRules';

/* -------- 타입가드 -------- */
const isSetCategoryEffect = (eff: any): eff is { type: 'setCategory'; categoryId: string } =>
  eff?.type === 'setCategory' && 'categoryId' in eff;
const isSetPayRateEffect = (eff: any): eff is { type: 'setPayRate'; value: number } =>
  eff?.type === 'setPayRate' && 'value' in eff;

/* -------- 유틸 -------- */
const toPctStr = (decimal: number) => (decimal * 100).toString();
const toDecimal = (pctStr: string) => {
  const n = Number(pctStr);
  return Number.isFinite(n) ? n / 100 : 0;
};

type Props = { open: boolean; onClose: () => void };

export default function RateSettingsModal({ open, onClose }: Props) {
  // ✅ 훅은 항상 호출
  const rate = useRateRules();
  const { snapshot } = rate;

  const [localCats, setLocalCats] = useState<CategoryDef[]>(snapshot.categories);
  const [tab, setTab] = useState<'categories' | 'rules'>('categories');

  useEffect(() => {
    if (open) {
      setLocalCats(snapshot.categories);
      setTab('categories');
    }
  }, [open, snapshot.categories]);

  const sortedRules = useMemo(
    () => [...snapshot.rules].sort((a, b) => a.priority - b.priority),
    [snapshot.rules]
  );

  const firstCatId = snapshot.categories[0]?.id ?? '';

  const handleSaveCats = () => {
    const old = snapshot.categories;
    // 삭제
    old.forEach(c => {
      if (!localCats.find(x => x.id === c.id)) rate.removeCategory(c.id);
    });
    // 업데이트/추가
    localCats.forEach(c => {
      const prev = old.find(x => x.id === c.id);
      if (!prev) rate.addCategory(c.label, c.rate);
      else if (prev.label !== c.label || prev.rate !== c.rate) {
        rate.updateCategory(c.id, { label: c.label, rate: c.rate });
      }
    });
  };

  // ✅ JSX에서 조건부 렌더
  return (
    <>
      {open && (
        <Backdrop onClick={onClose}>
          <Modal onClick={(e) => e.stopPropagation()}>
            <Header>
              <Title>지급률/규칙 설정</Title>
              <Tabs>
                <TabButton $active={tab === 'categories'} onClick={() => setTab('categories')}>구분(카테고리)</TabButton>
                <TabButton $active={tab === 'rules'} onClick={() => setTab('rules')}>규칙(우선순위)</TabButton>
              </Tabs>
            </Header>

            <Body>
              {tab === 'categories' && (
                <section>
                  <SectionTitle>카테고리 목록</SectionTitle>
                  <Small>라벨/지급률(%) 수정, 행 추가·삭제 가능. 저장 시 Select 옵션에 즉시 반영됩니다.</Small>
                  <Table>
                    <thead>
                      <tr><Th>라벨</Th><Th>지급률(%)</Th><Th style={{width:96}} /></tr>
                    </thead>
                    <tbody>
                      {localCats.map((c, i) => (
                        <tr key={c.id}>
                          <Td>
                            <Input
                              value={c.label}
                              onChange={(e) =>
                                setLocalCats(v => {
                                  const a = [...v]; a[i] = { ...a[i], label: e.target.value }; return a;
                                })
                              }
                            />
                          </Td>
                          <Td>
                            <Input
                              type="number"
                              step="0.01"
                              value={toPctStr(c.rate)}
                              onChange={(e) =>
                                setLocalCats(v => {
                                  const a = [...v]; a[i] = { ...a[i], rate: toDecimal(e.target.value) }; return a;
                                })
                              }
                            />
                          </Td>
                          <Td>
                            <SButton $variant="danger" onClick={() => setLocalCats(v => v.filter((_, j) => j !== i))}>삭제</SButton>
                          </Td>
                        </tr>
                      ))}
                    </tbody>
                  </Table>
                  <SButton
                    $variant="ghost"
                    onClick={() =>
                      setLocalCats(v => [
                        ...v,
                        { id: `tmp-${Math.random().toString(36).slice(2, 7)}`, label: '새 구분', rate: 0.001 },
                      ])
                    }
                  >
                    + 구분 추가
                  </SButton>
                </section>
              )}

              {tab === 'rules' && (
                <section>
                  <SectionTitle>규칙 목록 (우선순위 오름차순 평가, 첫 매칭 1개 적용)</SectionTitle>
                  <Small>컨디션은 AND 조합. 예: [금액 {'>'}= 500000] & [MID명 contains _분담무이자]</Small>

                  {sortedRules.map(r => (
                    <RuleCard key={r.id}>
                      <Row>
                        <label>ON</label>
                        <input
                          type="checkbox"
                          checked={r.enabled}
                          onChange={(e) => rate.updateRule(r.id, { enabled: e.target.checked })}
                        />
                        <label style={{ marginLeft: 12 }}>이름</label>
                        <Input
                          value={r.name}
                          onChange={(e) => rate.updateRule(r.id, { name: e.target.value })}
                        />
                        <label style={{ marginLeft: 12 }}>우선순위</label>
                        <Input
                          type="number"
                          value={r.priority}
                          onChange={(e) => rate.updateRule(r.id, { priority: Number(e.target.value) })}
                          style={{ width: 100 }}
                        />
                        <SButton $variant="danger" style={{ marginLeft: 'auto' }} onClick={() => rate.removeRule(r.id)}>삭제</SButton>
                      </Row>

                      <Row>
                        <label>효과</label>
                        <select
                          value={isSetPayRateEffect(r.effect) ? 'setPayRate' : 'setCategory'}
                          onChange={(e) => {
                            const t = e.target.value as 'setPayRate' | 'setCategory';
                            if (t === 'setPayRate') {
                              rate.updateRule(r.id, { effect: { type: 'setPayRate', value: 0.0008 } });
                            } else {
                              rate.updateRule(r.id, { effect: { type: 'setCategory', categoryId: firstCatId } });
                            }
                          }}
                        >
                          <option value="setPayRate">setPayRate</option>
                          <option value="setCategory">setCategory</option>
                        </select>

                        {isSetPayRateEffect(r.effect) ? (
                          <>
                            <label style={{ marginLeft: 12 }}>rate(소수)</label>
                            <Input
                              type="number"
                              step="0.0001"
                              value={r.effect.value}
                              onChange={(e) =>
                                rate.updateRule(r.id, { effect: { type: 'setPayRate', value: Number(e.target.value) || 0 } })
                              }
                              style={{ width: 140 }}
                            />
                          </>
                        ) : (
                          <>
                            <label style={{ marginLeft: 12 }}>category</label>
                            <select
                              value={isSetCategoryEffect(r.effect) ? r.effect.categoryId : firstCatId}
                              onChange={(e) =>
                                rate.updateRule(r.id, { effect: { type: 'setCategory', categoryId: e.target.value } })
                              }
                            >
                              {snapshot.categories.map(c => (
                                <option key={c.id} value={c.id}>{c.label}</option>
                              ))}
                            </select>
                          </>
                        )}
                      </Row>

                      <CondList>
                        <label>조건(AND)</label>
                        {r.conditions.map((c, i) => (
                          <CondRow key={i}>
                            <select
                              value={c.field}
                              onChange={(e) =>
                                rate.updateRule(r.id, {
                                  conditions: r.conditions.map((cc, j) => (j === i ? { ...cc, field: e.target.value as any } : cc)),
                                })
                              }
                            >
                              {(['MID명','금액','에이전시수수료','구분인덱스','사업자번호','MID','GID'] as const).map(f => (
                                <option key={f} value={f}>{f}</option>
                              ))}
                            </select>

                            <select
                              value={c.op}
                              onChange={(e) =>
                                rate.updateRule(r.id, {
                                  conditions: r.conditions.map((cc, j) => (j === i ? { ...cc, op: e.target.value as any } : cc)),
                                })
                              }
                            >
                              {['contains','not_contains','==','!=','>','>=','<','<=','in','not_in','is_empty','not_empty'].map(op => (
                                <option key={op} value={op}>{op}</option>
                              ))}
                            </select>

                            {c.op === 'is_empty' || c.op === 'not_empty' ? (
                              <span style={{ color: '#777' }}>—</span>
                            ) : c.op === 'in' || c.op === 'not_in' ? (
                              <Input
                                placeholder="A,B,C"
                                value={Array.isArray(c.value) ? c.value.join(',') : (c.value ?? '')}
                                onChange={(e) =>
                                  rate.updateRule(r.id, {
                                    conditions: r.conditions.map((cc, j) =>
                                      j === i ? { ...cc, value: e.target.value.split(',').map(s => s.trim()) } : cc
                                    ),
                                  })
                                }
                                style={{ width: 220 }}
                              />
                            ) : (
                              <Input
                                placeholder="값"
                                value={c.value ?? ''}
                                onChange={(e) =>
                                  rate.updateRule(r.id, {
                                    conditions: r.conditions.map((cc, j) =>
                                      j === i ? { ...cc, value: e.target.value } : cc
                                    ),
                                  })
                                }
                                style={{ width: 220 }}
                              />
                            )}

                            <SButton
                              $variant="danger"
                              onClick={() =>
                                rate.updateRule(r.id, { conditions: r.conditions.filter((_, j) => j !== i) })
                              }
                            >
                              - 조건
                            </SButton>
                          </CondRow>
                        ))}

                        <SButton
                          $variant="ghost"
                          onClick={() =>
                            rate.updateRule(r.id, { conditions: [...r.conditions, { field: '금액', op: '>=', value: 0 }] })
                          }
                        >
                          + 조건
                        </SButton>
                      </CondList>
                    </RuleCard>
                  ))}

                  <SButton
                    $variant="ghost"
                    onClick={() =>
                      rate.addRule({
                        name: '새 규칙',
                        priority: (sortedRules.slice(-1)[0]?.priority ?? 50) + 10,
                        enabled: true,
                        conditions: [{ field: 'MID명', op: 'contains', value: '' }],
                        effect: { type: 'setPayRate', value: 0.0008 },
                      })
                    }
                  >
                    + 규칙 추가
                  </SButton>
                </section>
              )}
            </Body>

            <Footer>
              {tab === 'categories' && (
                <SButton $variant="primary" onClick={handleSaveCats}>카테고리 저장</SButton>
              )}
              <SButton $variant="ghost" onClick={onClose}>닫기</SButton>
            </Footer>
          </Modal>
        </Backdrop>
      )}
    </>
  );
}

/* ------- styles (variant/active는 transient prop으로) ------- */
const Backdrop = styled.div`
  position: fixed; inset: 0; background: rgba(0,0,0,0.4);
  display: flex; align-items: center; justify-content: center; z-index: 1000;
`;
const Modal = styled.div`
  width: 900px; max-width: 96vw; background: #fff; border-radius: 16px;
  box-shadow: 0 10px 30px rgba(0,0,0,0.2); overflow: hidden;
`;
const Header = styled.div`
  padding: 16px 20px; border-bottom: 1px solid #eee;
  display: flex; align-items: center; justify-content: space-between; gap: 12px;
`;
const Title = styled.div` font-weight: 800; font-size: 18px; `;
const Tabs = styled.div` display: flex; gap: 8px; `;
const TabButton = styled.button<{ $active?: boolean }>`
  padding: 6px 10px; border-radius: 8px; border: 1px solid #ddd; cursor: pointer;
  ${({ $active }) => $active ? 'background:#111;color:#fff;border-color:#111;' : 'background:#fff;color:#111;'}
`;
const Body = styled.div` padding: 16px 20px; display: grid; gap: 20px; `;
const SectionTitle = styled.div` font-weight: 700; `;
const Small = styled.div` font-size: 12px; color: #666; `;
const Table = styled.table`
  width: 100%; border-collapse: collapse; font-size: 14px;
  th,td{ border-bottom:1px solid #f0f0f0; padding:10px; text-align:left; }
  th{ background:#fafafa; font-weight:600; }
`;
const Th = styled.th``;
const Td = styled.td``;
const Input = styled.input`
  padding: 6px 8px; border:1px solid #ddd; border-radius:8px; font-size:14px;
`;
const SButton = styled.button<{ $variant?: 'primary' | 'ghost' | 'danger' }>`
  padding: 8px 12px; border-radius: 10px; border: 1px solid transparent; cursor: pointer; font-weight: 600;
  ${({ $variant }) => $variant === 'primary' && `background:#111; color:#fff;`}
  ${({ $variant }) => $variant === 'ghost'   && `background:#fff; color:#111; border-color:#ddd;`}
  ${({ $variant }) => $variant === 'danger'  && `background:#fff0f0; color:#c00; border-color:#f3c2c2;`}
`;
const Row = styled.div` display:flex; align-items:center; gap:8px; flex-wrap:wrap; `;
const CondList = styled.div` display:grid; gap:8px; margin-top:8px; `;
const CondRow = styled.div` display:flex; gap:8px; align-items:center; `;
const RuleCard = styled.div` border:1px solid #eee; border-radius:12px; padding:12px; `;
const Footer = styled.div`
  padding: 14px 20px; border-top: 1px solid #eee; display: flex; gap: 8px; justify-content: flex-end;
`;
