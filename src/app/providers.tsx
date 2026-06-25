'use client';

import { AppProvider } from '@/lib/hooks/useApp';

export default function Providers({ children }: { children: React.ReactNode }) {
  return <AppProvider>{children}</AppProvider>;
}