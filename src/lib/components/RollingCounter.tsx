'use client';

import { useState, useEffect, useRef } from 'react';

interface RollingCounterProps {
  value: number;
  duration?: number;
  suffix?: string;
}

export default function RollingCounter({ value, duration = 800, suffix = '' }: RollingCounterProps) {
  const [displayValue, setDisplayValue] = useState(value);
  const prevValueRef = useRef(value);

  useEffect(() => {
    const startValue = prevValueRef.current;
    const endValue = value;
    if (startValue === endValue) return;

    let startTime: number | null = null;
    let animationFrameId: number;

    const animateValue = (timestamp: number) => {
      if (!startTime) startTime = timestamp;
      const progress = timestamp - startTime;
      const progressRatio = Math.min(progress / duration, 1);
      const easedProgress = progressRatio * (2 - progressRatio);
      const currentValue = Math.round(startValue + (endValue - startValue) * easedProgress);
      setDisplayValue(currentValue);
      if (progressRatio < 1) {
        animationFrameId = requestAnimationFrame(animateValue);
      } else {
        prevValueRef.current = endValue;
        setDisplayValue(endValue);
      }
    };
    animationFrameId = requestAnimationFrame(animateValue);
    return () => {
      if (animationFrameId) cancelAnimationFrame(animationFrameId);
    };
  }, [value, duration]);

  return <span>{displayValue.toLocaleString()}{suffix}</span>;
}
