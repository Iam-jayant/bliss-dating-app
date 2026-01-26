"use client";

import { Input } from "@/components/ui/input";
import React, { useState, useEffect, useRef } from "react";
import { cn } from "@/lib/utils";

const CHARS = "0123456789";

interface ScramblingInputProps extends Omit<React.ComponentPropsWithoutRef<"input">, 'onChange' | 'value'> {
  onValueChange: (value: number | undefined) => void;
  value?: number;
  onChange?: (event: React.ChangeEvent<HTMLInputElement>) => void;
  onBlur?: () => void;
}

export const ScramblingInput = React.forwardRef<
  HTMLInputElement,
  ScramblingInputProps
>(({ onValueChange, value, onChange, onBlur, ...props }, ref) => {
  const [displayValue, setDisplayValue] = useState("YYYY");
  const [internalValue, setInternalValue] = useState("");
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  // Initialize internal value from prop value - ensure it's always a string
  useEffect(() => {
    if (value !== undefined && value !== null) {
      const stringValue = value.toString();
      setInternalValue(stringValue);
      setDisplayValue(stringValue.padEnd(4, 'Y'));
    } else {
      setInternalValue("");
      setDisplayValue("YYYY");
    }
  }, [value]);

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
      
      // Call both callbacks
      const numericValue = rawValue ? parseInt(rawValue, 10) : undefined;
      onValueChange(numericValue);
      
      if (onChange) {
        // Create a synthetic event with the numeric value for react-hook-form
        const syntheticEvent = {
          ...e,
          target: {
            ...e.target,
            value: numericValue || '',
          },
        };
        onChange(syntheticEvent as React.ChangeEvent<HTMLInputElement>);
      }
    }
  };

  const handleBlur = () => {
    if (onBlur) {
      onBlur();
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
        onBlur={handleBlur}
        className="absolute inset-0 z-10 h-full w-full bg-transparent text-foreground caret-primary selection:bg-primary/20 font-mono text-2xl md:text-xl tracking-[0.3em] text-center font-bold"
        autoComplete="bday-year"
        placeholder=""
        {...props}
      />
      <div
        className={cn(
          "pointer-events-none absolute inset-0 z-0 flex h-full w-full items-center justify-center rounded-md border border-input bg-background px-3 py-2 text-2xl md:text-xl font-mono tracking-[0.3em] ring-offset-background font-bold",
          internalValue.length === 0 ? "text-muted-foreground/50" : "text-transparent"
        )}
      >
        {displayValue}
      </div>
    </div>
  );
});

ScramblingInput.displayName = "ScramblingInput";
