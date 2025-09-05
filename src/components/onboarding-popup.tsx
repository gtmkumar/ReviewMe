'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { X, ChevronRight, ChevronLeft, User, Briefcase, GraduationCap, 
         Github, Linkedin, Globe, Shield, Check, AlertCircle, Loader2, 
         Info, Eye, EyeOff } from 'lucide-react';
import { BlogService } from '@/lib/blog-service';
import { ValidationService } from '@/lib/validation-service';

interface OnboardingPopupProps {
  isOpen: boolean;
  onClose: () => void;
  onComplete: () => void;
}

interface FormData {
  userType: 'student' | 'professional' | 'job_seeker' | '';
  experience: string;
  industry: string;
  careerGoals: string[];
  socialProfiles: {
    github: string;
    medium: string;
    linkedin: string;
    portfolio: string;
  };
  preferences: {
    communicationStyle: 'formal' | 'casual' | 'technical' | '';
    feedbackFrequency: 'immediate' | 'weekly' | 'monthly' | '';
    privacyLevel: 'public' | 'private' | 'limited' | '';
  };
  consents: {
    dataCollection: boolean;
    analytics: boolean;
    marketing: boolean;
    profileSharing: boolean;
  };
}

const STEPS = [
  { id: 'profile', title: 'Profile Information', icon: User },
  { id: 'social', title: 'Social Profiles', icon: Globe },
  { id: 'preferences', title: 'Preferences', icon: Briefcase },
  { id: 'privacy', title: 'Privacy & Consent', icon: Shield },
];

const USER_TYPE_OPTIONS = [
  { 
    value: 'student', 
    label: 'Student', 
    icon: GraduationCap,
    description: 'Currently studying or recent graduate'
  },
  { 
    value: 'professional', 
    label: 'Professional', 
    icon: Briefcase,
    description: 'Experienced professional looking to grow'
  },
  { 
    value: 'job_seeker', 
    label: 'Job Seeker', 
    icon: User,
    description: 'Actively looking for new opportunities'
  },
];

const CAREER_GOALS = [
  'Skill Development', 'Career Advancement', 'Job Search', 'Networking',
  'Personal Branding', 'Technical Growth', 'Leadership', 'Entrepreneurship'
];

export default function OnboardingPopup({ isOpen, onClose, onComplete }: OnboardingPopupProps) {
  const { data: session } = useSession();
  const [currentStep, setCurrentStep] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [errors, setErrors] = useState<string[]>([]);
  const [showPrivacyDetails, setShowPrivacyDetails] = useState(false);
  
  const [formData, setFormData] = useState<FormData>({
    userType: '',
    experience: '',
    industry: '',
    careerGoals: [],
    socialProfiles: {
      github: '',
      medium: '',
      linkedin: '',
      portfolio: '',
    },
    preferences: {
      communicationStyle: '',
      feedbackFrequency: '',
      privacyLevel: '',
    },
    consents: {
      dataCollection: false,
      analytics: false,
      marketing: false,
      profileSharing: false,
    },
  });

  // Load existing onboarding data if available
  useEffect(() => {
    if (isOpen && session?.user) {
      loadExistingData();
    }
  }, [isOpen, session]);

  const loadExistingData = async () => {
    try {
      const response = await fetch('/api/onboarding');
      if (response.ok) {
        const data = await response.json();
        if (data.onboardingData?.data) {
          setFormData(prev => ({
            ...prev,
            ...data.onboardingData.data
          }));
        }
      }
    } catch (error) {
      console.error('Error loading existing data:', error);
    }
  };

  const validateCurrentStep = (): boolean => {
    const newErrors: string[] = [];
    
    switch (currentStep) {
      case 0: // Profile Information
        if (!formData.userType) newErrors.push('Please select your user type');
        if (formData.userType === 'professional' && !formData.experience) {
          newErrors.push('Please specify your experience level');
        }
        break;
      
      case 1: // Social Profiles
        // Validate social profile URLs if provided
        if (formData.socialProfiles.github && !ValidationService.isValidGitHubUrl(formData.socialProfiles.github)) {
          newErrors.push('Please enter a valid GitHub profile URL');
        }
        if (formData.socialProfiles.linkedin && !ValidationService.isValidLinkedInUrl(formData.socialProfiles.linkedin)) {
          newErrors.push('Please enter a valid LinkedIn profile URL');
        }
        if (formData.socialProfiles.medium && !ValidationService.isValidMediumUrl(formData.socialProfiles.medium)) {
          newErrors.push('Please enter a valid Medium profile URL');
        }
        if (formData.socialProfiles.portfolio && !ValidationService.isValidWebsiteUrl(formData.socialProfiles.portfolio)) {
          newErrors.push('Please enter a valid portfolio website URL');
        }
        
        // Require at least one social profile
        if (!formData.socialProfiles.github && !formData.socialProfiles.linkedin) {
          newErrors.push('Please provide at least GitHub or LinkedIn profile');
        }
        break;
      
      case 2: // Preferences
        if (!formData.preferences.communicationStyle) {
          newErrors.push('Please select your communication style');
        }
        if (!formData.preferences.feedbackFrequency) {
          newErrors.push('Please select feedback frequency');
        }
        break;
      
      case 3: // Privacy & Consent
        if (!formData.consents.dataCollection) {
          newErrors.push('Data collection consent is required to use the service');
        }
        break;
    }
    
    setErrors(newErrors);
    return newErrors.length === 0;
  };

  const handleNext = () => {
    if (validateCurrentStep()) {
      if (currentStep < STEPS.length - 1) {
        setCurrentStep(currentStep + 1);
      } else {
        handleSubmit();
      }
    }
  };

  const handlePrevious = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleSubmit = async () => {
    setIsLoading(true);
    setErrors([]);
    
    // Final validation before submit
    if (!formData.consents.dataCollection) {
      setErrors(['Data collection consent is required to use the service']);
      setIsLoading(false);
      return;
    }
    
    try {
      const response = await fetch('/api/onboarding', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      });

      if (response.ok) {
        // Fetch blogs if Medium URL is provided
        if (formData.socialProfiles.medium) {
          try {
            await fetch('/api/blogs', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                platform: 'medium',
                profileUrl: formData.socialProfiles.medium,
              }),
            });
          } catch (blogError) {
            console.warn('Blog fetching failed, but onboarding completed:', blogError);
          }
        }
        
        onComplete();
        onClose();
      } else {
        const errorData = await response.json();
        setErrors([errorData.error || 'Failed to save onboarding data']);
      }
    } catch (error) {
      setErrors(['Network error. Please try again.']);
    } finally {
      setIsLoading(false);
    }
  };

  const updateFormData = (field: string, value: any) => {
    setFormData(prev => ({
      ...prev,
      [field]: value,
    }));
  };

  const updateNestedFormData = (parent: keyof FormData, field: string, value: any) => {
    setFormData(prev => {
      const parentData = prev[parent] as Record<string, any>;
      return {
        ...prev,
        [parent]: {
          ...parentData,
          [field]: value,
        },
      };
    });
  };

  const toggleCareerGoal = (goal: string) => {
    setFormData(prev => ({
      ...prev,
      careerGoals: prev.careerGoals.includes(goal)
        ? prev.careerGoals.filter(g => g !== goal)
        : [...prev.careerGoals, goal],
    }));
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="relative w-full max-w-2xl max-h-[90vh] mx-4 bg-white dark:bg-gray-900 rounded-xl shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
          <div>
            <h2 className="text-xl font-bold text-gray-900 dark:text-white">
              Welcome to ReviewMe
            </h2>
            <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">
              Let's personalize your experience
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
            aria-label="Close onboarding"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Progress Steps */}
        <div className="px-6 py-4 bg-gray-50 dark:bg-gray-800/50">
          <div className="flex items-center justify-between">
            {STEPS.map((step, index) => {
              const Icon = step.icon;
              const isActive = index === currentStep;
              const isCompleted = index < currentStep;
              
              return (
                <div key={step.id} className="flex items-center">
                  <div
                    className={`flex items-center justify-center w-8 h-8 rounded-full border-2 transition-colors ${
                      isCompleted
                        ? 'bg-green-100 border-green-500 text-green-600'
                        : isActive
                        ? 'bg-blue-100 border-blue-500 text-blue-600'
                        : 'bg-gray-100 border-gray-300 text-gray-400'
                    }`}
                  >
                    {isCompleted ? (
                      <Check className="h-4 w-4" />
                    ) : (
                      <Icon className="h-4 w-4" />
                    )}
                  </div>
                  <span className={`ml-2 text-sm font-medium hidden sm:block ${
                    isActive ? 'text-blue-600' : 'text-gray-500'
                  }`}>
                    {step.title}
                  </span>
                  {index < STEPS.length - 1 && (
                    <ChevronRight className="h-4 w-4 text-gray-400 mx-2 hidden sm:block" />
                  )}
                </div>
              );
            })}
          </div>
          <div className="mt-2 text-xs text-gray-500 text-center">
            Step {currentStep + 1} of {STEPS.length}
          </div>
        </div>

        {/* Content */}
        <div className="p-4 min-h-[200px] max-h-[60vh] overflow-y-auto">
          {/* Error Display */}
          {errors.length > 0 && (
            <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg">
              <div className="flex items-center">
                <AlertCircle className="h-5 w-5 text-red-600 mr-2" />
                <span className="text-red-800 font-medium">Please fix the following errors:</span>
              </div>
              <ul className="mt-2 text-sm text-red-700 list-disc list-inside">
                {errors.map((error, index) => (
                  <li key={index}>{error}</li>
                ))}
              </ul>
            </div>
          )}

          {/* Step 0: Profile Information */}
          {currentStep === 0 && (
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                  Tell us about yourself
                </h3>
                
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  {USER_TYPE_OPTIONS.map((option) => {
                    const Icon = option.icon;
                    const isSelected = formData.userType === option.value;
                    
                    return (
                      <button
                        key={option.value}
                        onClick={() => updateFormData('userType', option.value)}
                        className={`p-4 border-2 rounded-lg text-left transition-all hover:shadow-md ${
                          isSelected
                            ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                            : 'border-gray-200 dark:border-gray-700 hover:border-gray-300'
                        }`}
                      >
                        <Icon className={`h-6 w-6 mb-2 ${
                          isSelected ? 'text-blue-600' : 'text-gray-500'
                        }`} />
                        <h4 className={`font-medium ${
                          isSelected ? 'text-blue-900 dark:text-blue-100' : 'text-gray-900 dark:text-white'
                        }`}>
                          {option.label}
                        </h4>
                        <p className={`text-sm ${
                          isSelected ? 'text-blue-700 dark:text-blue-300' : 'text-gray-600 dark:text-gray-400'
                        }`}>
                          {option.description}
                        </p>
                      </button>
                    );
                  })}
                </div>
              </div>

              {formData.userType === 'professional' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Years of Experience
                  </label>
                  <select
                    value={formData.experience}
                    onChange={(e) => updateFormData('experience', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-800 dark:text-white"
                  >
                    <option value="">Select experience level</option>
                    <option value="entry">Entry Level (0-2 years)</option>
                    <option value="mid">Mid Level (2-5 years)</option>
                    <option value="senior">Senior Level (5-10 years)</option>
                    <option value="lead">Lead/Principal (10+ years)</option>
                  </select>
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Industry (Optional)
                </label>
                <input
                  type="text"
                  value={formData.industry}
                  onChange={(e) => updateFormData('industry', e.target.value)}
                  placeholder="e.g., Software Development, Marketing, Finance"
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-800 dark:text-white"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Career Goals (Select all that apply)
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {CAREER_GOALS.map((goal) => (
                    <button
                      key={goal}
                      onClick={() => toggleCareerGoal(goal)}
                      className={`px-3 py-2 text-sm rounded-lg border transition-colors ${
                        formData.careerGoals.includes(goal)
                          ? 'bg-blue-100 border-blue-500 text-blue-700 dark:bg-blue-900/30 dark:border-blue-400 dark:text-blue-300'
                          : 'bg-white border-gray-300 text-gray-700 hover:bg-gray-50 dark:bg-gray-800 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-700'
                      }`}
                    >
                      {goal}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Step 1: Social Profiles */}
          {currentStep === 1 && (
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                  Connect Your Professional Profiles
                </h3>
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                  We'll analyze your profiles to provide personalized recommendations.
                </p>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="flex items-center text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    <Github className="h-4 w-4 mr-2" />
                    GitHub Profile URL *
                  </label>
                  <input
                    type="url"
                    value={formData.socialProfiles.github}
                    onChange={(e) => updateNestedFormData('socialProfiles', 'github', e.target.value)}
                    placeholder="https://github.com/yourusername"
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-800 dark:text-white"
                  />
                </div>

                <div>
                  <label className="flex items-center text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    <Linkedin className="h-4 w-4 mr-2" />
                    LinkedIn Profile URL *
                  </label>
                  <input
                    type="url"
                    value={formData.socialProfiles.linkedin}
                    onChange={(e) => updateNestedFormData('socialProfiles', 'linkedin', e.target.value)}
                    placeholder="https://linkedin.com/in/yourusername"
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-800 dark:text-white"
                  />
                </div>

                <div>
                  <label className="flex items-center text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    <Globe className="h-4 w-4 mr-2" />
                    Medium Profile URL
                  </label>
                  <input
                    type="url"
                    value={formData.socialProfiles.medium}
                    onChange={(e) => updateNestedFormData('socialProfiles', 'medium', e.target.value)}
                    placeholder="https://medium.com/@yourusername"
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-800 dark:text-white"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    We'll fetch your articles to analyze your writing and expertise
                  </p>
                </div>

                <div>
                  <label className="flex items-center text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    <Globe className="h-4 w-4 mr-2" />
                    Portfolio/Website URL
                  </label>
                  <input
                    type="url"
                    value={formData.socialProfiles.portfolio}
                    onChange={(e) => updateNestedFormData('socialProfiles', 'portfolio', e.target.value)}
                    placeholder="https://yourwebsite.com"
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-800 dark:text-white"
                  />
                </div>
              </div>

              <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg">
                <div className="flex items-start">
                  <Info className="h-5 w-5 text-blue-600 mt-0.5 mr-3 flex-shrink-0" />
                  <div className="text-sm">
                    <p className="text-blue-800 dark:text-blue-200 font-medium">
                      Why do we need these profiles?
                    </p>
                    <p className="text-blue-700 dark:text-blue-300 mt-1">
                      We analyze your professional presence across platforms to provide personalized 
                      recommendations for improving your profiles, resumes, and career prospects.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Step 2: Preferences */}
          {currentStep === 2 && (
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                  Customize Your Experience
                </h3>
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                  Help us tailor our recommendations to your preferences.
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Communication Style
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  {[
                    { value: 'formal', label: 'Formal', desc: 'Professional tone' },
                    { value: 'casual', label: 'Casual', desc: 'Friendly approach' },
                    { value: 'technical', label: 'Technical', desc: 'Detailed insights' },
                  ].map((option) => (
                    <button
                      key={option.value}
                      onClick={() => updateNestedFormData('preferences', 'communicationStyle', option.value)}
                      className={`p-3 border-2 rounded-lg text-left transition-all ${
                        formData.preferences.communicationStyle === option.value
                          ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                          : 'border-gray-200 dark:border-gray-700 hover:border-gray-300'
                      }`}
                    >
                      <h4 className={`font-medium ${
                        formData.preferences.communicationStyle === option.value
                          ? 'text-blue-900 dark:text-blue-100'
                          : 'text-gray-900 dark:text-white'
                      }`}>
                        {option.label}
                      </h4>
                      <p className={`text-sm ${
                        formData.preferences.communicationStyle === option.value
                          ? 'text-blue-700 dark:text-blue-300'
                          : 'text-gray-600 dark:text-gray-400'
                      }`}>
                        {option.desc}
                      </p>
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Feedback Frequency
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  {[
                    { value: 'immediate', label: 'Immediate', desc: 'Real-time notifications' },
                    { value: 'weekly', label: 'Weekly', desc: 'Weekly summaries' },
                    { value: 'monthly', label: 'Monthly', desc: 'Monthly reports' },
                  ].map((option) => (
                    <button
                      key={option.value}
                      onClick={() => updateNestedFormData('preferences', 'feedbackFrequency', option.value)}
                      className={`p-3 border-2 rounded-lg text-left transition-all ${
                        formData.preferences.feedbackFrequency === option.value
                          ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                          : 'border-gray-200 dark:border-gray-700 hover:border-gray-300'
                      }`}
                    >
                      <h4 className={`font-medium ${
                        formData.preferences.feedbackFrequency === option.value
                          ? 'text-blue-900 dark:text-blue-100'
                          : 'text-gray-900 dark:text-white'
                      }`}>
                        {option.label}
                      </h4>
                      <p className={`text-sm ${
                        formData.preferences.feedbackFrequency === option.value
                          ? 'text-blue-700 dark:text-blue-300'
                          : 'text-gray-600 dark:text-gray-400'
                      }`}>
                        {option.desc}
                      </p>
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Privacy Level
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  {[
                    { value: 'public', label: 'Public', desc: 'Full public profile' },
                    { value: 'limited', label: 'Limited', desc: 'Controlled visibility' },
                    { value: 'private', label: 'Private', desc: 'Private profile only' },
                  ].map((option) => (
                    <button
                      key={option.value}
                      onClick={() => updateNestedFormData('preferences', 'privacyLevel', option.value)}
                      className={`p-3 border-2 rounded-lg text-left transition-all ${
                        formData.preferences.privacyLevel === option.value
                          ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                          : 'border-gray-200 dark:border-gray-700 hover:border-gray-300'
                      }`}
                    >
                      <h4 className={`font-medium ${
                        formData.preferences.privacyLevel === option.value
                          ? 'text-blue-900 dark:text-blue-100'
                          : 'text-gray-900 dark:text-white'
                      }`}>
                        {option.label}
                      </h4>
                      <p className={`text-sm ${
                        formData.preferences.privacyLevel === option.value
                          ? 'text-blue-700 dark:text-blue-300'
                          : 'text-gray-600 dark:text-gray-400'
                      }`}>
                        {option.desc}
                      </p>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Step 3: Privacy & Consent */}
          {currentStep === 3 && (
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                  Privacy & Consent
                </h3>
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                  Please review and accept our data usage policies.
                </p>
              </div>

              <div className="space-y-4">
                <div className="flex items-start space-x-3 p-4 border-2 border-red-200 bg-red-50 dark:bg-red-900/20 dark:border-red-800 rounded-lg">
                  <input
                    type="checkbox"
                    id="dataCollection"
                    checked={formData.consents.dataCollection}
                    onChange={(e) => updateNestedFormData('consents', 'dataCollection', e.target.checked)}
                    className="mt-0.5 h-5 w-5 text-blue-600 border-gray-300 rounded focus:ring-blue-500 focus:ring-2"
                  />
                  <div className="flex-1">
                    <label htmlFor="dataCollection" className="text-sm font-bold text-red-900 dark:text-red-100">
                      Data Collection & Analysis (Required) *
                    </label>
                    <p className="text-xs text-red-700 dark:text-red-300 mt-1">
                      Allow us to collect and analyze your profile data to provide personalized recommendations. This is required to use our service.
                    </p>
                  </div>
                </div>

                <div className="flex items-start space-x-3">
                  <input
                    type="checkbox"
                    id="analytics"
                    checked={formData.consents.analytics}
                    onChange={(e) => updateNestedFormData('consents', 'analytics', e.target.checked)}
                    className="mt-0.5 h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                  />
                  <div className="flex-1">
                    <label htmlFor="analytics" className="text-sm font-medium text-gray-900 dark:text-white">
                      Analytics & Usage Statistics
                    </label>
                    <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">
                      Help us improve the platform by sharing anonymous usage statistics.
                    </p>
                  </div>
                </div>

                <div className="flex items-start space-x-3">
                  <input
                    type="checkbox"
                    id="marketing"
                    checked={formData.consents.marketing}
                    onChange={(e) => updateNestedFormData('consents', 'marketing', e.target.checked)}
                    className="mt-0.5 h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                  />
                  <div className="flex-1">
                    <label htmlFor="marketing" className="text-sm font-medium text-gray-900 dark:text-white">
                      Marketing Communications
                    </label>
                    <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">
                      Receive updates about new features, tips, and relevant content.
                    </p>
                  </div>
                </div>

                <div className="flex items-start space-x-3">
                  <input
                    type="checkbox"
                    id="profileSharing"
                    checked={formData.consents.profileSharing}
                    onChange={(e) => updateNestedFormData('consents', 'profileSharing', e.target.checked)}
                    className="mt-0.5 h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                  />
                  <div className="flex-1">
                    <label htmlFor="profileSharing" className="text-sm font-medium text-gray-900 dark:text-white">
                      Profile Sharing
                    </label>
                    <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">
                      Allow your profile to be visible to others (you can change this later).
                    </p>
                  </div>
                </div>
              </div>

              <div className="flex items-center space-x-2">
                <button
                  onClick={() => setShowPrivacyDetails(!showPrivacyDetails)}
                  className="flex items-center text-sm text-blue-600 hover:text-blue-700"
                >
                  {showPrivacyDetails ? <EyeOff className="h-4 w-4 mr-1" /> : <Eye className="h-4 w-4 mr-1" />}
                  {showPrivacyDetails ? 'Hide' : 'Show'} Privacy Details
                </button>
              </div>

              {showPrivacyDetails && (
                <div className="bg-gray-50 dark:bg-gray-800 p-4 rounded-lg text-sm">
                  <h4 className="font-medium text-gray-900 dark:text-white mb-2">How we use your data:</h4>
                  <ul className="space-y-1 text-gray-600 dark:text-gray-400 list-disc list-inside">
                    <li>Profile analysis to provide personalized recommendations</li>
                    <li>Usage analytics to improve our services (anonymized)</li>
                    <li>Optional marketing communications about new features</li>
                    <li>Profile sharing only if you explicitly consent</li>
                  </ul>
                  <p className="mt-2 text-gray-600 dark:text-gray-400">
                    You can modify these preferences anytime in your settings.
                  </p>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between p-4 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50">
          <button
            onClick={handlePrevious}
            disabled={currentStep === 0}
            className="flex items-center px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed dark:bg-gray-800 dark:text-gray-300 dark:border-gray-600 dark:hover:bg-gray-700"
          >
            <ChevronLeft className="h-4 w-4 mr-2" />
            Previous
          </button>

          <div className="text-sm text-gray-500">
            {currentStep + 1} of {STEPS.length}
          </div>

          <button
            onClick={handleNext}
            disabled={isLoading}
            className="flex items-center px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isLoading ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : currentStep === STEPS.length - 1 ? (
              'Complete Setup'
            ) : (
              <>
                Next
                <ChevronRight className="h-4 w-4 ml-2" />
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}