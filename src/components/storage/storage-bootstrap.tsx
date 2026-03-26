'use client';

import { useEffect } from 'react';
import { runBlissV3Migration } from '@/lib/storage/migration';
import { initializeStorage } from '@/lib/storage/gun-storage';

export function StorageBootstrap() {
  useEffect(() => {
    runBlissV3Migration();
    initializeStorage().catch((error) => {
      console.warn('Failed to initialize decentralized storage:', error);
    });
  }, []);

  return null;
}
