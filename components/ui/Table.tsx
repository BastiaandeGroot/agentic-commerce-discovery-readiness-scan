'use client';

import type { ReactNode } from 'react';

/** Tabelomhulsel. Brede tabellen scrollen binnen hun eigen kader; de pagina
 *  zelf schuift nooit horizontaal mee, want dan raak je de kolomkop kwijt. */
export function TableWrap({ children, minWidth = '34rem' }: {
  children: ReactNode;
  minWidth?: string;
}) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-left text-sm" style={{ minWidth }}>
        {children}
      </table>
    </div>
  );
}

export function Th({ children, align = 'left' }: { children: ReactNode; align?: 'left' | 'right' }) {
  return (
    <th className={`py-2 pr-3 text-xs font-medium text-muted ${align === 'right' ? 'text-right' : ''}`}>
      {children}
    </th>
  );
}

export function Td({ children, align = 'left', numeric }: {
  children: ReactNode; align?: 'left' | 'right'; numeric?: boolean;
}) {
  return (
    <td className={`py-2 pr-3 ${align === 'right' ? 'text-right' : ''} ${numeric ? 'tnum' : ''}`}>
      {children}
    </td>
  );
}
