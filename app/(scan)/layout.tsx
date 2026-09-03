import type { ReactNode } from 'react';
import { SiteShell } from '../../components/shell/SiteShell';

export default function Layout({ children }: { children: ReactNode }) {
  return <SiteShell>{children}</SiteShell>;
}
