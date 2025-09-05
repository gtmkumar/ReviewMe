'use client';

import { useState, useEffect } from 'react';
import { signIn } from 'next-auth/react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Github, Mail, Eye, EyeOff, ArrowLeft, Check, X, Gift, Star, Shield, Users, BarChart3, Sparkles, CreditCard, Zap, ArrowRight, CheckCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { AuthRouteGuard } from '@/components/auth-route-guard';

interface PasswordRequirement {
  met: boolean;
  text: string;
}

export default function SignUpPage() {
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [currentStep, setCurrentStep] = useState(1);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: '',
    agreeToTerms: false,
  });
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [referralCode, setReferralCode] = useState<string | null>(null);
  const [manualReferralCode, setManualReferralCode] = useState('');
  const [creditPreview, setCreditPreview] = useState(100); // Base credits
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    // Check for referral code in URL
    const refParam = searchParams.get('ref');
    if (refParam) {
      setReferralCode(refParam);
      setCreditPreview(400); // Base + referral bonus
    }
  }, [searchParams]);

  // Update credit preview when manual referral code is entered
  useEffect(() => {
    if (manualReferralCode.trim()) {
      setCreditPreview(400); // Base + referral bonus
    } else if (!referralCode) {
      setCreditPreview(100); // Base credits only
    }
  }, [manualReferralCode, referralCode]);

  // Calculate form completion percentage
  const getFormProgress = () => {
    const fields = [formData.name, formData.email, formData.password, formData.confirmPassword];
    const filledFields = fields.filter(field => field.trim() !== '').length;
    const agreementStep = formData.agreeToTerms ? 1 : 0;
    return Math.round(((filledFields + agreementStep) / 5) * 100);
  };

  // Password requirements
  const passwordRequirements: PasswordRequirement[] = [
    { met: formData.password.length >= 8, text: 'At least 8 characters' },
    { met: /[A-Z]/.test(formData.password), text: 'One uppercase letter' },
    { met: /[a-z]/.test(formData.password), text: 'One lowercase letter' },
    { met: /\d/.test(formData.password), text: 'One number' },
    { met: /[!@#$%^&*(),.?":{}|<>]/.test(formData.password), text: 'One special character' },
  ];

  const isPasswordValid = passwordRequirements.every(req => req.met);
  const passwordsMatch = formData.password === formData.confirmPassword && formData.confirmPassword !== '';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');
    setSuccess('');

    // Validation
    if (!isPasswordValid) {
      setError('Please meet all password requirements.');
      setIsLoading(false);
      return;
    }

    if (!passwordsMatch) {
      setError('Passwords do not match.');
      setIsLoading(false);
      return;
    }

    if (!formData.agreeToTerms) {
      setError('Please agree to the Terms of Service and Privacy Policy.');
      setIsLoading(false);
      return;
    }

    try {
      // Register user
      const requestBody: any = {
        name: formData.name,
        email: formData.email,
        password: formData.password,
      };

      // Include referralCode if it exists (from URL or manual input)
      const finalReferralCode = referralCode || manualReferralCode.trim();
      if (finalReferralCode) {
        requestBody.referralCode = finalReferralCode;
      }

      const response = await fetch('/api/auth/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Registration failed');
      }

      setSuccess('Account created successfully! Signing you in...');

      // Automatically sign in the user
      const result = await signIn('credentials', {
        email: formData.email,
        password: formData.password,
        redirect: false,
      });

      if (result?.error) {
        setError('Account created but sign in failed. Please try signing in manually.');
      } else {
        setTimeout(() => {
          router.push('/dashboard');
        }, 1000);
      }
    } catch (error: any) {
      setError(error.message || 'An error occurred during registration.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleOAuthSignIn = async (provider: 'github' | 'google') => {
    setIsLoading(true);
    try {
      await signIn(provider, { callbackUrl: '/dashboard' });
    } catch (error) {
      setError('An error occurred with OAuth sign up.');
      setIsLoading(false);
    }
  };

  return (
    <AuthRouteGuard>
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 relative overflow-hidden">
      {/* Animated Background Elements */}
      <div className="absolute inset-0">
        <div className="absolute top-20 left-20 w-32 h-32 bg-primary/10 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute bottom-20 right-20 w-48 h-48 bg-blue-500/10 rounded-full blur-3xl animate-pulse delay-1000"></div>
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-64 h-64 bg-purple-500/5 rounded-full blur-3xl animate-pulse delay-500"></div>
      </div>

      <div className="relative z-10 flex flex-col lg:flex-row min-h-screen">
        {/* Left Side - Welcome Content (Hidden on mobile) */}
        <div className="hidden lg:flex lg:w-1/2 items-center justify-center p-12">
          <div className="max-w-md space-y-8">
            {/* Logo and Brand */}
            <div className="text-center space-y-4">
              <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-primary to-blue-600 rounded-2xl shadow-lg">
                <BarChart3 className="h-8 w-8 text-white" />
              </div>
              <h1 className="text-3xl font-bold gradient-text">ReviewMe</h1>
              <p className="text-lg text-gray-600">Transform your professional profile with AI</p>
            </div>

            {/* Benefits */}
            <div className="space-y-6">
              <div className="flex items-center space-x-4">
                <div className="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center">
                  <CreditCard className="h-6 w-6 text-green-600" />
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900">100 Free Credits</h3>
                  <p className="text-sm text-gray-600">Start analyzing immediately</p>
                </div>
              </div>
              
              <div className="flex items-center space-x-4">
                <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center">
                  <Zap className="h-6 w-6 text-blue-600" />
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900">AI-Powered Insights</h3>
                  <p className="text-sm text-gray-600">Get personalized recommendations</p>
                </div>
              </div>
              
              <div className="flex items-center space-x-4">
                <div className="w-12 h-12 bg-purple-100 rounded-xl flex items-center justify-center">
                  <Shield className="h-6 w-6 text-purple-600" />
                </div>
                <div>
                  <h3 className="font-semibent text-gray-900">Secure & Private</h3>
                  <p className="text-sm text-gray-600">Your data is protected</p>
                </div>
              </div>
            </div>

            {/* Credit Preview */}
            <div className="bg-gradient-to-r from-green-50 to-blue-50 border border-green-200/50 rounded-xl p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 bg-gradient-to-br from-green-400 to-blue-500 rounded-lg flex items-center justify-center">
                    <Sparkles className="h-5 w-5 text-white" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900">Welcome Credits</h3>
                    <p className="text-sm text-gray-600">Ready to use immediately</p>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-2xl font-bold text-green-600">{creditPreview}</div>
                  <div className="text-xs text-gray-500">credits</div>
                </div>
              </div>
              {(referralCode || manualReferralCode.trim()) && (
                <div className="mt-3 flex items-center space-x-2 text-sm">
                  <Gift className="h-4 w-4 text-green-600" />
                  <span className="text-green-700 font-medium">
                    +300 bonus credits with referral code!
                  </span>
                </div>
              )}
            </div>


            {/* Social Proof */}
            {/* <div className="bg-white/50 backdrop-blur-sm rounded-2xl p-6 border border-white/20 shadow-lg">
              <div className="flex items-center justify-between mb-4">
                <div className="text-center">
                  <div className="text-2xl font-bold text-primary">10K+</div>
                  <div className="text-xs text-gray-600">Users</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-primary">94%</div>
                  <div className="text-xs text-gray-600">Success</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-primary">4.9</div>
                  <div className="text-xs text-gray-600 flex items-center">
                    <Star className="h-3 w-3 text-yellow-400 fill-current mr-1" />
                    Rating
                  </div>
                </div>
              </div>
              <p className="text-sm text-gray-600 text-center">
                "ReviewMe helped me land my dream job at Microsoft!"
              </p>
              <p className="text-xs text-gray-500 text-center mt-1">- Sarah Chen, Software Engineer</p>
            </div> */}
          </div>
        </div>

        {/* Right Side - Signup Form */}
        <div className="flex-1 flex items-center justify-center p-4 sm:p-6 lg:p-12">
          <div className="w-full max-w-md space-y-6">
            {/* Back to home */}
            <Link 
              href="/" 
              className="inline-flex items-center text-sm text-gray-600 hover:text-primary mb-4 transition-colors group"
            >
              <ArrowLeft className="w-4 h-4 mr-2 transition-transform group-hover:-translate-x-1" />
              Back to home
            </Link>

            {/* Form Header */}
            <div className="text-center space-y-2">
              <h2 className="text-2xl sm:text-3xl font-bold text-gray-900">
                Create your account
              </h2>
              <p className="text-gray-600">
                Join thousands of professionals boosting their careers
              </p>
            </div>

            {/* Progress Indicator */}
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-sm font-medium text-gray-700">Profile completion</span>
                <span className="text-sm text-primary font-semibold">{getFormProgress()}%</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2 overflow-hidden">
                <div 
                  className="h-2 bg-gradient-to-r from-primary to-blue-600 rounded-full transition-all duration-500 ease-out"
                  style={{ width: `${getFormProgress()}%` }}
                ></div>
              </div>
            </div>

            
            {/* Main Form Card */}
            <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-xl border border-white/20 p-6 sm:p-8 space-y-6">
              {/* OAuth Buttons - Commented out for now */}
              {/*
              <div className="space-y-3">
                <button
                  type="button"
                  onClick={() => handleOAuthSignIn('github')}
                  disabled={isLoading}
                  className={cn(
                    "w-full inline-flex justify-center items-center px-4 py-3 border border-gray-200 rounded-xl shadow-sm bg-white text-sm font-medium text-gray-700 hover:bg-gray-50 hover:border-gray-300 transition-all duration-200 hover:shadow-md",
                    isLoading && "opacity-50 cursor-not-allowed"
                  )}
                >
                  <Github className="w-5 h-5 mr-3" />
                  Continue with GitHub
                </button>

                <button
                  type="button"
                  onClick={() => handleOAuthSignIn('google')}
                  disabled={isLoading}
                  className={cn(
                    "w-full inline-flex justify-center items-center px-4 py-3 border border-gray-200 rounded-xl shadow-sm bg-white text-sm font-medium text-gray-700 hover:bg-gray-50 hover:border-gray-300 transition-all duration-200 hover:shadow-md",
                    isLoading && "opacity-50 cursor-not-allowed"
                  )}
                >
                  <svg className="w-5 h-5 mr-3" viewBox="0 0 24 24">
                    <path
                      fill="#4285F4"
                      d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                    />
                    <path
                      fill="#34A853"
                      d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                    />
                    <path
                      fill="#FBBC05"
                      d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                    />
                    <path
                      fill="#EA4335"
                      d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                    />
                  </svg>
                  Continue with Google
                </button>
              </div>
              */}

              {/* Divider - Hidden when OAuth is commented out */}
              {/*
              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-gray-200" />
                </div>
                <div className="relative flex justify-center text-sm">
                  <span className="px-4 bg-white text-gray-500 font-medium">Or create with email</span>
                </div>
              </div>
              */}

              {/* Registration Form */}
              <form className="space-y-5" onSubmit={handleSubmit}>
                {error && (
                  <div className="bg-red-50 border border-red-200 rounded-xl p-4 animate-shake">
                    <div className="flex items-center space-x-2">
                      <X className="h-5 w-5 text-red-500" />
                      <p className="text-sm text-red-600 font-medium">{error}</p>
                    </div>
                  </div>
                )}

                {success && (
                  <div className="bg-green-50 border border-green-200 rounded-xl p-4 animate-bounce-in">
                    <div className="flex items-center space-x-2">
                      <Check className="h-5 w-5 text-green-500" />
                      <p className="text-sm text-green-600 font-medium">{success}</p>
                    </div>
                  </div>
                )}

                {/* Name Field */}
                <div className="space-y-2">
                  <label htmlFor="name" className="block text-sm font-semibold text-gray-700">
                    Full name *
                  </label>
                  <div className="relative group">
                    <input
                      id="name"
                      name="name"
                      type="text"
                      autoComplete="name"
                      required
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      className="w-full px-4 py-3 border border-gray-200 rounded-xl placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all duration-200 bg-gray-50/50 group-hover:bg-white"
                      placeholder="Enter your full name"
                    />
                    {formData.name && (
                      <Check className="absolute right-3 top-3.5 h-5 w-5 text-green-500 animate-scale-in" />
                    )}
                  </div>
                </div>

                {/* Email Field */}
                <div className="space-y-2">
                  <label htmlFor="email" className="block text-sm font-semibold text-gray-700">
                    Email address *
                  </label>
                  <div className="relative group">
                    <input
                      id="email"
                      name="email"
                      type="email"
                      autoComplete="email"
                      required
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      className="w-full px-4 py-3 border border-gray-200 rounded-xl placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all duration-200 bg-gray-50/50 group-hover:bg-white pr-10"
                      placeholder="Enter your email"
                    />
                    <Mail className="absolute right-3 top-3.5 h-5 w-5 text-gray-400" />
                    {formData.email && formData.email.includes('@') && (
                      <Check className="absolute right-10 top-3.5 h-5 w-5 text-green-500 animate-scale-in" />
                    )}
                  </div>
                </div>

                {/* Password Field */}
                <div className="space-y-2">
                  <label htmlFor="password" className="block text-sm font-semibold text-gray-700">
                    Password *
                  </label>
                  <div className="relative group">
                    <input
                      id="password"
                      name="password"
                      type={showPassword ? 'text' : 'password'}
                      autoComplete="new-password"
                      required
                      value={formData.password}
                      onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                      className="w-full px-4 py-3 border border-gray-200 rounded-xl placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all duration-200 bg-gray-50/50 group-hover:bg-white pr-10"
                      placeholder="Create a strong password"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-3.5 text-gray-400 hover:text-gray-600 transition-colors"
                    >
                      {showPassword ? (
                        <EyeOff className="h-5 w-5" />
                      ) : (
                        <Eye className="h-5 w-5" />
                      )}
                    </button>
                  </div>

                  {/* Password Strength Indicator */}
                  {formData.password && (
                    <div className="space-y-2">
                      <div className="flex justify-between items-center">
                        <span className="text-xs font-medium text-gray-600">Password strength</span>
                        <span className={cn(
                          "text-xs font-semibold",
                          isPasswordValid ? "text-green-600" : "text-orange-600"
                        )}>
                          {isPasswordValid ? "Strong" : "Weak"}
                        </span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-1.5 overflow-hidden">
                        <div 
                          className={cn(
                            "h-1.5 rounded-full transition-all duration-300",
                            isPasswordValid ? "bg-green-500" : "bg-orange-400"
                          )}
                          style={{ width: `${(passwordRequirements.filter(req => req.met).length / passwordRequirements.length) * 100}%` }}
                        ></div>
                      </div>
                      <div className="grid grid-cols-1 gap-1 mt-2">
                        {passwordRequirements.map((req, index) => (
                          <div key={index} className="flex items-center text-xs">
                            {req.met ? (
                              <Check className="w-3 h-3 text-green-500 mr-2 animate-scale-in" />
                            ) : (
                              <X className="w-3 h-3 text-gray-400 mr-2" />
                            )}
                            <span className={req.met ? 'text-green-600' : 'text-gray-500'}>
                              {req.text}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {/* Confirm Password Field */}
                <div className="space-y-2">
                  <label htmlFor="confirmPassword" className="block text-sm font-semibold text-gray-700">
                    Confirm password *
                  </label>
                  <div className="relative group">
                    <input
                      id="confirmPassword"
                      name="confirmPassword"
                      type={showConfirmPassword ? 'text' : 'password'}
                      autoComplete="new-password"
                      required
                      value={formData.confirmPassword}
                      onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                      className={cn(
                        "w-full px-4 py-3 border rounded-xl placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all duration-200 bg-gray-50/50 group-hover:bg-white pr-10",
                        formData.confirmPassword && !passwordsMatch
                          ? "border-red-300 focus:ring-red-100 focus:border-red-400"
                          : "border-gray-200"
                      )}
                      placeholder="Confirm your password"
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      className="absolute right-3 top-3.5 text-gray-400 hover:text-gray-600 transition-colors"
                    >
                      {showConfirmPassword ? (
                        <EyeOff className="h-5 w-5" />
                      ) : (
                        <Eye className="h-5 w-5" />
                      )}
                    </button>
                    {formData.confirmPassword && (
                      <div className="absolute right-10 top-3.5">
                        {passwordsMatch ? (
                          <Check className="h-5 w-5 text-green-500 animate-scale-in" />
                        ) : (
                          <X className="h-5 w-5 text-red-500" />
                        )}
                      </div>
                    )}
                  </div>
                  {formData.confirmPassword && !passwordsMatch && (
                    <p className="text-xs text-red-600 flex items-center">
                      <X className="w-3 h-3 mr-1" />
                      Passwords do not match
                    </p>
                  )}
                </div>

                {/* Referral Code Input - Show only if no referral code in URL */}
                {!referralCode && (
                  <div className="space-y-2">
                    <label htmlFor="referralCode" className="block text-sm font-semibold text-gray-700">
                      Referral code <span className="text-gray-500 font-normal">(optional)</span>
                    </label>
                    <div className="relative group">
                      <input
                        id="referralCode"
                        name="referralCode"
                        type="text"
                        value={manualReferralCode}
                        onChange={(e) => setManualReferralCode(e.target.value.toUpperCase())}
                        className="w-full px-4 py-3 border border-gray-200 rounded-xl placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all duration-200 bg-gray-50/50 group-hover:bg-white pr-10"
                        placeholder="Enter referral code (e.g., REF123456)"
                        maxLength={10}
                      />
                      <Gift className="absolute right-3 top-3.5 h-5 w-5 text-gray-400" />
                      {manualReferralCode.trim() && (
                        <Check className="absolute right-10 top-3.5 h-5 w-5 text-green-500 animate-scale-in" />
                      )}
                    </div>
                    {manualReferralCode.trim() && (
                      <div className="flex items-center space-x-2 text-xs text-green-700 bg-green-50 rounded-lg p-2">
                        <Sparkles className="h-4 w-4" />
                        <span className="font-medium">Great! You'll get +300 bonus credits with this referral code.</span>
                      </div>
                    )}
                  </div>
                )}

                {/* Terms Agreement */}
                <div className="space-y-3">
                  <div className="flex items-start space-x-3">
                    <div className="flex-shrink-0 pt-0.5">
                      <input
                        id="agreeToTerms"
                        name="agreeToTerms"
                        type="checkbox"
                        checked={formData.agreeToTerms}
                        onChange={(e) => setFormData({ ...formData, agreeToTerms: e.target.checked })}
                        className="h-4 w-4 text-primary focus:ring-primary border-gray-300 rounded transition-colors"
                      />
                    </div>
                    <label htmlFor="agreeToTerms" className="text-sm text-gray-700 leading-relaxed">
                      I agree to the{' '}
                      <Link href="/terms" className="text-primary hover:text-primary/80 font-medium underline transition-colors">
                        Terms of Service
                      </Link>{' '}
                      and{' '}
                      <Link href="/privacy" className="text-primary hover:text-primary/80 font-medium underline transition-colors">
                        Privacy Policy
                      </Link>
                    </label>
                  </div>
                  
                  {/* Trust Indicators */}
                  <div className="flex items-center justify-center space-x-6 text-xs text-gray-500 pt-2">
                    <div className="flex items-center space-x-1">
                      <Shield className="h-3 w-3" />
                      <span>GDPR Compliant</span>
                    </div>
                    <div className="flex items-center space-x-1">
                      <Users className="h-3 w-3" />
                      <span>10K+ Users</span>
                    </div>
                    <div className="flex items-center space-x-1">
                      <Star className="h-3 w-3 text-yellow-400 fill-current" />
                      <span>4.9 Rating</span>
                    </div>
                  </div>
                </div>

                {/* Submit Button */}
                <div className="space-y-3">
                  <button
                    type="submit"
                    disabled={isLoading || !isPasswordValid || !passwordsMatch || !formData.agreeToTerms}
                    className={cn(
                      "w-full flex justify-center items-center py-4 px-6 rounded-xl text-sm font-semibold text-white transition-all duration-200 shadow-lg",
                      "bg-gradient-to-r from-primary to-blue-600 hover:from-primary/90 hover:to-blue-600/90",
                      "focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary/50",
                      "transform hover:scale-[1.02] active:scale-[0.98]",
                      (isLoading || !isPasswordValid || !passwordsMatch || !formData.agreeToTerms) && 
                      "opacity-50 cursor-not-allowed hover:scale-100 active:scale-100"
                    )}
                  >
                    {isLoading ? (
                      <div className="flex items-center space-x-2">
                        <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        <span>Creating account...</span>
                      </div>
                    ) : (
                      <div className="flex items-center space-x-2">
                        <span>Create account</span>
                        <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
                      </div>
                    )}
                  </button>

                  {/* Signup Benefits Reminder */}
                  <div className="bg-gradient-to-r from-green-50 to-blue-50 border border-green-200/50 rounded-xl p-3">
                    <div className="flex items-center justify-center space-x-4 text-xs text-gray-600">
                      <div className="flex items-center space-x-1">
                        <Check className="h-3 w-3 text-green-500" />
                        <span>Free {creditPreview} Credits</span>
                      </div>
                      <div className="flex items-center space-x-1">
                        <Check className="h-3 w-3 text-green-500" />
                        <span>No Credit Card</span>
                      </div>
                      <div className="flex items-center space-x-1">
                        <Check className="h-3 w-3 text-green-500" />
                        <span>Instant Access</span>
                      </div>
                    </div>
                  </div>
                </div>
              </form>

              {/* Social Proof and Support */}
              <div className="space-y-4">
                <div className="text-center">
                  <p className="text-sm text-gray-600">
                    Already have an account?{' '}
                    <Link
                      href="/auth/signin"
                      className="font-semibold text-primary hover:text-primary/80 transition-colors"
                    >
                      Sign in here
                    </Link>
                  </p>
                </div>

                {/* Quick Support */}
                <div className="text-center text-xs text-gray-500">
                  <p>Need help? <Link href="/support" className="text-primary hover:underline">Contact Support</Link></p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
    </AuthRouteGuard>
  );
}