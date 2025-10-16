import { useEffect, useMemo, useState } from 'react';
import { useRateRules } from '../rates/useRateRules'; // default import도 동작하도록 맞추세요
import type { CategoryDef, Rule } from '../rates/rateRules';
import {
  Backdrop,
  Modal,
  Header,
  Title,
  Tabs,
  TabButton,
  Body,
  SectionTitle,
  Small,
  Table,
  Th,
  Td,
  Input,
  SButton,
  Row,
  CondList,
  CondRow,
  RuleCard,
  Footer,
} from './styles';

/* -------- 타입가드 2-------- */
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

  // ---- 로컬 편집본 (저장 버튼을 누를 때만 반영) ----
  const [localCats, setLocalCats] = useState<CategoryDef[]>(snapshot.categories);
  const [localRules, setLocalRules] = useState<Rule[]>(snapshot.rules);

  const [tab, setTab] = useState<'categories' | 'rules'>('categories');

  useEffect(() => {
    if (open) {
      setLocalCats(snapshot.categories);
      setLocalRules(snapshot.rules);
      setTab('categories');
    }
  }, [open, snapshot.categories, snapshot.rules]);

  const sortedRules = useMemo(
    () => [...localRules].sort((a, b) => a.priority - b.priority),
    [localRules]
  );

  const firstCatId = snapshot.categories[0]?.id ?? '';

  /* ---------------- 저장 로직 ---------------- */

  // 카테고리 저장(일괄 반영)
  const handleSaveCats = () => {
    const old = snapshot.categories;

    // 삭제
    old.forEach(c => {
      if (!localCats.find(x => x.id === c.id)) rate.removeCategory(c.id);
    });

    // 추가/수정
    localCats.forEach(c => {
      const prev = old.find(x => x.id === c.id);
      if (!prev) {
        rate.addCategory(c.label, c.rate);
      } else if (prev.label !== c.label || prev.rate !== c.rate) {
        rate.updateCategory(c.id, { label: c.label, rate: c.rate });
      }
    });
  };

  // 규칙 저장(일괄 반영)
  const handleSaveRules = () => {
    const old = snapshot.rules;

    // 삭제
    old.forEach(r => {
      if (!localRules.find(x => x.id === r.id)) rate.removeRule(r.id);
    });

    // 추가/수정
    localRules.forEach(r => {
      const prev = old.find(x => x.id === r.id);
      if (!prev) {
        // 추가
        rate.addRule({
          name: r.name,
          priority: r.priority,
          enabled: r.enabled,
          conditions: r.conditions,
          effect: r.effect as any,
        });
      } else {
        // 변경 여부 간단 비교(깊은 비교는 필요 시 확장)
        const changed =
          prev.name !== r.name ||
          prev.priority !== r.priority ||
          prev.enabled !== r.enabled ||
          JSON.stringify(prev.conditions) !== JSON.stringify(r.conditions) ||
          JSON.stringify(prev.effect) !== JSON.stringify(r.effect);

        if (changed) {
          rate.updateRule(r.id, {
            name: r.name,
            priority: r.priority,
            enabled: r.enabled,
            conditions: r.conditions,
            effect: r.effect as any,
          });
        }
      }
    });
  };

  // 탭에 따라 따로 저장하거나, 한 번에 저장하고 닫기
  // const handleSaveAndClose = () => {
  //   if (tab === 'categories') {
  //     handleSaveCats();
  //   } else {
  //     handleSaveRules();
  //   }
  //   onClose();
  // };

  /* ---------------- 렌더 ---------------- */

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

            {/* ✅ 내부 스크롤: Body만 overflow로 */}
            <Body>
              {tab === 'categories' && (
                <section>
                  <SectionTitle>카테고리 목록</SectionTitle>
                  <Small>라벨/지급률(%) 수정, 행 추가·삭제 후 <b>저장</b>을 눌러 반영됩니다.</Small>
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
                  <Small>컨디션은 AND 조합. 예: [금액 {'>'}= 500000] & [MID명 contains _분담무이자]. <b>저장</b>을 눌러야 반영됩니다.</Small>

                  {sortedRules.map((r, idx) => (
                    <RuleCard key={r.id ?? idx}>
                      <Row>
                        <label>ON</label>
                        <input
                          type="checkbox"
                          checked={r.enabled}
                          onChange={(e) =>
                            setLocalRules(list =>
                              list.map(x => x.id === r.id ? { ...x, enabled: e.target.checked } : x)
                            )
                          }
                        />
                        <label style={{ marginLeft: 12 }}>이름</label>
                        <Input
                          value={r.name}
                          onChange={(e) =>
                            setLocalRules(list =>
                              list.map(x => x.id === r.id ? { ...x, name: e.target.value } : x)
                            )
                          }
                        />
                        <label style={{ marginLeft: 12 }}>우선순위</label>
                        <Input
                          type="number"
                          value={r.priority}
                          onChange={(e) =>
                            setLocalRules(list =>
                              list.map(x => x.id === r.id ? { ...x, priority: Number(e.target.value) || 0 } : x)
                            )
                          }
                          style={{ width: 100 }}
                        />
                        <SButton
                          $variant="danger"
                          style={{ marginLeft: 'auto' }}
                          onClick={() => setLocalRules(list => list.filter(x => x.id !== r.id))}
                        >
                          삭제
                        </SButton>
                      </Row>

                      <Row>
                        <label>효과</label>
                        <select
                          value={isSetPayRateEffect(r.effect) ? 'setPayRate' : 'setCategory'}
                          onChange={(e) => {
                            const t = e.target.value as 'setPayRate' | 'setCategory';
                            setLocalRules(list =>
                              list.map(x => x.id === r.id
                                ? (t === 'setPayRate'
                                    ? { ...x, effect: { type: 'setPayRate', value: 0.0008 } as any }
                                    : { ...x, effect: { type: 'setCategory', categoryId: firstCatId } as any })
                                : x
                              )
                            );
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
                                setLocalRules(list =>
                                  list.map(x => x.id === r.id
                                    ? { ...x, effect: { type: 'setPayRate', value: Number(e.target.value) || 0 } as any }
                                    : x
                                  )
                                )
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
                                setLocalRules(list =>
                                  list.map(x => x.id === r.id
                                    ? { ...x, effect: { type: 'setCategory', categoryId: e.target.value } as any }
                                    : x
                                  )
                                )
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
                          <CondRow key={`${r.id}-cond-${i}`}>
                            <select
                              value={c.field as any}
                              onChange={(e) =>
                                setLocalRules(list =>
                                  list.map(x => x.id === r.id
                                    ? {
                                        ...x,
                                        conditions: x.conditions.map((cc, j) =>
                                          j === i ? { ...cc, field: e.target.value as any } : cc
                                        ),
                                      }
                                    : x
                                  )
                                )
                              }
                            >
                              {(['MID명','금액','에이전시수수료','구분인덱스','사업자번호','MID','GID'] as const).map(f => (
                                <option key={f} value={f}>{f}</option>
                              ))}
                            </select>

                            <select
                              value={c.op as any}
                              onChange={(e) =>
                                setLocalRules(list =>
                                  list.map(x => x.id === r.id
                                    ? {
                                        ...x,
                                        conditions: x.conditions.map((cc, j) =>
                                          j === i ? { ...cc, op: e.target.value as any } : cc
                                        ),
                                      }
                                    : x
                                  )
                                )
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
                                  setLocalRules(list =>
                                    list.map(x => x.id === r.id
                                      ? {
                                          ...x,
                                          conditions: x.conditions.map((cc, j) =>
                                            j === i ? { ...cc, value: e.target.value.split(',').map(s => s.trim()) } : cc
                                          ),
                                        }
                                      : x
                                    )
                                  )
                                }
                                style={{ width: 220 }}
                              />
                            ) : (
                              <Input
                                placeholder="값"
                                value={c.value ?? ''}
                                onChange={(e) =>
                                  setLocalRules(list =>
                                    list.map(x => x.id === r.id
                                      ? {
                                          ...x,
                                          conditions: x.conditions.map((cc, j) =>
                                            j === i ? { ...cc, value: e.target.value } : cc
                                          ),
                                        }
                                      : x
                                    )
                                  )
                                }
                                style={{ width: 220 }}
                              />
                            )}

                            <SButton
                              $variant="danger"
                              onClick={() =>
                                setLocalRules(list =>
                                  list.map(x => x.id === r.id
                                    ? { ...x, conditions: x.conditions.filter((_, j) => j !== i) }
                                    : x
                                  )
                                )
                              }
                            >
                              - 조건
                            </SButton>
                          </CondRow>
                        ))}

                        <SButton
                          $variant="ghost"
                          onClick={() =>
                            setLocalRules(list =>
                              list.map(x => x.id === r.id
                                ? { ...x, conditions: [...x.conditions, { field: '금액' as any, op: '>=' as any, value: 0 }] }
                                : x
                              )
                            )
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
                      setLocalRules(prev => [
                        ...prev,
                        {
                          id: `rule-${Math.random().toString(36).slice(2, 8)}`,
                          name: '새 규칙',
                          priority: (sortedRules.slice(-1)[0]?.priority ?? 50) + 10,
                          enabled: true,
                          conditions: [{ field: 'MID명' as any, op: 'contains' as any, value: '' }],
                          effect: { type: 'setPayRate', value: 0.0008 } as any,
                          payRate: 0, // (구형 구조 호환용 값이 있으면 유지/무시)
                        } as Rule,
                      ])
                    }
                  >
                    + 규칙 추가
                  </SButton>
                </section>
              )}
            </Body>

            {/* ✅ 푸터 고정 + 저장 버튼 (현재 탭만 저장) */}
            <Footer>
              {tab === 'categories' && (
                <SButton $variant="primary" onClick={handleSaveCats}>카테고리 저장</SButton>
              )}
              {tab === 'rules' && (
                <SButton $variant="primary" onClick={handleSaveRules}>규칙 저장</SButton>
              )}
              <SButton $variant="ghost" onClick={onClose}>닫기</SButton>
            </Footer>
          </Modal>
        </Backdrop>
      )}
    </>
  );
}
