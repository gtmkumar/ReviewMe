'use client';

import React from 'react';
import { Moon, Sun, Monitor } from 'lucide-react';
import { useTheme } from '@/contexts/theme-context';
import { cn } from '@/lib/utils';

interface ThemeToggleProps {
  className?: string;
  showLabel?: boolean;
  variant?: 'default' | 'minimal';
}

export function ThemeToggle({ 
  className, 
  showLabel = false, 
  variant = 'default' 
}: ThemeToggleProps) {
  const { theme, setTheme, resolvedTheme } = useTheme();
  const [mounted, setMounted] = React.useState(false);

  React.useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return (
      <div className={cn(
        'h-9 w-9 rounded-lg bg-secondary/50 animate-pulse',
        className
      )} />
    );
  }

  const toggleTheme = () => {
    if (theme === 'light') {
      setTheme('dark');
    } else if (theme === 'dark') {
      setTheme('system');
    } else {
      setTheme('light');
    }
  };

  const getIcon = () => {
    if (theme === 'system') {
      return <Monitor className="h-4 w-4" />;
    }
    return resolvedTheme === 'dark' ? (
      <Moon className="h-4 w-4" />
    ) : (
      <Sun className="h-4 w-4" />
    );
  };

  const getTooltip = () => {
    if (theme === 'system') return 'System theme';
    return resolvedTheme === 'dark' ? 'Dark mode' : 'Light mode';
  };

  if (variant === 'minimal') {
    return (
      <button
        onClick={toggleTheme}
        className={cn(
          'relative inline-flex h-9 w-9 items-center justify-center rounded-lg',
          'text-muted-foreground transition-colors hover:text-foreground',
          'hover:bg-accent focus-visible:bg-accent focus-visible:outline-none',
          'focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
          className
        )}
        title={getTooltip()}
      >
        {getIcon()}
      </button>
    );
  }

  return (
    <button
      onClick={toggleTheme}
      className={cn(
        'relative inline-flex h-9 items-center justify-center rounded-lg px-3',
        'bg-background border border-border text-foreground',
        'transition-all duration-200 hover:bg-accent hover:text-accent-foreground',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
        'focus-visible:ring-offset-2 shadow-sm hover:shadow-md',
        'group',
        showLabel ? 'w-auto gap-2' : 'w-9',
        className
      )}
      title={getTooltip()}
    >
      <div className="relative flex items-center justify-center">
        {getIcon()}
        {/* Subtle glow effect */}
        <div className={cn(
          'absolute inset-0 rounded-full transition-opacity duration-300',
          'bg-primary/20 opacity-0 group-hover:opacity-100 blur-sm'
        )} />
      </div>
      
      {showLabel && (
        <span className="text-sm font-medium">
          {theme === 'system' ? 'Auto' : resolvedTheme === 'dark' ? 'Dark' : 'Light'}
        </span>
      )}
      
      {/* Theme indicator dot */}
      <div className={cn(
        'absolute -top-1 -right-1 h-2 w-2 rounded-full border border-background',
        'transition-colors duration-200',
        theme === 'system' 
          ? 'bg-blue-500' 
          : resolvedTheme === 'dark' 
            ? 'bg-purple-500' 
            : 'bg-yellow-500'
      )} />
    </button>
  );
}

export default ThemeToggle;