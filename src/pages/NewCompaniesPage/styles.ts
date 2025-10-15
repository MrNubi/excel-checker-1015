import styled, { css } from "styled-components";

/** Layout */
export const Container = styled.div`
  max-width: 1000px;
  margin: 0 auto;
  padding: 32px 16px;
`;

export const H1 = styled.h1`
  font-size: 22px;
  font-weight: 700;
  margin: 0 0 8px;
`;

export const P = styled.p`
  font-size: 13px;
  color: ${({ theme }) => theme.colors.muted};
  margin: 0 0 16px;
`;

export const Card = styled.div`
  background: ${({ theme }) => theme.colors.card};
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: ${({ theme }) => theme.radius.lg};
  padding: 16px;
`;

export const Row = styled.div`
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
  align-items: center;
`;

export const HiddenFile = styled.input`
  display: none;
`;

/** Buttons */
const btnBase = css<{$ghost?: boolean}>`
  appearance: none;
  border: 1px solid ${({ theme }) => theme.colors.border};
  background: ${({ $ghost, theme }) => ($ghost ? "#f0f1f3" : theme.colors.btn)};
  color: ${({ $ghost }) => ($ghost ? "#222" : "#fff")};
  padding: 8px 12px;
  border-radius: ${({ theme }) => theme.radius.md};
  font-size: 13px;
  cursor: pointer;
  &:hover { opacity: 0.9; }
  &:disabled { opacity: 0.5; cursor: not-allowed; }
`;

export const LabelButton = styled.label<{$ghost?: boolean}>`${btnBase}`;

/** Badges */
type BadgeIntent = "ok" | "warn" | "default";
interface BadgeProps { $intent?: BadgeIntent; }

export const Badge = styled.span<BadgeProps>`
  display: inline-block;
  padding: 4px 8px;
  font-size: 12px;
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: ${({ theme }) => theme.radius.md};
  background: #fff;
  color: #222;

  ${({ $intent, theme }) =>
    $intent === "ok"
      ? `background:#ecf7ef;border-color:#d7ecd9;color:${theme.colors.ok};`
      : ""}

  ${({ $intent, theme }) =>
    $intent === "warn"
      ? `background:#fff7e6;border-color:#ffe0b2;color:${theme.colors.warn};`
      : ""}
`;

export const Timestamp = styled.span`
  margin-left: auto;
  font-size: 12px;
  color: ${({ theme }) => theme.colors.muted};
`;

export const AlertOk = styled.div`
  margin-top: 16px;
  padding: 10px 12px;
  border-radius: ${({ theme }) => theme.radius.md};
  font-size: 13px;
  border: 1px solid #d7ecd9;
  background: #ecf7ef;
  color: ${({ theme }) => theme.colors.ok};
`;

export const Code = styled.code`
  background: #f8f9fa;
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: ${({ theme }) => theme.radius.sm};
  padding: 2px 4px;
  display: inline-block;
  word-break: break-all;
`;

export const Wrap = styled.div`
  width: 100%;
  min-width: 1800px; /* 좁아 보일 때 폭 확보 */
`;

export const Toolbar = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin: 12px 0 16px;
`;

export const Title = styled.h2`
  font-size: 20px;
  font-weight: 800;
  margin: 0;
`;

export const RightBox = styled.div`
  display: flex;
  gap: 8px;
`;


export const TableWrap = styled.div`
  width: 100%;
  overflow: auto;
  border: 1px solid #eee;
  border-radius: 12px;
`;

export const Table = styled.table`
  width: 100%;
  border-collapse: collapse;

  th, td {
    padding: 10px 12px;
    border-bottom: 1px solid #f0f0f0;
    text-align: left;
    vertical-align: middle;
    font-size: 14px;
  }

  thead th {
    background: #fafafa;
    font-weight: 700;
  }

  tbody tr:hover td {
    background: #fcfcfc;
  }
`;

export const Th = styled.th``;

export const Td = styled.td<{ mono?: boolean }>`
  ${({ mono }) =>
    mono &&
    `font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace;`}
`;

export const Input = styled.input`
  width: 220px;
  max-width: 100%;
  padding: 6px 8px;
  border: 1px solid #ddd;
  border-radius: 8px;
  font-size: 14px;
`;

export const Select = styled.select`
  width: 160px;
  max-width: 100%;
  padding: 6px 8px;
  border: 1px solid #ddd;
  border-radius: 8px;
  font-size: 14px;
`;

export const Button = styled.button<{ variant?: 'primary' | 'ghost' }>`
  padding: 8px 12px;
  border-radius: 10px;
  border: 1px solid #ddd;
  background: #fff;
  cursor: pointer;
  font-weight: 700;

  ${({ variant }) =>
    variant === 'primary' && `
      background: #111;
      color: #fff;
      border-color: #111;
    `}

  ${({ variant }) =>
    variant === 'ghost' && `
      background: #fff;
      color: #111;
      border-color: #ddd;
    `}
`;

export const ReadOnly = styled.span`
  display: block;
  padding: 8px 6px;
  color: #374151;           /* gray-700 */
  cursor: not-allowed;
  user-select: text;
  background: #f9fafb;      /* gray-50 */
  border-radius: 6px;
`;

export const ReadOnlyMono = styled(ReadOnly)`
  font-variant-numeric: tabular-nums;
  text-align: right;
`;