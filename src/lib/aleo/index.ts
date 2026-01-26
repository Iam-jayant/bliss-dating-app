// Aleo integration exports
export * from './config';
export * from './types';
export * from './service';
export * from './wallet';

// Re-export the main service and wallet manager
export { aleoService } from './service';
export { walletManager, ALEO_WALLETS } from './wallet';