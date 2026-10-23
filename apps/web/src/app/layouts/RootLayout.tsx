import { Outlet } from 'react-router-dom';

import { AuthGate } from '@/features/auth';
import { AppShell } from '@/widgets/app-shell';

export function RootLayout() {
  return (
    <AuthGate>
      <AppShell>
        <Outlet />
      </AppShell>
    </AuthGate>
  );
}
