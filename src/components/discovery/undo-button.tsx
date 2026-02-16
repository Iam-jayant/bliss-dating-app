/**
 * Undo Swipe Feature - Premium
 * Allows users to undo their last swipe action
 */

'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { RotateCcw, Lock } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

interface UndoButtonProps {
  onUndo: () => void;
  disabled: boolean;
  isPremium: boolean;
  onUpgradeClick: () => void;
}

export function UndoButton({ onUndo, disabled, isPremium, onUpgradeClick }: UndoButtonProps) {
  const [showTooltip, setShowTooltip] = useState(false);

  const handleClick = () => {
    if (!isPremium) {
      onUpgradeClick();
      return;
    }
    
    if (!disabled) {
      onUndo();
    }
  };

  return (
    <TooltipProvider>
      <Tooltip open={showTooltip} onOpenChange={setShowTooltip}>
        <TooltipTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            onClick={handleClick}
            disabled={disabled && isPremium}
            className={`rounded-full h-12 w-12 ${!isPremium ? 'opacity-50' : ''}`}
          >
            {!isPremium ? (
              <Lock className="h-5 w-5" />
            ) : (
              <RotateCcw className="h-5 w-5" />
            )}
          </Button>
        </TooltipTrigger>
        <TooltipContent>
          {!isPremium ? (
            <p>Upgrade to Premium to undo swipes</p>
          ) : disabled ? (
            <p>No recent swipes to undo</p>
          ) : (
            <p>Undo last swipe</p>
          )}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
