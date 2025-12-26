// src/pages/ExelInsertPage/index.tsx
import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Container, H1, P, Card, Row,
  HiddenFile, Button, LabelButton,
  Badge, Timestamp, AlertOk,
  TableWrap, Table,
} from "./styles";
import { readXlsxInBrowser } from "./utils/xlsx";
const outer_URL = "https://mercury-databases-sat-married.trycloudflare.com";
// const outer_URL = "";
const API_LATEST = outer_URL+"/api/settlements/by-last-inserted-month";
const API_BL_BASE = outer_URL+"/api/blacklist";
const API_BL_LIST = `${API_BL_BASE}/entries?active=1`;
const API_BL_ACT = `${API_BL_BASE}/activate`;
const API_BL_DEACT = `${API_BL_BASE}/deactivate`;
//work start tlwkr walk

type SheetRow = {
  제휴처: string;
  사업자번호: string;
  상호: string;
  MID: string;
  GID: string;
  MID명: string;
  지불수단: string;
  구분: string;
  거래건수: number | null;
  금액: number | null;
  에이전시수수료: number | null;
  [k: string]: any;
};

type CompareResult = {
  matches: SheetRow[];
  onlyInA: SheetRow[];
  onlyInB: SheetRow[];
  totalA: number;
  totalB: number;
};

type BlacklistItem = {
  id: number;
  business_no_raw: string | null;
  merchant_name: string | null;
  mid_raw: string | null;
  gid_raw: string | null;
  pay_method_raw: string | null;
};

const toStr = (v: any) => (v == null ? "" : String(v).trim());
const toBiz = (v: any) => toStr(v).replace(/[^0-9]/g, "");
const stripParen = (s: string) => toStr(s).replace(/\([^)]*\)/g, "").trim();

type Keyable =
  Pick<SheetRow, "사업자번호" | "상호" | "MID" | "GID" | "지불수단">
  & Partial<Pick<SheetRow, "제휴처">>;

function key5(row: Keyable): string {
  const biz = toBiz(row.사업자번호);
  const name = stripParen(row.상호) || "미상";
  const mid = toStr(row.MID).toLowerCase();
  const gid = toStr(row.GID).toLowerCase();
  const payRaw = toStr(row.지불수단);
  const pay = (payRaw === "값없음" ? "" : payRaw).toLowerCase();
  return [biz, name, mid, gid, pay].join("|");
}

// 블랙리스트 비교용 키(지불수단 제외)
const blKey = (row: { 사업자번호?: string; 상호?: string; MID?: string; GID?: string }) => {
  const biz = toBiz(row.사업자번호);
  const name = stripParen(toStr(row.상호) || "미상");
  const mid = toStr(row.MID).toLowerCase();
  const gid = toStr(row.GID).toLowerCase();
  return [biz, name, mid, gid].join("|");
};

const key2 = (row: { 사업자번호?: string; 상호?: string }) => {
  const biz = toBiz(row.사업자번호);
  const name = stripParen(toStr(row.상호) || "미상");
  return `${biz}|${name}`;
};

const numOrNull = (v: any) => {
  const s = toStr(v).replace(/,/g, "");
  if (s === "") return null;
  const n = Number(s);
  return Number.isFinite(n) ? n : null;
};

const normalizeHeader = (h: string) =>
  (h ?? "")
    .toString()
    .replace(/\u00A0/g, " ")
    .replace(/\s+/g, "")
    .replace(/[()]/g, "")
    .replace(/·/g, "")
    .toLowerCase();

const mapUploadRow = (r: any): SheetRow => {
  const m: Record<string, any> = {};
  Object.keys(r || {}).forEach(k => { m[normalizeHeader(k)] = r[k]; });
  return {
    제휴처: toStr(m["제휴처"] ?? m["파트너"] ?? m["제휴처명"]),
    사업자번호: toBiz(m["사업자번호"] ?? m["사업자등록번호"]),
    상호: toStr(m["상호"] ?? m["가맹점명"]) || "미상",
    MID: toStr(m["mid"] ?? m["미드"]),
    GID: toStr(m["gid"]),
    MID명: toStr(m["mid명"] ?? m["미드명"]),
    지불수단: toStr(m["지불수단"]) || "값없음",
    구분: toStr(m["구분"] ?? m["매출액구분"] ?? m["매출구분"]),
    거래건수: numOrNull(m["거래건수"]),
    금액: numOrNull(m["거래금액"] ?? m["금액"]),
    에이전시수수료: numOrNull(
      m["에이전시수수료vat별도"]
      ?? m["에이전시수수료(vat별도)"]
      ?? m["에이전시수수료"]
      ?? m["영업대행수수료"]
      ?? m["agencyfee"]
    ),
  };
};

const mapApiRow = (r: any): SheetRow => ({
  제휴처: toStr(r.partner_name ?? r.partnerName ?? ""),
  사업자번호: toBiz(r.business_no_raw ?? r.business_no ?? r.businessNo ?? ""),
  상호: toStr(r.merchant_name ?? r.merchantName ?? "") || "미상",
  MID: toStr(r.mid_raw ?? r.mid ?? r.midNorm ?? ""),
  GID: toStr(r.gid_raw ?? r.gid ?? ""),
  MID명: toStr(r.mid_name_raw ?? r.midNameRaw ?? ""),
  지불수단: toStr(r.pay_method_raw ?? r.pay_method ?? r.payMethod ?? "") || "값없음",
  구분: toStr(r.grade_raw ?? r.grade ?? ""),
  거래건수: r.txn_count != null ? Number(r.txn_count) : (r.txnCount != null ? Number(r.txnCount) : null),
  금액: r.amount != null ? Number(r.amount) : null,
  에이전시수수료: r.agency_fee != null ? Number(r.agency_fee) : (r.agencyFee != null ? Number(r.agencyFee) : null),
});

// DB(API) 값 우선으로 병합
const preferB = (a: SheetRow, b: SheetRow): SheetRow => ({
  ...a,
  제휴처: (b.제휴처 || a.제휴처) as any,
  구분: (b.구분 || a.구분) as any,
  거래건수: b.거래건수 ?? a.거래건수 ?? null,
  금액: b.금액 ?? a.금액 ?? null,
  에이전시수수료: b.에이전시수수료 ?? a.에이전시수수료 ?? null,
  MID: (b.MID || a.MID) as any,
  GID: (b.GID || a.GID) as any,
  지불수단: (b.지불수단 || a.지불수단) as any,
});

const compareHybrid = (A: SheetRow[], B: SheetRow[]): CompareResult => {
  const mA5 = new Map<string, SheetRow>();
  const mB5 = new Map<string, SheetRow>();
  for (const r of A) mA5.set(key5(r), r);
  for (const r of B) mB5.set(key5(r), r);

  const matches: SheetRow[] = [];
  const onlyInA_init: SheetRow[] = [];
  const onlyInB_init: SheetRow[] = [];

  // 정밀 매칭: DB(API) 값 우선으로 머지
  for (const [_, aRow] of mA5) {
    const bRow = mB5.get(key5(aRow));
    if (bRow) matches.push(preferB(aRow, bRow));
    else onlyInA_init.push(aRow);
  }
  for (const [k, bRow] of mB5) if (!mA5.has(k)) onlyInB_init.push(bRow);

  const apiHasIds =
    B.some(r => toStr(r.MID)) ||
    B.some(r => toStr(r.GID)) ||
    B.some(r => toStr(r.지불수단) && toStr(r.지불수단) !== "값없음");

  if (apiHasIds || onlyInA_init.length === 0 || onlyInB_init.length === 0) {
    return { matches, onlyInA: onlyInA_init, onlyInB: onlyInB_init, totalA: A.length, totalB: B.length };
  }

  // 2차: 완화키(사업자번호+상호)
  const mA2 = new Map<string, SheetRow>();
  const mB2 = new Map<string, SheetRow>();
  for (const r of onlyInA_init) mA2.set(key2(r), r);
  for (const r of onlyInB_init) mB2.set(key2(r), r);

  const resolvedA = new Set<string>();
  const resolvedB = new Set<string>();

  for (const [k, aRow] of mA2) {
    const bRow = mB2.get(k);
    if (bRow) {
      matches.push(preferB(aRow, bRow));
      resolvedA.add(k);
      resolvedB.add(k);
    }
  }

  const onlyInA: SheetRow[] = [];
  const onlyInB: SheetRow[] = [];
  for (const [k, v] of mA2) if (!resolvedA.has(k)) onlyInA.push(v);
  for (const [k, v] of mB2) if (!resolvedB.has(k)) onlyInB.push(v);

  return { matches, onlyInA, onlyInB, totalA: A.length, totalB: B.length };
};

export default function Page() {
  const nav = useNavigate();
  const [file, setFile] = useState<File | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [cmp, setCmp] = useState<CompareResult | null>(null);
  const [apiMeta, setApiMeta] = useState<{ month?: string; total?: number }>({});
  const [apiLoading, setApiLoading] = useState(false);
  const [choice, setChoice] = useState<Record<string, "" | "등록" | "블랙리스트">>({});
  const [blHits, setBlHits] = useState<BlacklistItem[]>([]);
  const [blMsg, setBlMsg] = useState<string>("");

  const onPick = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0] || null;
    setFile(f);
    setCmp(null);
    setError(null);
    setChoice({});
    setBlHits([]);
    setBlMsg("");
  };

  async function fetchBlacklistKeyMap(): Promise<Map<string, BlacklistItem>> {
    const r = await fetch(API_BL_LIST, { headers: { Accept: "application/json" } });
    const ct = r.headers.get("content-type") || "";
    if (!ct.includes("application/json")) {
      const text = await r.text();
      throw new Error(`Non-JSON ${r.status}: ${text.slice(0, 120)}…`);
    }
    const data = await r.json();
    const rows: any[] = Array.isArray(data) ? data : Array.isArray(data.rows) ? data.rows : [];
    const map = new Map<string, BlacklistItem>();
    for (const x of rows) {
      const k = blKey({
        사업자번호: toBiz(x.business_no_raw ?? x.business_no ?? ""),
        상호: stripParen(x.merchant_name ?? x.merchantName ?? "") || "미상",
        MID: toStr(x.mid_raw ?? x.midNorm ?? x.mid ?? ""),
        GID: toStr(x.gid_raw ?? x.gid ?? ""),
      });
      map.set(k, {
        id: Number(x.id ?? 0),
        business_no_raw: x.business_no_raw ?? x.business_no ?? null,
        merchant_name: x.merchant_name ?? x.merchantName ?? null,
        mid_raw: x.mid_raw ?? x.midNorm ?? x.mid ?? null,
        gid_raw: x.gid_raw ?? x.gid ?? null,
        pay_method_raw: x.pay_method_raw ?? x.payMethod ?? null,
      });
    }
    return map;
  }

  const onSecondCheck = async () => {
    if (!file) { setError("대상 엑셀 파일을 먼저 선택하세요."); return; }
    try {
      setIsLoading(true);
      setApiLoading(true);
      setError(null);
      setCmp(null);
      setChoice({});
      setBlHits([]);
      setBlMsg("");

      const { rows: upRows0 } = await readXlsxInBrowser(file);
      const upRows = (upRows0 as any[]).map(mapUploadRow).filter(r => r.사업자번호);

      const res = await fetch(API_LATEST, { headers: { Accept: "application/json" } });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      const month = String(data.lastInsertedMonth || data.latestMonth || "");
      const apiRows0: any[] = Array.isArray(data.rows) ? data.rows : [];
      const apiRows = apiRows0.map(mapApiRow).filter(r => r.사업자번호);
      setApiMeta({ month, total: apiRows.length });

      const out = compareHybrid(upRows, apiRows);
      const blMap = await fetchBlacklistKeyMap();

      const onlyInA = out.onlyInA || [];
      const review: SheetRow[] = [];
      const hits: BlacklistItem[] = [];
      for (const r of onlyInA) {
        const k5 = key5(r);
        const kb = blKey(r); // 지불수단 제외 키
        const h = blMap.get(kb) || blMap.get(k5);
        if (h) hits.push(h);
        else review.push({ ...r, 상호: stripParen(r["상호"]) || "미상", 구분: toStr(r["구분"]) });
      }

      const sortByNameOnly = (a: SheetRow, b: SheetRow) =>
        stripParen(a.상호).localeCompare(stripParen(b.상호));

      const matchesSorted = [...out.matches].sort(sortByNameOnly);
      const reviewSorted = [...review].sort(sortByNameOnly);

      setCmp({ ...out, matches: matchesSorted, onlyInA: reviewSorted });
      setBlHits(hits);
    } catch (e: any) {
      setError(e?.message || String(e));
    } finally {
      setIsLoading(false);
      setApiLoading(false);
    }
  };
//d
  const reviewRows = useMemo<SheetRow[]>(() => (!cmp ? [] : cmp.onlyInA), [cmp]);

  const counts = useMemo(() => {
    const c = { 공백: 0, 등록: 0, 블랙리스트: 0 };
    for (const row of reviewRows) {
      const k = key5(row);
      const v = choice[k] ?? "";
      if (v === "등록") c.등록++;
      else if (v === "블랙리스트") c.블랙리스트++;
      else c.공백++;
    }
    return c;
  }, [reviewRows, choice]);

  const onChangeChoice = (k: string, v: "" | "등록" | "블랙리스트") => {
    setChoice(prev => ({ ...prev, [k]: v }));
  };

  const onToggleBlacklist = async (id: number, toActive: boolean) => {
    try {
      setBlMsg("");
      const url = toActive ? API_BL_ACT : API_BL_DEACT;
      const r = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      });
      const ok = r.ok;
      const body = await r.json().catch(() => ({}));
      setBlMsg(ok ? "OK" : String(body?.message || body?.error || "FAIL"));
    } catch (e: any) {
      setBlMsg(String(e?.message || e));
    }
  };

  const onGoRegister = () => {
    if (!cmp) return;
    const selectedRegs = reviewRows.filter(r => (choice[key5(r)] ?? "") === "등록");
    const m = new Map<string, SheetRow>();
    for (const r of (cmp.matches || [])) m.set(key5(r), r);
    for (const r of selectedRegs) m.set(key5(r), r);
    const list = Array.from(m.values());
    localStorage.setItem("registerPreview", JSON.stringify(list));
    nav("/new-companies");
  };
//  <P>엑셀과 최신 원본을 비교해 신규만 추립니다. 블랙리스트와 겹치는 항목은 아래에 분리됩니다.</P> 분리
  return (
    <Container>
      <H1>정산 엑셀 업로드 · 2차검사</H1>
     

      <Card>
        <Row style={{ gap: 12, flexWrap: "wrap" }}>
          <HiddenFile id="file" type="file" accept=".xlsx,.xls" onChange={onPick} />
          <LabelButton htmlFor="file">대상 파일 선택</LabelButton>
          <Button onClick={onSecondCheck} disabled={!file || isLoading}>{apiLoading ? "2차검사 중..." : "2차검사(API↔엑셀)"}</Button>
          {apiMeta.month ? <Badge>{`원본월: ${apiMeta.month} / ${apiMeta.total ?? 0}건`}</Badge> : null}
          {file ? <Badge>{`선택: ${file.name}`}</Badge> : null}
          <Badge>{`검토: 총 ${reviewRows.length}건 / 등록 ${counts.등록}건 / 블랙리스트 ${counts.블랙리스트}건 / 미선택 ${counts.공백}건`}</Badge>
          <Timestamp>{new Date().toLocaleString()}</Timestamp>
        </Row>
        {error ? <AlertOk>에러: {error}</AlertOk> : null}
      </Card>

      {reviewRows.length ? (
        <Card>
          <H1>검토항목(엑셀에만 있는 건)</H1>
          <TableWrap>
            <Table>
              <thead>
                <tr>
                  <th style={{ width: 140 }}>선택</th>
                  <th>사업자번호</th>
                  <th>상호(괄호 제거)</th>
                  <th>MID</th>
                  <th>GID</th>
                  <th>지불수단</th>
                  <th>거래건수</th>
                  <th>금액</th>
                  <th>에이전시 수수료(VAT별도)</th>
                </tr>
              </thead>
              <tbody>
                {reviewRows.slice(0, 2000).map((r, i) => {
                  const k = key5(r);
                  const v = choice[k] ?? "";
                  return (
                    <tr key={i}>
                      <td>
                        <select
                          value={v}
                          onChange={(e) => onChangeChoice(k, e.target.value as "" | "등록" | "블랙리스트")}
                          style={{ padding: "4px 8px", borderRadius: 8 }}
                        >
                          <option value=""> </option>
                          <option value="등록">등록</option>
                          <option value="블랙리스트">블랙리스트</option>
                        </select>
                      </td>
                      <td>{r["사업자번호"]}</td>
                      <td>{stripParen(r["상호"]) || "미상"}</td>
                      <td>{r["MID"]}</td>
                      <td>{r["GID"]}</td>
                      <td>{r["지불수단"]}</td>
                      <td>{r["거래건수"] ?? ""}</td>
                      <td>{r["금액"] ?? ""}</td>
                      <td>{r["에이전시수수료"] ?? ""}</td>
                    </tr>
                  );
                })}
              </tbody>
            </Table>
          </TableWrap>
          <Row style={{ justifyContent: "flex-end", gap: 8, marginTop: 8 }}>
            <Button onClick={onGoRegister} disabled={!cmp}>등록으로 이동</Button>
          </Row>
        </Card>
      ) : null}

      <Card>
        <Row style={{ justifyContent: "space-between", alignItems: "center" }}>
          <H1>블랙리스트 항목(엑셀과 겹치는 건)</H1>
          <Row style={{ gap: 8 }}>
            <Badge>{`${blHits.length}건`}</Badge>
          </Row>
        </Row>
        <TableWrap>
          <Table>
            <thead>
              <tr>
                <th style={{ width: 120 }}>토글</th>
                <th>ID</th>
                <th>사업자번호</th>
                <th>상호</th>
                <th>MID</th>
                <th>GID</th>
                <th>지불수단</th>
              </tr>
            </thead>
            <tbody>
              {blHits.slice(0, 2000).map((b, i) => (
                <tr key={i}>
                  <td>
                    <Row style={{ gap: 6 }}>
                      <Button onClick={() => onToggleBlacklist(b.id, false)}>해제</Button>
                      <Button onClick={() => onToggleBlacklist(b.id, true)}>유지</Button>
                    </Row>
                  </td>
                  <td>{b.id}</td>
                  <td>{b.business_no_raw}</td>
                  <td>{b.merchant_name}</td>
                  <td>{b.mid_raw}</td>
                  <td>{b.gid_raw}</td>
                  <td>{b.pay_method_raw ?? "값없음"}</td>
                </tr>
              ))}
            </tbody>
          </Table>
        </TableWrap>
        {blMsg ? <AlertOk>{blMsg}</AlertOk> : null}
      </Card>
    </Container>
  );
}
