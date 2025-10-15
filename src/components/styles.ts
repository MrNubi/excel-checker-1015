// src/components/RateSettingsModal/styles.ts
import styled from 'styled-components';

/* Backdrop covers the screen */
export const Backdrop = styled.div`
  position: fixed;
  inset: 0;
  background: rgba(0,0,0,0.4);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
`;

/* Modal with header/body/footer rows and internal scrolling */
export const Modal = styled.div`
  width: 900px;
  max-width: 96vw;
  background: #fff;
  border-radius: 16px;
  box-shadow: 0 10px 30px rgba(0,0,0,0.2);
  overflow: hidden;

  display: grid;
  grid-template-rows: auto 1fr auto; /* header / body / footer */
  max-height: 80vh; /* body scrolls inside */
`;

/* Sticky header */
export const Header = styled.div`
  padding: 16px 20px;
  border-bottom: 1px solid #eee;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  position: sticky;
  top: 0;
  background: #fff;
  z-index: 1;
`;

export const Title = styled.div`
  font-weight: 800;
  font-size: 18px;
`;

export const Tabs = styled.div`
  display: flex;
  gap: 8px;
`;

/* Use transient prop for active state to avoid passing to DOM */
export const TabButton = styled.button<{ $active?: boolean }>`
  padding: 6px 10px;
  border-radius: 8px;
  border: 1px solid #ddd;
  cursor: pointer;
  ${({ $active }) =>
    $active
      ? 'background:#111;color:#fff;border-color:#111;'
      : 'background:#fff;color:#111;'}
`;

/* Body: only this area scrolls */
export const Body = styled.div`
  padding: 16px 20px;
  display: grid;
  gap: 20px;
  overflow: auto;   /* internal scroll */
  min-height: 0;    /* allow shrink in grid */
`;

export const SectionTitle = styled.div`
  font-weight: 700;
`;

export const Small = styled.div`
  font-size: 12px;
  color: #666;
`;

export const Table = styled.table`
  width: 100%;
  border-collapse: collapse;
  font-size: 14px;

  th, td {
    border-bottom: 1px solid #f0f0f0;
    padding: 10px;
    text-align: left;
  }

  th {
    background: #fafafa;
    font-weight: 600;
  }
`;

export const Th = styled.th``;
export const Td = styled.td``;

export const Input = styled.input`
  padding: 6px 8px;
  border: 1px solid #ddd;
  border-radius: 8px;
  font-size: 14px;

  &:focus {
    outline: none;
    border-color: #111;
  }
`;

/* Button with variants (transient prop) */
export const SButton = styled.button<{ $variant?: 'primary' | 'ghost' | 'danger' }>`
  padding: 8px 12px;
  border-radius: 10px;
  border: 1px solid transparent;
  cursor: pointer;
  font-weight: 600;

  ${({ $variant }) => $variant === 'primary' && `
    background:#111; color:#fff;
  `}

  ${({ $variant }) => $variant === 'ghost' && `
    background:#fff; color:#111; border-color:#ddd;
  `}

  ${({ $variant }) => $variant === 'danger' && `
    background:#fff0f0; color:#c00; border-color:#f3c2c2;
  `}
`;

export const Row = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
`;

export const CondList = styled.div`
  display: grid;
  gap: 8px;
  margin-top: 8px;
`;

export const CondRow = styled.div`
  display: flex;
  gap: 8px;
  align-items: center;
`;

export const RuleCard = styled.div`
  border: 1px solid #eee;
  border-radius: 12px;
  padding: 12px;
`;

/* Sticky footer */
export const Footer = styled.div`
  padding: 14px 20px;
  border-top: 1px solid #eee;
  display: flex;
  gap: 8px;
  justify-content: flex-end;
  position: sticky;
  bottom: 0;
  background: #fff;
  z-index: 1;
`;
