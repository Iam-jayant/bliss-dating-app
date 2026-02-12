// Aleo integration exports
export * from './config';
export * from './types';
export * from './service';
export * from './wallet-provider';
export * from './profile-service';

// Re-export the main services
export { aleoService } from './service';
export { aleoProfileService } from './profile-service';