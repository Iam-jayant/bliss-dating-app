/**
 * Profile utilities index
 * Central export point for all profile-related functions
 */

// Core profile functions
export {
  createProfile,
  getProfile,
  getProfileByHash,
  updateProfile,
  uploadProfileImage,
  getProfileImageUrl,
  getAllProfiles,
  getUserCount,
  hasAnyProfiles,
  getFilteredProfiles,
  exportProfileData,
  getProfileStats,
} from './profile';

// Mock profile functions
export {
  generateMockProfiles,
  seedMockProfiles,
  clearMockProfiles,
  getMockProfiles,
} from './mock-profiles';

// Admin utilities
export {
  listAllProfiles,
  showProfileStats,
  exportProfiles,
  getStorageInfo,
  help,
} from './profile-admin';

// Types
export type {
  ProfileData,
  ProfileCreateInput,
  ProfileUpdateInput,
  BioPromptType,
  DatingIntent,
} from './types';
