'use client';

import Link from 'next/link';
import { ArrowRight, Github, Linkedin, FileText, BarChart3, Users, Shield, Zap, Star, Play, ChevronDown, CheckCircle, Quote, Award, TrendingUp, DollarSign, Gift, UserPlus, ChevronLeft, ChevronRight, Menu, X } from 'lucide-react';
import { useState } from 'react';

export default function HomePage() {
  const [currentTestimonial, setCurrentTestimonial] = useState(0);
  const [openFaq, setOpenFaq] = useState<number | null>(null);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Sample testimonials data
  const testimonials = [
    {
      name: "Sarah Chen",
      role: "Software Engineer",
      company: "Microsoft",
      image: "/avatars/sarah.jpg",
      rating: 5,
      text: "ReviewMe helped me optimize my GitHub profile and land my dream job. The AI recommendations were spot-on and actionable."
    },
    {
      name: "Marcus Rodriguez",
      role: "Data Scientist",
      company: "Google",
      image: "/avatars/marcus.jpg",
      rating: 5,
      text: "The LinkedIn analysis feature gave me insights I never considered. My profile views increased by 300% after implementing their suggestions."
    },
    {
      name: "Emily Johnson",
      role: "Product Manager",
      company: "Stripe",
      image: "/avatars/emily.jpg",
      rating: 5,
      text: "The resume scoring feature helped me understand what recruiters are actually looking for. I got 5x more interview calls!"
    }
  ];

  // FAQ data
  const faqs = [
    {
      question: "How does ReviewMe analyze my profiles?",
      answer: "We use advanced AI algorithms to analyze your GitHub repositories, LinkedIn profile completeness, and resume format. Our system checks for best practices, keyword optimization, and industry standards."
    },
    {
      question: "Is my data secure and private?",
      answer: "Yes, absolutely. We use enterprise-grade encryption and never store sensitive personal information. You can delete your data at any time, and we're fully GDPR compliant."
    },
    {
      question: "How does the credit system work?",
      answer: "You start with 100 free credits. Each analysis costs credits (GitHub: 20, LinkedIn: 15, Resume: 20). Earn 200 credits for each successful referral!"
    },
    {
      question: "Can I export my analysis results?",
      answer: "Yes, you can export all your analysis results, recommendations, and progress reports in PDF format from your dashboard."
    },
    {
      question: "How often should I re-analyze my profiles?",
      answer: "We recommend re-analyzing every 2-3 months or after major updates to your profiles. Our system tracks changes and highlights improvements."
    }
  ];

  const nextTestimonial = () => {
    setCurrentTestimonial((prev) => (prev + 1) % testimonials.length);
  };

  const prevTestimonial = () => {
    setCurrentTestimonial((prev) => (prev - 1 + testimonials.length) % testimonials.length);
  };

  const toggleFaq = (index: number) => {
    setOpenFaq(openFaq === index ? null : index);
  };
  return (
    <div className="flex flex-col min-h-screen bg-white">
      {/* Enhanced Header */}
      <header className="sticky top-0 z-50 border-b bg-white/95 backdrop-blur supports-[backdrop-filter]:bg-white/60 shadow-sm">
        <div className="container mx-auto flex h-16 items-center justify-between px-4 lg:px-6">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-gradient-to-br from-primary to-blue-600 rounded-lg">
              <BarChart3 className="h-6 w-6 text-white" />
            </div>
            <span className="text-2xl font-bold gradient-text tracking-tight">ReviewMe</span>
          </div>
          
          {/* Desktop Navigation */}
          <nav className="hidden lg:flex items-center space-x-8 text-sm font-medium">
            <Link href="#features" className="transition-colors hover:text-primary focus:text-primary">
              Features
            </Link>
            <Link href="#how-it-works" className="transition-colors hover:text-primary focus:text-primary">
              How it Works
            </Link>
            <Link href="#pricing" className="transition-colors hover:text-primary focus:text-primary">
              Pricing
            </Link>
            <Link href="#testimonials" className="transition-colors hover:text-primary focus:text-primary">
              Reviews
            </Link>
            <Link href="#faq" className="transition-colors hover:text-primary focus:text-primary">
              FAQ
            </Link>
          </nav>
          
          {/* Desktop Auth Buttons */}
          <div className="hidden lg:flex items-center space-x-4">
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
              <Link href="#features" className="block text-sm font-medium hover:text-primary">
                Features
              </Link>
              <Link href="#how-it-works" className="block text-sm font-medium hover:text-primary">
                How it Works
              </Link>
              <Link href="#pricing" className="block text-sm font-medium hover:text-primary">
                Pricing
              </Link>
              <Link href="#testimonials" className="block text-sm font-medium hover:text-primary">
                Reviews
              </Link>
              <Link href="#faq" className="block text-sm font-medium hover:text-primary">
                FAQ
              </Link>
              <div className="pt-4 border-t space-y-2">
                <Link href="/auth/signin" className="block btn-ghost text-sm">
                  Sign In
                </Link>
                <Link href="/auth/signup" className="block btn-primary text-sm">
                  Get Started Free
                </Link>
              </div>
            </nav>
          </div>
        )}
      </header>

      {/* Enhanced Hero Section */}
      <section className="relative overflow-hidden bg-gradient-to-br from-blue-50 via-white to-purple-50 px-4 py-16 lg:py-24">
        {/* Background decoration */}
        <div className="absolute inset-0 bg-grid-pattern opacity-5"></div>
        <div className="absolute top-20 left-20 w-32 h-32 bg-primary/10 rounded-full blur-3xl"></div>
        <div className="absolute bottom-20 right-20 w-48 h-48 bg-blue-500/10 rounded-full blur-3xl"></div>
        
        <div className="container mx-auto max-w-7xl relative">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            {/* Left Column - Content */}
            <div className="space-y-8">
              <div className="space-y-6">
                <div className="inline-flex items-center px-4 py-2 bg-blue-100 text-blue-800 rounded-full text-sm font-medium">
                  🚀 AI-Powered Career Optimization
                </div>
                
                <h1 className="text-4xl lg:text-6xl font-bold tracking-tight leading-tight">
                  Optimize Your
                  <span className="gradient-text block">Professional Profile</span>
                  <span className="text-2xl lg:text-4xl text-muted-foreground font-normal block mt-2">
                    Get Hired Faster
                  </span>
                </h1>
                
                <p className="text-xl text-muted-foreground leading-relaxed max-w-2xl">
                  Transform your GitHub, LinkedIn, and resume with AI-powered insights. 
                  Join <strong className="text-foreground">10,000+</strong> professionals who 
                  boosted their career prospects with personalized recommendations.
                </p>
              </div>

              {/* CTA Buttons */}
              <div className="flex flex-col sm:flex-row gap-4">
                <Link 
                  href="/auth/signup" 
                  className="btn-primary text-lg px-8 py-4 group shadow-lg hover:shadow-xl transition-all"
                >
                  Start Free Analysis
                  <ArrowRight className="ml-2 h-5 w-5 transition-transform group-hover:translate-x-1" />
                </Link>
                <button 
                  className="btn-secondary text-lg px-8 py-4 group"
                  onClick={() => document.getElementById('demo-video')?.scrollIntoView({ behavior: 'smooth' })}
                >
                  <Play className="mr-2 h-5 w-5" />
                  Watch Demo
                </button>
              </div>

              {/* Trust Indicators */}
              <div className="flex flex-wrap items-center gap-6 pt-4">
                <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                  <CheckCircle className="h-4 w-4 text-green-500" />
                  <span>No Credit Card Required</span>
                </div>
                <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                  <CheckCircle className="h-4 w-4 text-green-500" />
                  <span>100 Free Credits</span>
                </div>
                <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                  <CheckCircle className="h-4 w-4 text-green-500" />
                  <span>GDPR Compliant</span>
                </div>
              </div>
            </div>

            {/* Right Column - Video/Demo */}
            <div className="relative">
              <div className="relative rounded-2xl overflow-hidden shadow-2xl bg-gradient-to-br from-gray-900 to-gray-800">
                <div className="aspect-video bg-gradient-to-br from-primary/20 to-blue-600/20 flex items-center justify-center">
                  <div className="text-center space-y-4">
                    <div className="w-20 h-20 bg-white/20 rounded-full flex items-center justify-center mx-auto backdrop-blur-sm">
                      <Play className="h-8 w-8 text-white ml-1" />
                    </div>
                    <div className="text-white">
                      <h3 className="text-xl font-semibold">See ReviewMe in Action</h3>
                      <p className="text-white/80 text-sm">2-minute product demo</p>
                    </div>
                  </div>
                </div>
                {/* Placeholder for actual video */}
                <div className="absolute inset-0 bg-black/50 opacity-0 hover:opacity-100 transition-opacity flex items-center justify-center cursor-pointer" id="demo-video">
                  <div className="text-white text-center">
                    <Play className="h-16 w-16 mx-auto mb-2" />
                    <p className="text-sm">Click to play demo</p>
                  </div>
                </div>
              </div>
              
              {/* Floating stats */}
              <div className="absolute -bottom-6 -left-6 bg-white rounded-2xl shadow-xl p-4 border">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center">
                    <TrendingUp className="h-5 w-5 text-green-600" />
                  </div>
                  <div>
                    <div className="text-2xl font-bold text-green-600">94%</div>
                    <div className="text-xs text-muted-foreground">Success Rate</div>
                  </div>
                </div>
              </div>
              
              <div className="absolute -top-6 -right-6 bg-white rounded-2xl shadow-xl p-4 border">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                    <Users className="h-5 w-5 text-blue-600" />
                  </div>
                  <div>
                    <div className="text-2xl font-bold text-blue-600">10K+</div>
                    <div className="text-xs text-muted-foreground">Users</div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Social Proof Logos */}
          <div className="mt-16 pt-8 border-t border-gray-200">
            <p className="text-center text-sm text-muted-foreground mb-8">Trusted by professionals at</p>
            <div className="flex flex-wrap justify-center items-center gap-8 opacity-60">
              <div className="text-2xl font-bold text-gray-400">Microsoft</div>
              <div className="text-2xl font-bold text-gray-400">Google</div>
              <div className="text-2xl font-bold text-gray-400">Amazon</div>
              <div className="text-2xl font-bold text-gray-400">Apple</div>
              <div className="text-2xl font-bold text-gray-400">Meta</div>
              <div className="text-2xl font-bold text-gray-400">Netflix</div>
            </div>
          </div>
        </div>
      </section>

      {/* How It Works Section */}
      <section id="how-it-works" className="py-20 bg-gray-50">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">
              How ReviewMe Works
            </h2>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              Get professional insights in just 3 simple steps
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8 max-w-4xl mx-auto">
            {/* Step 1 */}
            <div className="text-center group">
              <div className="relative mb-6">
                <div className="w-20 h-20 bg-primary rounded-full flex items-center justify-center mx-auto shadow-lg group-hover:scale-110 transition-transform">
                  <UserPlus className="h-10 w-10 text-white" />
                </div>
                <div className="absolute -top-2 -right-2 w-8 h-8 bg-blue-600 text-white rounded-full flex items-center justify-center text-sm font-bold">
                  1
                </div>
              </div>
              <h3 className="text-xl font-semibold mb-3">Sign Up & Connect</h3>
              <p className="text-muted-foreground">
                Create your free account and connect your GitHub, LinkedIn, or upload your resume. 
                No credit card required.
              </p>
            </div>

            {/* Step 2 */}
            <div className="text-center group">
              <div className="relative mb-6">
                <div className="w-20 h-20 bg-primary rounded-full flex items-center justify-center mx-auto shadow-lg group-hover:scale-110 transition-transform">
                  <BarChart3 className="h-10 w-10 text-white" />
                </div>
                <div className="absolute -top-2 -right-2 w-8 h-8 bg-blue-600 text-white rounded-full flex items-center justify-center text-sm font-bold">
                  2
                </div>
              </div>
              <h3 className="text-xl font-semibold mb-3">AI Analysis</h3>
              <p className="text-muted-foreground">
                Our advanced AI analyzes your profiles for optimization opportunities, 
                scoring quality, completeness, and industry standards.
              </p>
            </div>

            {/* Step 3 */}
            <div className="text-center group">
              <div className="relative mb-6">
                <div className="w-20 h-20 bg-primary rounded-full flex items-center justify-center mx-auto shadow-lg group-hover:scale-110 transition-transform">
                  <TrendingUp className="h-10 w-10 text-white" />
                </div>
                <div className="absolute -top-2 -right-2 w-8 h-8 bg-blue-600 text-white rounded-full flex items-center justify-center text-sm font-bold">
                  3
                </div>
              </div>
              <h3 className="text-xl font-semibold mb-3">Implement & Grow</h3>
              <p className="text-muted-foreground">
                Get personalized, actionable recommendations ranked by impact. 
                Track your progress and watch your opportunities grow.
              </p>
            </div>
          </div>

          {/* Process Flow */}
          <div className="mt-16 max-w-2xl mx-auto">
            <div className="bg-white rounded-2xl p-8 shadow-lg border">
              <h3 className="text-2xl font-bold text-center mb-6">What Gets Analyzed?</h3>
              <div className="grid md:grid-cols-3 gap-6">
                <div className="text-center">
                  <div className="w-12 h-12 bg-github/10 rounded-lg flex items-center justify-center mx-auto mb-3">
                    <Github className="h-6 w-6 text-github" />
                  </div>
                  <h4 className="font-semibold mb-2">GitHub</h4>
                  <ul className="text-sm text-muted-foreground space-y-1">
                    <li>Repository quality</li>
                    <li>Commit patterns</li>
                    <li>Documentation</li>
                    <li>Collaboration</li>
                  </ul>
                </div>
                <div className="text-center">
                  <div className="w-12 h-12 bg-linkedin/10 rounded-lg flex items-center justify-center mx-auto mb-3">
                    <Linkedin className="h-6 w-6 text-linkedin" />
                  </div>
                  <h4 className="font-semibold mb-2">LinkedIn</h4>
                  <ul className="text-sm text-muted-foreground space-y-1">
                    <li>Profile completeness</li>
                    <li>Keyword optimization</li>
                    <li>Professional summary</li>
                    <li>Network engagement</li>
                  </ul>
                </div>
                <div className="text-center">
                  <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center mx-auto mb-3">
                    <FileText className="h-6 w-6 text-green-600" />
                  </div>
                  <h4 className="font-semibold mb-2">Resume</h4>
                  <ul className="text-sm text-muted-foreground space-y-1">
                    <li>ATS compatibility</li>
                    <li>Format structure</li>
                    <li>Keyword density</li>
                    <li>Impact quantification</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="py-20 bg-white">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <div className="inline-flex items-center px-4 py-2 bg-primary/10 text-primary rounded-full text-sm font-medium mb-4">
              ✨ Powerful Features
            </div>
            <h2 className="text-3xl md:text-4xl font-bold mb-4">
              Everything You Need to Excel
            </h2>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              Our platform analyzes your professional presence across multiple channels 
              and provides actionable insights to help you stand out.
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {/* GitHub Analysis */}
            <div className="group card p-8 hover:shadow-xl transition-all duration-300 hover:-translate-y-1">
              <div className="flex items-center mb-6">
                <div className="p-3 bg-github/10 rounded-xl group-hover:bg-github/20 transition-colors">
                  <Github className="h-8 w-8 text-github" />
                </div>
                <h3 className="text-xl font-semibold ml-4">GitHub Analysis</h3>
              </div>
              <p className="text-muted-foreground mb-6 leading-relaxed">
                Analyze repository quality, contribution patterns, documentation, 
                and collaboration metrics to showcase your technical expertise.
              </p>
              <ul className="space-y-3">
                <li className="flex items-center gap-3 text-sm">
                  <CheckCircle className="w-4 h-4 text-green-500 flex-shrink-0" />
                  <span>Code quality assessment</span>
                </li>
                <li className="flex items-center gap-3 text-sm">
                  <CheckCircle className="w-4 h-4 text-green-500 flex-shrink-0" />
                  <span>Activity analysis & trends</span>
                </li>
                <li className="flex items-center gap-3 text-sm">
                  <CheckCircle className="w-4 h-4 text-green-500 flex-shrink-0" />
                  <span>Documentation review</span>
                </li>
              </ul>
            </div>

            {/* LinkedIn Optimization */}
            <div className="group card p-8 hover:shadow-xl transition-all duration-300 hover:-translate-y-1">
              <div className="flex items-center mb-6">
                <div className="p-3 bg-linkedin/10 rounded-xl group-hover:bg-linkedin/20 transition-colors">
                  <Linkedin className="h-8 w-8 text-linkedin" />
                </div>
                <h3 className="text-xl font-semibold ml-4">LinkedIn Optimization</h3>
              </div>
              <p className="text-muted-foreground mb-6 leading-relaxed">
                Evaluate profile completeness, keyword optimization, and professional 
                branding to maximize your visibility to recruiters.
              </p>
              <ul className="space-y-3">
                <li className="flex items-center gap-3 text-sm">
                  <CheckCircle className="w-4 h-4 text-green-500 flex-shrink-0" />
                  <span>Profile completeness score</span>
                </li>
                <li className="flex items-center gap-3 text-sm">
                  <CheckCircle className="w-4 h-4 text-green-500 flex-shrink-0" />
                  <span>Keyword analysis & optimization</span>
                </li>
                <li className="flex items-center gap-3 text-sm">
                  <CheckCircle className="w-4 h-4 text-green-500 flex-shrink-0" />
                  <span>Network insights & growth tips</span>
                </li>
              </ul>
            </div>

            {/* Resume Scoring */}
            <div className="group card p-8 hover:shadow-xl transition-all duration-300 hover:-translate-y-1">
              <div className="flex items-center mb-6">
                <div className="p-3 bg-green-100 rounded-xl group-hover:bg-green-200 transition-colors">
                  <FileText className="h-8 w-8 text-green-600" />
                </div>
                <h3 className="text-xl font-semibold ml-4">ATS Resume Scoring</h3>
              </div>
              <p className="text-muted-foreground mb-6 leading-relaxed">
                Get detailed feedback on resume formatting, keyword usage, 
                and ATS compatibility to improve your application success rate.
              </p>
              <ul className="space-y-3">
                <li className="flex items-center gap-3 text-sm">
                  <CheckCircle className="w-4 h-4 text-green-500 flex-shrink-0" />
                  <span>ATS compatibility check</span>
                </li>
                <li className="flex items-center gap-3 text-sm">
                  <CheckCircle className="w-4 h-4 text-green-500 flex-shrink-0" />
                  <span>Keyword optimization</span>
                </li>
                <li className="flex items-center gap-3 text-sm">
                  <CheckCircle className="w-4 h-4 text-green-500 flex-shrink-0" />
                  <span>Format & structure analysis</span>
                </li>
              </ul>
            </div>

            {/* AI Recommendations */}
            <div className="group card p-8 hover:shadow-xl transition-all duration-300 hover:-translate-y-1">
              <div className="flex items-center mb-6">
                <div className="p-3 bg-purple-100 rounded-xl group-hover:bg-purple-200 transition-colors">
                  <Zap className="h-8 w-8 text-purple-600" />
                </div>
                <h3 className="text-xl font-semibold ml-4">AI Recommendations</h3>
              </div>
              <p className="text-muted-foreground mb-6 leading-relaxed">
                Receive personalized, actionable recommendations powered by 
                machine learning to prioritize your improvement efforts.
              </p>
              <ul className="space-y-3">
                <li className="flex items-center gap-3 text-sm">
                  <CheckCircle className="w-4 h-4 text-green-500 flex-shrink-0" />
                  <span>Prioritized suggestions by impact</span>
                </li>
                <li className="flex items-center gap-3 text-sm">
                  <CheckCircle className="w-4 h-4 text-green-500 flex-shrink-0" />
                  <span>Personalized action plans</span>
                </li>
                <li className="flex items-center gap-3 text-sm">
                  <CheckCircle className="w-4 h-4 text-green-500 flex-shrink-0" />
                  <span>Progress tracking & insights</span>
                </li>
              </ul>
            </div>

            {/* Security & Privacy */}
            <div className="group card p-8 hover:shadow-xl transition-all duration-300 hover:-translate-y-1">
              <div className="flex items-center mb-6">
                <div className="p-3 bg-blue-100 rounded-xl group-hover:bg-blue-200 transition-colors">
                  <Shield className="h-8 w-8 text-blue-600" />
                </div>
                <h3 className="text-xl font-semibold ml-4">Security & Privacy</h3>
              </div>
              <p className="text-muted-foreground mb-6 leading-relaxed">
                Your data is encrypted and secure. You control what data is analyzed 
                and can export or delete your information at any time.
              </p>
              <ul className="space-y-3">
                <li className="flex items-center gap-3 text-sm">
                  <CheckCircle className="w-4 h-4 text-green-500 flex-shrink-0" />
                  <span>End-to-end encryption</span>
                </li>
                <li className="flex items-center gap-3 text-sm">
                  <CheckCircle className="w-4 h-4 text-green-500 flex-shrink-0" />
                  <span>GDPR compliant</span>
                </li>
                <li className="flex items-center gap-3 text-sm">
                  <CheckCircle className="w-4 h-4 text-green-500 flex-shrink-0" />
                  <span>Data export/deletion anytime</span>
                </li>
              </ul>
            </div>

            {/* Analytics Dashboard */}
            <div className="group card p-8 hover:shadow-xl transition-all duration-300 hover:-translate-y-1">
              <div className="flex items-center mb-6">
                <div className="p-3 bg-orange-100 rounded-xl group-hover:bg-orange-200 transition-colors">
                  <BarChart3 className="h-8 w-8 text-orange-600" />
                </div>
                <h3 className="text-xl font-semibold ml-4">Analytics Dashboard</h3>
              </div>
              <p className="text-muted-foreground mb-6 leading-relaxed">
                Visual insights and trend analysis help you track progress 
                and understand your professional growth over time.
              </p>
              <ul className="space-y-3">
                <li className="flex items-center gap-3 text-sm">
                  <CheckCircle className="w-4 h-4 text-green-500 flex-shrink-0" />
                  <span>Progress tracking over time</span>
                </li>
                <li className="flex items-center gap-3 text-sm">
                  <CheckCircle className="w-4 h-4 text-green-500 flex-shrink-0" />
                  <span>Trend analysis & predictions</span>
                </li>
                <li className="flex items-center gap-3 text-sm">
                  <CheckCircle className="w-4 h-4 text-green-500 flex-shrink-0" />
                  <span>Peer benchmarking insights</span>
                </li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* Customer Testimonials Section */}
      <section id="testimonials" className="py-20 bg-gray-50">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <div className="inline-flex items-center px-4 py-2 bg-yellow-100 text-yellow-800 rounded-full text-sm font-medium mb-4">
              🎆 Success Stories
            </div>
            <h2 className="text-3xl md:text-4xl font-bold mb-4">
              Loved by 10,000+ Professionals
            </h2>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              See how ReviewMe has helped professionals land their dream jobs
            </p>
          </div>

          {/* Testimonial Carousel */}
          <div className="relative max-w-4xl mx-auto">
            <div className="bg-white rounded-2xl shadow-xl p-8 md:p-12">
              <div className="text-center mb-8">
                <div className="flex justify-center mb-4">
                  {[...Array(testimonials[currentTestimonial].rating)].map((_, i) => (
                    <Star key={i} className="h-5 w-5 text-yellow-400 fill-current" />
                  ))}
                </div>
                <Quote className="h-12 w-12 text-primary/20 mx-auto mb-6" />
                <blockquote className="text-xl md:text-2xl text-gray-700 font-medium leading-relaxed mb-8">
                  "{testimonials[currentTestimonial].text}"
                </blockquote>
                
                <div className="flex items-center justify-center gap-4">
                  <div className="w-16 h-16 bg-gradient-to-br from-primary to-blue-600 rounded-full flex items-center justify-center text-white text-xl font-bold">
                    {testimonials[currentTestimonial].name.split(' ').map(n => n[0]).join('')}
                  </div>
                  <div className="text-left">
                    <div className="font-semibold text-lg">{testimonials[currentTestimonial].name}</div>
                    <div className="text-muted-foreground">
                      {testimonials[currentTestimonial].role} at {testimonials[currentTestimonial].company}
                    </div>
                  </div>
                </div>
              </div>
              
              {/* Navigation */}
              <div className="flex items-center justify-center gap-4">
                <button
                  onClick={prevTestimonial}
                  className="p-2 rounded-full border border-gray-200 hover:bg-gray-50 transition-colors"
                  aria-label="Previous testimonial"
                >
                  <ChevronLeft className="h-5 w-5" />
                </button>
                
                <div className="flex gap-2">
                  {testimonials.map((_, index) => (
                    <button
                      key={index}
                      onClick={() => setCurrentTestimonial(index)}
                      className={`w-2 h-2 rounded-full transition-colors ${
                        index === currentTestimonial ? 'bg-primary' : 'bg-gray-300'
                      }`}
                      aria-label={`Go to testimonial ${index + 1}`}
                    />
                  ))}
                </div>
                
                <button
                  onClick={nextTestimonial}
                  className="p-2 rounded-full border border-gray-200 hover:bg-gray-50 transition-colors"
                  aria-label="Next testimonial"
                >
                  <ChevronRight className="h-5 w-5" />
                </button>
              </div>
            </div>
          </div>

          {/* Stats */}
          <div className="grid md:grid-cols-4 gap-8 mt-16">
            <div className="text-center">
              <div className="text-4xl font-bold text-primary mb-2">10,000+</div>
              <div className="text-muted-foreground">Happy Users</div>
            </div>
            <div className="text-center">
              <div className="text-4xl font-bold text-primary mb-2">94%</div>
              <div className="text-muted-foreground">Success Rate</div>
            </div>
            <div className="text-center">
              <div className="text-4xl font-bold text-primary mb-2">3.2x</div>
              <div className="text-muted-foreground">More Interviews</div>
            </div>
            <div className="text-center">
              <div className="text-4xl font-bold text-primary mb-2">15 days</div>
              <div className="text-muted-foreground">Avg. Job Hunt</div>
            </div>
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section id="pricing" className="py-20 bg-white">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <div className="inline-flex items-center px-4 py-2 bg-green-100 text-green-800 rounded-full text-sm font-medium mb-4">
              💰 Simple Pricing
            </div>
            <h2 className="text-3xl md:text-4xl font-bold mb-4">
              Start Free, Pay as You Grow
            </h2>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              No subscription fees. Pay only for what you use with our credit-based system.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
            {/* Free Plan */}
            <div className="card p-8 text-center">
              <div className="mb-6">
                <h3 className="text-2xl font-bold mb-2">Free</h3>
                <div className="text-4xl font-bold text-primary mb-2">$0</div>
                <div className="text-muted-foreground">Get started for free</div>
              </div>
              
              <div className="space-y-4 mb-8">
                <div className="flex items-center gap-3">
                  <CheckCircle className="w-5 h-5 text-green-500 flex-shrink-0" />
                  <span className="text-left">100 free credits to start</span>
                </div>
                <div className="flex items-center gap-3">
                  <CheckCircle className="w-5 h-5 text-green-500 flex-shrink-0" />
                  <span className="text-left">Basic profile analysis</span>
                </div>
                <div className="flex items-center gap-3">
                  <CheckCircle className="w-5 h-5 text-green-500 flex-shrink-0" />
                  <span className="text-left">AI recommendations</span>
                </div>
                <div className="flex items-center gap-3">
                  <CheckCircle className="w-5 h-5 text-green-500 flex-shrink-0" />
                  <span className="text-left">Progress tracking</span>
                </div>
                <div className="flex items-center gap-3">
                  <CheckCircle className="w-5 h-5 text-green-500 flex-shrink-0" />
                  <span className="text-left">Email support</span>
                </div>
              </div>
              
              <Link href="/auth/signup" className="btn-secondary w-full">
                Get Started Free
              </Link>
            </div>

            {/* Credit Packages */}
            <div className="card p-8 text-center border-2 border-primary relative">
              <div className="absolute -top-4 left-1/2 transform -translate-x-1/2">
                <span className="bg-primary text-white px-4 py-1 rounded-full text-sm font-medium">
                  Most Popular
                </span>
              </div>
              
              <div className="mb-6">
                <h3 className="text-2xl font-bold mb-2">Credit Package</h3>
                <div className="text-4xl font-bold text-primary mb-2">$19</div>
                <div className="text-muted-foreground">500 credits</div>
              </div>
              
              <div className="space-y-4 mb-8">
                <div className="flex items-center gap-3">
                  <CheckCircle className="w-5 h-5 text-green-500 flex-shrink-0" />
                  <span className="text-left">500 analysis credits</span>
                </div>
                <div className="flex items-center gap-3">
                  <CheckCircle className="w-5 h-5 text-green-500 flex-shrink-0" />
                  <span className="text-left">Priority support</span>
                </div>
                <div className="flex items-center gap-3">
                  <CheckCircle className="w-5 h-5 text-green-500 flex-shrink-0" />
                  <span className="text-left">Advanced analytics</span>
                </div>
                <div className="flex items-center gap-3">
                  <CheckCircle className="w-5 h-5 text-green-500 flex-shrink-0" />
                  <span className="text-left">Export reports (PDF)</span>
                </div>
                <div className="flex items-center gap-3">
                  <CheckCircle className="w-5 h-5 text-green-500 flex-shrink-0" />
                  <span className="text-left">No expiration</span>
                </div>
              </div>
              
              <Link href="/auth/signup" className="btn-primary w-full">
                Buy Credits
              </Link>
            </div>

            {/* Referral Program */}
            <div className="card p-8 text-center bg-gradient-to-br from-yellow-50 to-orange-50 border-yellow-200">
              <div className="mb-6">
                <Gift className="h-12 w-12 text-yellow-600 mx-auto mb-4" />
                <h3 className="text-2xl font-bold mb-2 text-yellow-800">Refer & Earn</h3>
                <div className="text-4xl font-bold text-yellow-600 mb-2">Free Credits</div>
                <div className="text-muted-foreground">Unlimited earning potential</div>
              </div>
              
              <div className="space-y-4 mb-8">
                <div className="flex items-center gap-3">
                  <Gift className="w-5 h-5 text-yellow-600 flex-shrink-0" />
                  <span className="text-left">200 credits per referral</span>
                </div>
                <div className="flex items-center gap-3">
                  <Gift className="w-5 h-5 text-yellow-600 flex-shrink-0" />
                  <span className="text-left">Friend gets 300 credits</span>
                </div>
                <div className="flex items-center gap-3">
                  <Gift className="w-5 h-5 text-yellow-600 flex-shrink-0" />
                  <span className="text-left">No limits on referrals</span>
                </div>
                <div className="flex items-center gap-3">
                  <Gift className="w-5 h-5 text-yellow-600 flex-shrink-0" />
                  <span className="text-left">Instant credit rewards</span>
                </div>
                <div className="flex items-center gap-3">
                  <Gift className="w-5 h-5 text-yellow-600 flex-shrink-0" />
                  <span className="text-left">Share via email/social</span>
                </div>
              </div>
              
              <Link href="/auth/signup" className="bg-yellow-600 hover:bg-yellow-700 text-white font-semibold py-3 px-6 rounded-lg transition-colors w-full inline-block">
                Start Referring
              </Link>
            </div>
          </div>

          {/* Credit Usage */}
          <div className="mt-16 max-w-2xl mx-auto">
            <div className="bg-gray-50 rounded-2xl p-8">
              <h3 className="text-xl font-bold text-center mb-6">How Credits Work</h3>
              <div className="grid md:grid-cols-3 gap-6 text-center">
                <div>
                  <div className="w-12 h-12 bg-github/10 rounded-lg flex items-center justify-center mx-auto mb-3">
                    <Github className="h-6 w-6 text-github" />
                  </div>
                  <div className="font-semibold mb-1">GitHub Analysis</div>
                  <div className="text-2xl font-bold text-primary">20</div>
                  <div className="text-sm text-muted-foreground">credits</div>
                </div>
                <div>
                  <div className="w-12 h-12 bg-linkedin/10 rounded-lg flex items-center justify-center mx-auto mb-3">
                    <Linkedin className="h-6 w-6 text-linkedin" />
                  </div>
                  <div className="font-semibold mb-1">LinkedIn Review</div>
                  <div className="text-2xl font-bold text-primary">15</div>
                  <div className="text-sm text-muted-foreground">credits</div>
                </div>
                <div>
                  <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center mx-auto mb-3">
                    <FileText className="h-6 w-6 text-green-600" />
                  </div>
                  <div className="font-semibold mb-1">Resume Scoring</div>
                  <div className="text-2xl font-bold text-primary">20</div>
                  <div className="text-sm text-muted-foreground">credits</div>
                </div>
              </div>
            </div>
          </div>

          {/* Special CTA for Referrals */}
          <div className="mt-16 text-center">
            <div className="bg-gradient-to-r from-yellow-400 to-orange-500 rounded-2xl p-8 text-white">
              <h3 className="text-2xl md:text-3xl font-bold mb-4">
                🎉 Want More Credits? Refer & Earn!
              </h3>
              <p className="text-xl opacity-90 mb-6 max-w-2xl mx-auto">
                Share ReviewMe with friends and colleagues. Everyone wins!
              </p>
              <Link 
                href="/auth/signup" 
                className="inline-flex items-center px-8 py-4 bg-white text-orange-600 font-bold rounded-lg hover:bg-gray-100 transition-colors group text-lg shadow-lg"
              >
                <Gift className="mr-2 h-6 w-6" />
                Start Earning Credits
                <ArrowRight className="ml-2 h-5 w-5 transition-transform group-hover:translate-x-1" />
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* FAQ Section */}
      <section id="faq" className="py-20 bg-gray-50">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <div className="inline-flex items-center px-4 py-2 bg-blue-100 text-blue-800 rounded-full text-sm font-medium mb-4">
              ❓ Frequently Asked Questions
            </div>
            <h2 className="text-3xl md:text-4xl font-bold mb-4">
              Got Questions? We've Got Answers
            </h2>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              Everything you need to know about ReviewMe and how it works
            </p>
          </div>

          <div className="max-w-3xl mx-auto">
            {faqs.map((faq, index) => (
              <div key={index} className="mb-4">
                <button
                  onClick={() => toggleFaq(index)}
                  className="w-full bg-white rounded-lg border p-6 text-left hover:shadow-md transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2"
                >
                  <div className="flex items-center justify-between">
                    <h3 className="text-lg font-semibold pr-4">{faq.question}</h3>
                    <ChevronDown 
                      className={`h-5 w-5 text-gray-500 flex-shrink-0 transition-transform duration-200 ${
                        openFaq === index ? 'transform rotate-180' : ''
                      }`} 
                    />
                  </div>
                  {openFaq === index && (
                    <div className="mt-4 pt-4 border-t border-gray-100">
                      <p className="text-muted-foreground leading-relaxed">{faq.answer}</p>
                    </div>
                  )}
                </button>
              </div>
            ))}
          </div>

          {/* Additional Help */}
          <div className="mt-16 text-center">
            <div className="bg-white rounded-2xl p-8 shadow-lg border max-w-2xl mx-auto">
              <h3 className="text-xl font-semibold mb-4">Still have questions?</h3>
              <p className="text-muted-foreground mb-6">
                Our support team is here to help you get the most out of ReviewMe.
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Link href="/contact" className="btn-primary">
                  Contact Support
                </Link>
                <Link href="/help" className="btn-secondary">
                  Browse Help Center
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Final CTA Section */}
      {/* Final CTA Section */}
      <section className="py-20 bg-gradient-to-br from-primary via-blue-600 to-purple-700 text-white relative overflow-hidden">
        {/* Background decoration */}
        <div className="absolute inset-0 bg-black/20"></div>
        <div className="absolute top-20 left-20 w-32 h-32 bg-white/10 rounded-full blur-3xl"></div>
        <div className="absolute bottom-20 right-20 w-48 h-48 bg-white/10 rounded-full blur-3xl"></div>
        
        <div className="container mx-auto px-4 text-center relative">
          <div className="max-w-4xl mx-auto">
            <div className="inline-flex items-center px-4 py-2 bg-white/20 rounded-full text-sm font-medium mb-6">
              🚀 Ready to Transform Your Career?
            </div>
            
            <h2 className="text-3xl md:text-5xl font-bold mb-6 leading-tight">
              Join 10,000+ Professionals Who
              <span className="block text-yellow-300">Boosted Their Career</span>
            </h2>
            
            <p className="text-xl md:text-2xl opacity-90 mb-8 max-w-3xl mx-auto leading-relaxed">
              Start your free analysis today and discover exactly what you need 
              to land your dream job faster.
            </p>
            
            <div className="flex flex-col sm:flex-row gap-4 justify-center mb-12">
              <Link 
                href="/auth/signup" 
                className="inline-flex items-center px-8 py-4 bg-white text-primary font-bold rounded-lg hover:bg-gray-100 transition-colors group text-lg shadow-2xl"
              >
                Start Free Analysis Now
                <ArrowRight className="ml-2 h-6 w-6 transition-transform group-hover:translate-x-1" />
              </Link>
              <button 
                className="inline-flex items-center px-8 py-4 border-2 border-white/30 text-white font-semibold rounded-lg hover:bg-white/10 transition-colors text-lg"
                onClick={() => document.getElementById('demo-video')?.scrollIntoView({ behavior: 'smooth' })}
              >
                <Play className="mr-2 h-5 w-5" />
                Watch 2-Min Demo
              </button>
            </div>

            {/* Trust indicators */}
            <div className="flex flex-wrap justify-center items-center gap-8 mb-8 opacity-80">
              <div className="flex items-center gap-2 text-sm">
                <CheckCircle className="h-5 w-5" />
                <span>100 Free Credits</span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <CheckCircle className="h-5 w-5" />
                <span>No Credit Card Required</span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <CheckCircle className="h-5 w-5" />
                <span>GDPR Compliant</span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <CheckCircle className="h-5 w-5" />
                <span>Cancel Anytime</span>
              </div>
            </div>

            {/* Success metrics */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6 max-w-2xl mx-auto">
              <div className="text-center">
                <div className="text-3xl font-bold mb-1">94%</div>
                <div className="text-sm opacity-80">Success Rate</div>
              </div>
              <div className="text-center">
                <div className="text-3xl font-bold mb-1">3.2x</div>
                <div className="text-sm opacity-80">More Interviews</div>
              </div>
              <div className="text-center">
                <div className="text-3xl font-bold mb-1">15 days</div>
                <div className="text-sm opacity-80">Avg. Job Hunt</div>
              </div>
              <div className="text-center">
                <div className="text-3xl font-bold mb-1">10K+</div>
                <div className="text-sm opacity-80">Happy Users</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Enhanced Footer */}
      <footer className="bg-gray-900 text-gray-300">
        {/* Main Footer Content */}
        <div className="py-16">
          <div className="container mx-auto px-4">
            <div className="grid md:grid-cols-2 lg:grid-cols-5 gap-8">
              {/* Brand Column */}
              <div className="lg:col-span-2">
                <div className="flex items-center space-x-3 mb-6">
                  <div className="p-2 bg-gradient-to-br from-primary to-blue-600 rounded-lg">
                    <BarChart3 className="h-6 w-6 text-white" />
                  </div>
                  <span className="text-2xl font-bold text-white">ReviewMe</span>
                </div>
                <p className="text-gray-400 mb-6 max-w-md leading-relaxed">
                  Transform your professional profile with AI-powered insights. 
                  Join thousands of professionals who've boosted their career prospects with ReviewMe.
                </p>
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-2 text-sm">
                    <Shield className="h-4 w-4 text-green-400" />
                    <span>GDPR Compliant</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <Award className="h-4 w-4 text-yellow-400" />
                    <span>SOC 2 Certified</span>
                  </div>
                </div>
              </div>
              
              {/* Product Column */}
              <div>
                <h3 className="font-semibold text-white mb-6 text-lg">Product</h3>
                <ul className="space-y-3">
                  <li><Link href="#features" className="hover:text-white transition-colors focus:text-white focus:ring-2 focus:ring-primary rounded">Features</Link></li>
                  <li><Link href="#pricing" className="hover:text-white transition-colors focus:text-white focus:ring-2 focus:ring-primary rounded">Pricing</Link></li>
                  <li><Link href="#how-it-works" className="hover:text-white transition-colors focus:text-white focus:ring-2 focus:ring-primary rounded">How it Works</Link></li>
                  <li><Link href="/demo" className="hover:text-white transition-colors focus:text-white focus:ring-2 focus:ring-primary rounded">Demo</Link></li>
                  <li><Link href="/api" className="hover:text-white transition-colors focus:text-white focus:ring-2 focus:ring-primary rounded">API</Link></li>
                </ul>
              </div>
              
              {/* Company Column */}
              <div>
                <h3 className="font-semibold text-white mb-6 text-lg">Company</h3>
                <ul className="space-y-3">
                  <li><Link href="/about" className="hover:text-white transition-colors focus:text-white focus:ring-2 focus:ring-primary rounded">About Us</Link></li>
                  <li><Link href="/careers" className="hover:text-white transition-colors focus:text-white focus:ring-2 focus:ring-primary rounded">Careers</Link></li>
                  <li><Link href="/blog" className="hover:text-white transition-colors focus:text-white focus:ring-2 focus:ring-primary rounded">Blog</Link></li>
                  <li><Link href="/press" className="hover:text-white transition-colors focus:text-white focus:ring-2 focus:ring-primary rounded">Press</Link></li>
                  <li><Link href="/partners" className="hover:text-white transition-colors focus:text-white focus:ring-2 focus:ring-primary rounded">Partners</Link></li>
                </ul>
              </div>
              
              {/* Support Column */}
              <div>
                <h3 className="font-semibold text-white mb-6 text-lg">Support</h3>
                <ul className="space-y-3">
                  <li><Link href="/help" className="hover:text-white transition-colors focus:text-white focus:ring-2 focus:ring-primary rounded">Help Center</Link></li>
                  <li><Link href="/contact" className="hover:text-white transition-colors focus:text-white focus:ring-2 focus:ring-primary rounded">Contact Us</Link></li>
                  <li><Link href="/status" className="hover:text-white transition-colors focus:text-white focus:ring-2 focus:ring-primary rounded">System Status</Link></li>
                  <li><Link href="/security" className="hover:text-white transition-colors focus:text-white focus:ring-2 focus:ring-primary rounded">Security</Link></li>
                  <li><Link href="/privacy" className="hover:text-white transition-colors focus:text-white focus:ring-2 focus:ring-primary rounded">Privacy Policy</Link></li>
                </ul>
              </div>
            </div>
          </div>
        </div>
        
        {/* Trust Badges Section */}
        <div className="bg-gray-50 dark:bg-gray-800/50 py-8">
          <div className="container mx-auto px-4">
            <div className="text-center mb-6">
              <h4 className="text-sm font-semibold text-gray-600 dark:text-gray-300 mb-4">Trusted by professionals at</h4>
              <div className="flex flex-wrap justify-center items-center gap-8 opacity-60">
                <div className="text-xl font-bold text-gray-500">Microsoft</div>
                <div className="text-xl font-bold text-gray-500">Google</div>
                <div className="text-xl font-bold text-gray-500">Amazon</div>
                <div className="text-xl font-bold text-gray-500">Apple</div>
                <div className="text-xl font-bold text-gray-500">Meta</div>
                <div className="text-xl font-bold text-gray-500">Stripe</div>
              </div>
            </div>
            
            <div className="flex flex-wrap justify-center items-center gap-6 pt-6 border-t border-gray-200 dark:border-gray-700">
              <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                <Shield className="h-4 w-4 text-green-500" />
                <span>SOC 2 Type II Certified</span>
              </div>
              <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                <Shield className="h-4 w-4 text-blue-500" />
                <span>GDPR Compliant</span>
              </div>
              <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                <Award className="h-4 w-4 text-yellow-500" />
                <span>ISO 27001 Certified</span>
              </div>
              <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                <Shield className="h-4 w-4 text-purple-500" />
                <span>256-bit SSL Encryption</span>
              </div>
            </div>
          </div>
        </div>
        
        {/* Bottom Footer */}
        <div className="border-t border-gray-800 py-8">
          <div className="container mx-auto px-4">
            <div className="flex flex-col md:flex-row justify-between items-center gap-4">
              <div className="text-sm text-gray-400">
                &copy; 2025 ReviewMe. All rights reserved. Made with ❤️ for professional growth.
              </div>
              <div className="flex items-center gap-6 text-sm">
                <Link href="/terms" className="hover:text-white transition-colors focus:ring-2 focus:ring-primary rounded">Terms of Service</Link>
                <Link href="/privacy" className="hover:text-white transition-colors focus:ring-2 focus:ring-primary rounded">Privacy Policy</Link>
                <Link href="/cookies" className="hover:text-white transition-colors focus:ring-2 focus:ring-primary rounded">Cookie Policy</Link>
                <Link href="/sitemap" className="hover:text-white transition-colors focus:ring-2 focus:ring-primary rounded">Sitemap</Link>
              </div>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}