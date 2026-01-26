// Aleo network configuration
export const ALEO_CONFIG = {
  // Network configuration
  NETWORK: 'testnet' as const,
  API_URL: process.env.NEXT_PUBLIC_ALEO_API_URL || 'https://api.explorer.provable.com/v1/testnet',

  // Contract configuration
  PROGRAM_ID: process.env.NEXT_PUBLIC_AGE_VERIFICATION_PROGRAM_ID || 'bliss_age_verification_v1.aleo',

  // Transaction configuration
  FEE_MICROCREDITS: 1000000, // 1 credit = 1,000,000 microcredits

  // Function names
  FUNCTIONS: {
    VERIFY_AGE: 'verify_age',
    PROVE_POSSESSION: 'prove_possession',
  },
} as const;

export type AleoNetwork = typeof ALEO_CONFIG.NETWORK;