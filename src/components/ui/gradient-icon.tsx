
'use client';

import { cn } from "@/lib/utils";
import { type LucideProps } from "lucide-react";

interface GradientIconProps extends LucideProps {
  icon: React.ComponentType<LucideProps>;
  size?: 'default' | 'sm' | 'lg' | 'xl';
  isActive?: boolean;
}

export const GradientIcon = ({ 
  icon: Icon, 
  size = 'default', 
  className,
  isActive = false,
  ...props 
}: GradientIconProps) => {

  const sizeClasses = {
    'sm': 'w-4 h-4',
    'default': 'w-5 h-5',
    'lg': 'w-6 h-6',
    'xl': 'w-8 h-8',
  };
  
  const iconColor = isActive ? 'hsl(var(--sidebar-accent))' : 'hsl(var(--sidebar-foreground))';

  return (
    <Icon
      className={cn(
        sizeClasses[size],
        "transition-colors duration-200 group-hover/menu-item:text-sidebar-accent",
        isActive && "text-sidebar-accent",
        className
      )}
      stroke={iconColor}
      {...props}
    />
  );
};
