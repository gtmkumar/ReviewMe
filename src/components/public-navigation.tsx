'use client';

import Link from 'next/link';
import { BarChart3, Menu, X } from 'lucide-react';
import { useState } from 'react';
import { useSession } from 'next-auth/react';

export function PublicNavigation() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const { data: session } = useSession();

  return (
    <header className="sticky top-0 z-50 border-b bg-white/95 backdrop-blur supports-[backdrop-filter]:bg-white/60 shadow-sm">
      <div className="container mx-auto flex h-16 items-center justify-between px-4 lg:px-6">
        <div className="flex items-center space-x-3">
          <Link href="/" className="flex items-center space-x-3">
            <div className="p-2 bg-gradient-to-br from-primary to-blue-600 rounded-lg">
              <BarChart3 className="h-6 w-6 text-white" />
            </div>
            <span className="text-2xl font-bold gradient-text tracking-tight">ReviewMe</span>
          </Link>
        </div>
        
        {/* Desktop Navigation */}
        <nav className="hidden lg:flex items-center space-x-8 text-sm font-medium">
          <Link href="/#features" className="transition-colors hover:text-primary focus:text-primary">
            Features
          </Link>
          <Link href="/#how-it-works" className="transition-colors hover:text-primary focus:text-primary">
            How it Works
          </Link>
          <Link href="/#pricing" className="transition-colors hover:text-primary focus:text-primary">
            Pricing
          </Link>
          <Link href="/#testimonials" className="transition-colors hover:text-primary focus:text-primary">
            Reviews
          </Link>
          <Link href="/#faq" className="transition-colors hover:text-primary focus:text-primary">
            FAQ
          </Link>
          <Link href="/contact" className="transition-colors hover:text-primary focus:text-primary">
            Contact
          </Link>
        </nav>
        
        {/* Desktop Auth Buttons */}
        <div className="hidden lg:flex items-center space-x-4">
          {session ? (
            <Link 
              href="/dashboard" 
              className="btn-primary text-sm px-6 py-2.5 font-semibold"
            >
              Go to Dashboard
            </Link>
          ) : (
            <>
              <Link 
                href="/auth/signin" 
                className="text-sm font-medium transition-colors hover:text-primary focus:text-primary"
              >
                Sign In
              </Link>
              <Link 
                href="/auth/signup" 
                className="btn-primary text-sm px-6 py-2.5 font-semibold"
              >
                Get Started Free
              </Link>
            </>
          )}
        </div>
        
        {/* Mobile Menu Button */}
        <button
          className="lg:hidden p-2"
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          aria-label="Toggle menu"
        >
          {mobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
        </button>
      </div>
      
      {/* Mobile Menu */}
      {mobileMenuOpen && (
        <div className="lg:hidden border-t bg-white/95 backdrop-blur">
          <nav className="container mx-auto px-4 py-4 space-y-4">
            <Link 
              href="/#features" 
              className="block text-sm font-medium hover:text-primary"
              onClick={() => setMobileMenuOpen(false)}
            >
              Features
            </Link>
            <Link 
              href="/#how-it-works" 
              className="block text-sm font-medium hover:text-primary"
              onClick={() => setMobileMenuOpen(false)}
            >
              How it Works
            </Link>
            <Link 
              href="/#pricing" 
              className="block text-sm font-medium hover:text-primary"
              onClick={() => setMobileMenuOpen(false)}
            >
              Pricing
            </Link>
            <Link 
              href="/#testimonials" 
              className="block text-sm font-medium hover:text-primary"
              onClick={() => setMobileMenuOpen(false)}
            >
              Reviews
            </Link>
            <Link 
              href="/#faq" 
              className="block text-sm font-medium hover:text-primary"
              onClick={() => setMobileMenuOpen(false)}
            >
              FAQ
            </Link>
            <Link 
              href="/contact" 
              className="block text-sm font-medium hover:text-primary"
              onClick={() => setMobileMenuOpen(false)}
            >
              Contact
            </Link>
            <div className="pt-4 border-t space-y-2">
              {session ? (
                <Link 
                  href="/dashboard" 
                  className="block btn-primary text-sm"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  Go to Dashboard
                </Link>
              ) : (
                <>
                  <Link 
                    href="/auth/signin" 
                    className="block btn-ghost text-sm"
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    Sign In
                  </Link>
                  <Link 
                    href="/auth/signup" 
                    className="block btn-primary text-sm"
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    Get Started Free
                  </Link>
                </>
              )}
            </div>
          </nav>
        </div>
      )}
    </header>
  );
}