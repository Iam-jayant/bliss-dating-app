/**
 * Who Liked You Page
 * Premium feature showing users who liked your profile
 */

import { LikesGrid } from '@/components/matches/likes-grid';

export default function LikesPage() {
  return (
    <div className="container max-w-6xl mx-auto py-8 px-4">
      <LikesGrid />
    </div>
  );
}

export const metadata = {
  title: 'Who Likes You | Bliss',
  description: 'See everyone who liked your profile',
};
