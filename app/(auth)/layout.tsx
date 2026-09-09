import type { ReactNode } from 'react';
import { SiteShell } from '../../components/shell/SiteShell';

// Dezelfde schil als de publieke kant. Inloggen hoort bij het product en niet
// op een kaal scherm zonder uitweg: wie hier per ongeluk belandt, moet gewoon
// verder kunnen klikken.
export default function Layout({ children }: { children: ReactNode }) {
  return <SiteShell>{children}</SiteShell>;
}
