import { Suspense } from 'react';
import MessagesPage from '@/components/messaging/messages-page';

export default function Messages() {
  return (
    <Suspense fallback={<div className="flex items-center justify-center min-h-screen">Loading messages...</div>}>
      <MessagesPage />
    </Suspense>
  );
}
