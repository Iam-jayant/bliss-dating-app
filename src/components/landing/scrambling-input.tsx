"use client";

import { Input } from "@/components/ui/input";
import React, { useState, useEffect, useRef } from "react";
import { cn } from "@/lib/utils";

const CHARS = "0123456789";

interface ScramblingInputProps extends React.ComponentPropsWithoutRef<"input"> {
  onValueChange: (value: number | undefined) => void;
}

export const ScramblingInput = React.forwardRef<
  HTMLInputElement,
  ScramblingInputProps
>(({ onValueChange, ...props }, ref) => {
  const [displayValue, setDisplayValue] = useState("YYYY");
  const [internalValue, setInternalValue] = useState("");
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  const scramble = (targetValue: string) => {
    if (intervalRef.current) clearInterval(intervalRef.current);
    
    let iteration = 0;
    intervalRef.current = setInterval(() => {
      const scrambled = targetValue
        .split("")
        .map((_, index) => {
          if (index < iteration) {
            return targetValue[index];
          }
          return CHARS[Math.floor(Math.random() * CHARS.length)];
        })
        .join("");
      
      setDisplayValue(scrambled.padEnd(4, 'Y'));

      if (iteration >= targetValue.length) {
        if (intervalRef.current) clearInterval(intervalRef.current);
        setDisplayValue(targetValue.padEnd(4, 'Y'));
      }
      
      iteration += 1 / 3;
    }, 40);
  };
  
  useEffect(() => {
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const rawValue = e.target.value.replace(/\D/g, "");
    if (rawValue.length <= 4) {
      setInternalValue(rawValue);
      scramble(rawValue);
      onValueChange(rawValue ? parseInt(rawValue, 10) : undefined);
    }
  };

  return (
    <div className="relative h-14 w-full">
      <Input
        ref={ref}
        type="text"
        maxLength={4}
        value={internalValue}
        onChange={handleChange}
        className="absolute inset-0 z-10 h-full w-full bg-transparent text-transparent caret-primary"
        autoComplete="bday-year"
        {...props}
      />
      <div
        className={cn(
          "pointer-events-none absolute inset-0 z-0 flex h-full w-full items-center rounded-md border border-input bg-background px-3 py-2 text-xl font-mono tracking-widest ring-offset-background",
          internalValue.length === 0 && "text-muted-foreground/50"
        )}
      >
        {displayValue}
      </div>
    </div>
  );
});

ScramblingInput.displayName = "ScramblingInput";
