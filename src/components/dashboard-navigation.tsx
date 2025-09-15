'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useSession, signOut } from 'next-auth/react';
import { useState } from 'react';
import { 
  BarChart3, Github, Linkedin, FileText, Settings, LogOut, 
  Home, User, ChevronDown, ExternalLink, Menu, X, Globe, MessageSquare, History
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAnalytics } from '@/hooks/useAnalytics';

const navigationItems = [
  {
    name: 'Dashboard',
    href: '/dashboard',
    icon: Home,
    description: 'Overview and analytics'
  },
  {
    name: 'GitHub',
    href: '/dashboard/github',
    icon: Github,
    description: 'GitHub profile analysis'
  },
  {
    name: 'LinkedIn',
    href: '/dashboard/linkedin',
    icon: Linkedin,
    description: 'LinkedIn profile analysis'
  },
  {
    name: 'Resume',
    href: '/dashboard/resume',
    icon: FileText,
    description: 'Resume upload and analysis'
  },
  {
    name: 'Blogs',
    href: '/dashboard/blogs',
    icon: Globe,
    description: 'Blog analytics and content tracking'
  }
];

export function DashboardNavigation() {
  const pathname = usePathname();
  const { data: session } = useSession();
  const { trackClick } = useAnalytics();
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const handleSignOut = () => {
    trackClick('sign_out', '/');
    signOut({ callbackUrl: '/' });
  };

  const handleProfileMenuClick = (action: string, href: string) => {
    trackClick(`profile_menu_${action}`, href);
    setIsUserMenuOpen(false);
  };

  // Close dropdowns when clicking outside
  React.useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      
      // Close user menu if clicking outside
      if (isUserMenuOpen && !target.closest('.relative')) {
        setIsUserMenuOpen(false);
      }
      
      // Close mobile menu if clicking outside
      if (isMobileMenuOpen && !target.closest('.md\\:hidden')) {
        setIsMobileMenuOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isUserMenuOpen, isMobileMenuOpen]);

  return (
    <header className="bg-white shadow">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center py-6">
          {/* Logo */}
          <div className="flex items-center">
            <BarChart3 className="h-8 w-8 text-primary" />
            <h1 className="ml-3 text-2xl font-bold text-gray-900">ReviewMe</h1>
          </div>
          
          {/* Navigation Links */}
          <nav className="hidden md:flex items-center space-x-8">
            {navigationItems.map((item) => {
              const Icon = item.icon;
              const isActive = pathname === item.href;
              
              return (
                <Link
                  key={item.name}
                  href={item.href}
                  onClick={() => trackClick(`nav_${item.name.toLowerCase()}`, item.href)}
                  className={cn(
                    'flex items-center space-x-2 px-3 py-2 rounded-md text-sm font-medium transition-colors',
                    isActive
                      ? 'bg-primary/10 text-primary'
                      : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                  )}
                  title={item.description}
                >
                  <Icon className="h-4 w-4" />
                  <span>{item.name}</span>
                </Link>
              );
            })}
          </nav>

          {/* Mobile Navigation Menu Button */}
          <div className="md:hidden">
            <button
              type="button"
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="inline-flex items-center justify-center p-2 rounded-md text-gray-400 hover:text-gray-500 hover:bg-gray-100"
            >
              <span className="sr-only">Open main menu</span>
              {isMobileMenuOpen ? (
                <X className="h-6 w-6" />
              ) : (
                <Menu className="h-6 w-6" />
              )}
            </button>
          </div>
          
          {/* User Menu */}
          <div className="relative">
            <button
              type="button"
              onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
              className="flex items-center space-x-3 px-3 py-2 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
            >
              {session?.user?.image ? (
                <img
                  src={session.user.image}
                  alt={session.user.name || 'User'}
                  className="h-8 w-8 rounded-full"
                />
              ) : (
                <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
                  <User className="h-4 w-4 text-primary" />
                </div>
              )}
              <span className="hidden sm:block">
                {session?.user?.name || 'User'}
              </span>
              <ChevronDown className="h-4 w-4 text-gray-400" />
            </button>

            {/* Dropdown Menu */}
            {isUserMenuOpen && (
              <div className="absolute right-0 mt-2 w-56 bg-white rounded-lg shadow-lg border border-gray-200 py-2 z-50">
                <Link
                  href="/dashboard/settings"
                  onClick={() => {
                    handleProfileMenuClick('edit_profile', '/dashboard/settings');
                    setIsUserMenuOpen(false);
                  }}
                  className="flex items-center space-x-3 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                >
                  <Settings className="h-4 w-4" />
                  <span>Edit Profile</span>
                </Link>
                
                <Link
                  href="/dashboard/transactions"
                  onClick={() => {
                    handleProfileMenuClick('transactions', '/dashboard/transactions');
                    setIsUserMenuOpen(false);
                  }}
                  className="flex items-center space-x-3 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                >
                  <History className="h-4 w-4" />
                  <span>Transaction History</span>
                </Link>
                
                {/* Public Profile Link */}
                {session?.user && (
                  <a
                    href={`/u/${session.user.publicUsername || session.user.name?.toLowerCase().replace(/\s+/g, '-') || 'user'}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={() => {
                      handleProfileMenuClick('view_public', `/u/${session.user.publicUsername || session.user.name?.toLowerCase().replace(/\s+/g, '-') || 'user'}`);
                      setIsUserMenuOpen(false);
                    }}
                    className="flex items-center space-x-3 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                  >
                    <ExternalLink className="h-4 w-4" />
                    <span>View Public Profile</span>
                  </a>
                )}
                
                <hr className="my-2" />
                
                <Link
                  href="/contact"
                  onClick={() => {
                    handleProfileMenuClick('help_contact', '/contact');
                    setIsUserMenuOpen(false);
                  }}
                  className="flex items-center space-x-3 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                >
                  <MessageSquare className="h-4 w-4" />
                  <span>Help & Contact</span>
                </Link>
                
                <hr className="my-2" />
                
                <button
                  onClick={() => {
                    handleSignOut();
                    setIsUserMenuOpen(false);
                  }}
                  className="flex items-center space-x-3 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors w-full text-left"
                >
                  <LogOut className="h-4 w-4" />
                  <span>Sign Out</span>
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Mobile Navigation Menu */}
        {isMobileMenuOpen && (
          <div className="md:hidden border-t border-gray-200">
            <nav className="space-y-1 px-4 pt-4 pb-3">
              {navigationItems.map((item) => {
                const Icon = item.icon;
                const isActive = pathname === item.href;
                
                return (
                  <Link
                    key={item.name}
                    href={item.href}
                    onClick={() => {
                      trackClick(`nav_${item.name.toLowerCase()}`, item.href);
                      setIsMobileMenuOpen(false);
                    }}
                    className={cn(
                      'flex items-center space-x-3 px-3 py-2 rounded-md text-base font-medium transition-colors',
                      isActive
                        ? 'bg-primary/10 text-primary'
                        : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                    )}
                  >
                    <Icon className="h-5 w-5" />
                    <div>
                      <div>{item.name}</div>
                      <div className="text-xs text-gray-500">{item.description}</div>
                    </div>
                  </Link>
                );
              })}
            </nav>
            
            {/* Mobile Profile Menu */}
            <div className="border-t border-gray-200 pt-4 pb-3 px-4">
              <div className="flex items-center space-x-3 mb-3">
                {session?.user?.image ? (
                  <img
                    src={session.user.image}
                    alt={session.user.name || 'User'}
                    className="h-10 w-10 rounded-full"
                  />
                ) : (
                  <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                    <User className="h-5 w-5 text-primary" />
                  </div>
                )}
                <div>
                  <div className="text-base font-medium text-gray-900">
                    {session?.user?.name || 'User'}
                  </div>
                  <div className="text-sm text-gray-500">
                    {session?.user?.email}
                  </div>
                </div>
              </div>
              
              <div className="space-y-1">
                <Link
                  href="/dashboard/settings"
                  onClick={() => {
                    handleProfileMenuClick('edit_profile', '/dashboard/settings');
                    setIsMobileMenuOpen(false);
                  }}
                  className="flex items-center space-x-3 px-3 py-2 text-base font-medium text-gray-600 hover:text-gray-900 hover:bg-gray-50 rounded-md transition-colors"
                >
                  <Settings className="h-5 w-5" />
                  <span>Edit Profile</span>
                </Link>
                
                <Link
                  href="/dashboard/transactions"
                  onClick={() => {
                    handleProfileMenuClick('transactions', '/dashboard/transactions');
                    setIsMobileMenuOpen(false);
                  }}
                  className="flex items-center space-x-3 px-3 py-2 text-base font-medium text-gray-600 hover:text-gray-900 hover:bg-gray-50 rounded-md transition-colors"
                >
                  <History className="h-5 w-5" />
                  <span>Transaction History</span>
                </Link>
                
                {session?.user && (
                  <a
                    href={`/u/${session.user.publicUsername || session.user.name?.toLowerCase().replace(/\s+/g, '-') || 'user'}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={() => {
                      handleProfileMenuClick('view_public', `/u/${session.user.publicUsername || session.user.name?.toLowerCase().replace(/\s+/g, '-') || 'user'}`);
                      setIsMobileMenuOpen(false);
                    }}
                    className="flex items-center space-x-3 px-3 py-2 text-base font-medium text-gray-600 hover:text-gray-900 hover:bg-gray-50 rounded-md transition-colors"
                  >
                    <ExternalLink className="h-5 w-5" />
                    <span>View Public Profile</span>
                  </a>
                )}
                
                <Link
                  href="/contact"
                  onClick={() => {
                    handleProfileMenuClick('help_contact', '/contact');
                    setIsMobileMenuOpen(false);
                  }}
                  className="flex items-center space-x-3 px-3 py-2 text-base font-medium text-gray-600 hover:text-gray-900 hover:bg-gray-50 rounded-md transition-colors"
                >
                  <MessageSquare className="h-5 w-5" />
                  <span>Help & Contact</span>
                </Link>
                
                <button
                  onClick={() => {
                    handleSignOut();
                    setIsMobileMenuOpen(false);
                  }}
                  className="flex items-center space-x-3 px-3 py-2 text-base font-medium text-gray-600 hover:text-gray-900 hover:bg-gray-50 rounded-md transition-colors w-full text-left"
                >
                  <LogOut className="h-5 w-5" />
                  <span>Sign Out</span>
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </header>
  );
}

export default DashboardNavigation;