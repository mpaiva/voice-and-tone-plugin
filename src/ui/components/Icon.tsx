import React from 'react';
import * as TablerIcons from '@tabler/icons-react';

interface IconProps {
  name: keyof typeof TablerIcons;
  size?: number;
  stroke?: number;
  className?: string;
  color?: string;
}

/**
 * Icon wrapper component for Tabler Icons
 * Provides consistent sizing and styling across the app
 */
export function Icon({
  name,
  size = 20,
  stroke = 2,
  className,
  color
}: IconProps) {
  const IconComponent = TablerIcons[name];

  if (!IconComponent) {
    console.warn(`Icon "${name}" not found in Tabler Icons`);
    return null;
  }

  return (
    <IconComponent
      size={size}
      stroke={stroke}
      className={className}
      color={color}
    />
  );
}
