/**
 * Storage client - Replaces Supabase
 * Uses local storage + Pinata IPFS for decentralized profile storage
 * Maintains same interface for backward compatibility with existing components
 */

// No external dependencies - all storage is done via Pinata IPFS + localStorage
// This file exists purely for backward compatibility with old import paths

export const STORAGE_VERSION = 2; // Wave 2 - Pinata IPFS
