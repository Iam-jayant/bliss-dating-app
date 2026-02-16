/**
 * Discovery Filters - Filter profiles by intent, interests, and compatibility
 */

'use client';

import { X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';

export interface FilterState {
  intents: string[];
  interests: string[];
  minCompatibility: number;
}

const DATING_INTENTS = ['Long-term', 'Short-term', 'Friends', 'Open to explore'];

const ALL_INTERESTS = [
  'Coffee', 'Hiking', 'Photography', 'Cooking', 'Travel', 'Music', 'Yoga', 'Reading',
  'Fitness', 'Art', 'Gaming', 'Dancing', 'Movies', 'Surfing', 'Cycling', 'Food',
  'Tech', 'Fashion', 'Writing', 'Sports', 'Meditation', 'Nature', 'Concerts', 'Theater'
];

const COMPAT_LEVELS = [
  { value: 0, label: 'Any' },
  { value: 25, label: '25%+' },
  { value: 50, label: '50%+' },
  { value: 75, label: '75%+' },
];

interface DiscoveryFiltersProps {
  filters: FilterState;
  onFiltersChange: (filters: FilterState) => void;
  onClose: () => void;
}

export function DiscoveryFilters({ filters, onFiltersChange, onClose }: DiscoveryFiltersProps) {
  const toggleIntent = (intent: string) => {
    const newIntents = filters.intents.includes(intent)
      ? filters.intents.filter(i => i !== intent)
      : [...filters.intents, intent];
    onFiltersChange({ ...filters, intents: newIntents });
  };

  const toggleInterest = (interest: string) => {
    const newInterests = filters.interests.includes(interest)
      ? filters.interests.filter(i => i !== interest)
      : [...filters.interests, interest];
    onFiltersChange({ ...filters, interests: newInterests });
  };

  const setMinCompat = (value: number) => {
    onFiltersChange({ ...filters, minCompatibility: value });
  };

  const clearAll = () => {
    onFiltersChange({ intents: [], interests: [], minCompatibility: 0 });
  };

  const hasFilters = filters.intents.length > 0 || filters.interests.length > 0 || filters.minCompatibility > 0;

  return (
    <Card className="border border-primary/20 bg-card/90 backdrop-blur-sm p-4">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold text-foreground">Filters</h3>
        <div className="flex items-center gap-2">
          {hasFilters && (
            <Button variant="ghost" size="sm" onClick={clearAll} className="text-xs text-muted-foreground h-7">
              Clear All
            </Button>
          )}
          <Button variant="ghost" size="sm" onClick={onClose} className="h-7 w-7 p-0">
            <X className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* Dating Intent */}
      <div className="mb-4">
        <p className="text-xs text-muted-foreground uppercase tracking-wide mb-2">Looking For</p>
        <div className="flex flex-wrap gap-2">
          {DATING_INTENTS.map(intent => (
            <Badge
              key={intent}
              variant={filters.intents.includes(intent) ? 'default' : 'outline'}
              className={`cursor-pointer transition-all ${
                filters.intents.includes(intent) 
                  ? 'bg-primary text-primary-foreground hover:bg-primary/90' 
                  : 'border-primary/20 hover:bg-secondary'
              }`}
              onClick={() => toggleIntent(intent)}
            >
              {intent}
            </Badge>
          ))}
        </div>
      </div>

      {/* Minimum Compatibility */}
      <div className="mb-4">
        <p className="text-xs text-muted-foreground uppercase tracking-wide mb-2">Min Compatibility</p>
        <div className="flex gap-2">
          {COMPAT_LEVELS.map(level => (
            <Badge
              key={level.value}
              variant={filters.minCompatibility === level.value ? 'default' : 'outline'}
              className={`cursor-pointer transition-all ${
                filters.minCompatibility === level.value
                  ? 'bg-primary text-primary-foreground hover:bg-primary/90'
                  : 'border-primary/20 hover:bg-secondary'
              }`}
              onClick={() => setMinCompat(level.value)}
            >
              {level.label}
            </Badge>
          ))}
        </div>
      </div>

      {/* Interests */}
      <div>
        <p className="text-xs text-muted-foreground uppercase tracking-wide mb-2">Must Share Interest</p>
        <div className="flex flex-wrap gap-1.5 max-h-24 overflow-y-auto">
          {ALL_INTERESTS.map(interest => (
            <Badge
              key={interest}
              variant={filters.interests.includes(interest) ? 'default' : 'outline'}
              className={`cursor-pointer text-xs transition-all ${
                filters.interests.includes(interest)
                  ? 'bg-primary text-primary-foreground hover:bg-primary/90'
                  : 'border-primary/20 hover:bg-secondary'
              }`}
              onClick={() => toggleInterest(interest)}
            >
              {interest}
            </Badge>
          ))}
        </div>
      </div>
    </Card>
  );
}
