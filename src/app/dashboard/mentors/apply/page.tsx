'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Check, Plus, Trash2, ArrowLeft } from 'lucide-react';
import { DashboardNavigation } from '@/components/dashboard-navigation';
import { cn } from '@/lib/utils';

interface FormData {
  personalInfo: {
    name: string;
    email: string;
    phone: string;
    location: string;
    timezone: string;
  };
  professionalInfo: {
    currentRole: string;
    company: string;
    yearsOfExperience: number;
    industry: string;
    bio: string;
    expertise: Array<{
      area: string;
      level: string;
      tags: string[];
    }>;
  };
  sessionTypes: Array<{
    type: string;
    name: string;
    description: string;
    duration: number;
    price: number;
    isActive: boolean;
  }>;
  availability?: {
    timezone: string;
    weeklySlots: Array<{
      day: 'monday' | 'tuesday' | 'wednesday' | 'thursday' | 'friday' | 'saturday' | 'sunday';
      slots: Array<{
        startTime: string;
        endTime: string;
        isAvailable: boolean;
      }>;
    }>;
  };
  verification: {
    method: 'work_email' | 'documents';
    workEmail?: string;
  };
  socialLinks: {
    linkedin?: string;
    github?: string;
    portfolio?: string;
  };
}

const sessionTypeOptions = [
  { type: 'resume_review', name: 'Resume Review', price: 89, duration: 30 },
  { type: 'linkedin_review', name: 'LinkedIn Review', price: 99, duration: 45 },
  { type: 'github_review', name: 'GitHub Review', price: 129, duration: 60 },
  { type: 'career_discussion', name: 'Career Discussion', price: 149, duration: 60 },
  { type: 'project_review', name: 'Project Review', price: 199, duration: 90 },
  { type: 'interview_prep', name: 'Interview Prep', price: 179, duration: 60 }
];

export default function MentorApplicationPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [existingApplication, setExistingApplication] = useState<any>(null);

  const [formData, setFormData] = useState<FormData>({
    personalInfo: {
      name: '',
      email: '',
      phone: '',
      location: '',
      timezone: 'America/New_York'
    },
    professionalInfo: {
      currentRole: '',
      company: '',
      yearsOfExperience: 0,
      industry: '',
      bio: '',
      expertise: []
    },
    sessionTypes: [],
    availability: undefined,
    verification: {
      method: 'work_email',
      workEmail: ''
    },
    socialLinks: {
      linkedin: '',
      github: '',
      portfolio: ''
    }
  });

  useEffect(() => {
    if (session?.user) {
      setFormData(prev => ({
        ...prev,
        personalInfo: {
          ...prev.personalInfo,
          name: session.user.name || '',
          email: session.user.email || ''
        }
      }));
      checkExistingApplication();
    }
  }, [session]);

  const checkExistingApplication = async () => {
    try {
      const response = await fetch('/api/mentors/apply');
      if (response.ok) {
        const data = await response.json();
        if (data.application) {
          setExistingApplication(data.application);
        }
      }
    } catch (err) {
      console.error('Error checking existing application:', err);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      setLoading(true);
      setError('');

      console.log('Form data being validated:', formData); // Debug log

      // Enhanced validation with specific field checks
      const missingFields = [];
      
      // Personal Information validation
      if (!formData.personalInfo.name.trim()) missingFields.push('Full Name');
      if (!formData.personalInfo.email.trim()) missingFields.push('Email');
      if (!formData.personalInfo.location.trim()) missingFields.push('Location');
      
      // Professional Information validation
      if (!formData.professionalInfo.currentRole.trim()) missingFields.push('Current Role');
      if (!formData.professionalInfo.company.trim()) missingFields.push('Company');
      if (!formData.professionalInfo.industry.trim()) missingFields.push('Industry');
      if (!formData.professionalInfo.bio.trim()) missingFields.push('Professional Bio');
      
      // Expertise validation
      if (!formData.professionalInfo.expertise || formData.professionalInfo.expertise.length === 0) {
        missingFields.push('At least one Area of Expertise');
      }
      
      // Improved years of experience validation
      const yearsExp = formData.professionalInfo.yearsOfExperience;
      if (!yearsExp || isNaN(yearsExp) || yearsExp < 1) {
        missingFields.push('Years of Experience (must be at least 1)');
      }
      
      // Session Types validation
      if (!formData.sessionTypes || formData.sessionTypes.length === 0) {
        missingFields.push('At least one Session Type');
      }

      // Availability validation
      if (!formData.availability?.weeklySlots?.length) {
        missingFields.push('Availability (click the button to set up your schedule)');
      }

      console.log('Missing fields:', missingFields); // Debug log
      console.log('Years of experience value:', yearsExp, 'Type:', typeof yearsExp); // Additional debug
      console.log('Availability data:', formData.availability); // Availability debug
      
      if (missingFields.length > 0) {
        const errorMessage = `Please fill in the following required fields:\n\n${missingFields.map(field => `• ${field}`).join('\n')}`;
        console.log('Validation error:', errorMessage); // Debug log
        throw new Error(errorMessage);
      }

      // Debug: Log the data being sent
      const requestData = {
        ...formData,
        availability: formData.availability || {
          timezone: formData.personalInfo.timezone,
          weeklySlots: []
        }
      };
      console.log('Request data being sent:', requestData); // Debug log

      const response = await fetch('/api/mentors/apply', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(requestData)
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to submit application');
      }

      setSuccess('Application submitted successfully! We\'ll review it within 2-3 business days.');
      setTimeout(() => {
        router.push('/dashboard');
      }, 3000);

    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong');
    } finally {
      setLoading(false);
    }
  };

  if (status === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (status === 'unauthenticated') {
    router.push('/auth/signin');
    return null;
  }

  if (existingApplication) {
    return (
      <div className="min-h-screen bg-gray-50">
        <DashboardNavigation />
        <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
          <div className="px-4 py-6 sm:px-0">
            <div className="bg-white rounded-lg shadow p-8 max-w-md mx-auto text-center">
              <div className="mb-4">
                {existingApplication.status === 'pending' && (
                  <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-4">
                    <h3 className="font-semibold mb-2 text-yellow-800">Application Under Review</h3>
                    <p className="text-sm text-yellow-700">
                      Your mentor application is currently being reviewed.
                    </p>
                  </div>
                )}
                {existingApplication.status === 'approved' && (
                  <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-4">
                    <h3 className="font-semibold mb-2 text-green-800">Application Approved!</h3>
                    <p className="text-sm text-green-700">
                      Your mentor application has been approved.
                    </p>
                  </div>
                )}
              </div>
              <Link
                href="/dashboard"
                className="bg-primary text-white px-6 py-2 rounded-lg hover:bg-primary/90 transition-colors"
              >
                Back to Dashboard
              </Link>
            </div>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <DashboardNavigation />
      
      <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          
          {/* Header */}
          <div className="mb-8">
            <div className="flex items-center space-x-4 mb-6">
              <Link 
                href="/dashboard/mentors"
                className="flex items-center space-x-2 text-gray-600 hover:text-gray-900 transition-colors"
              >
                <ArrowLeft className="h-5 w-5" />
                <span>Back to Mentors</span>
              </Link>
            </div>
            
            <div className="text-center">
              <h1 className="text-3xl font-bold text-gray-900 mb-4">
                Apply to Become a Mentor
              </h1>
              <p className="text-gray-600 max-w-2xl mx-auto">
                Share your expertise and help others grow in their careers
              </p>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="bg-white rounded-lg shadow p-8 max-w-4xl mx-auto">
            {error && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
                <p className="text-red-600">{error}</p>
              </div>
            )}

            {success && (
              <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-6">
                <p className="text-green-600">{success}</p>
              </div>
            )}

            {/* Personal Information */}
            <div className="mb-8">
              <h2 className="text-xl font-bold text-gray-900 mb-4">Personal Information</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Full Name *
                  </label>
                  <input
                    type="text"
                    value={formData.personalInfo.name}
                    onChange={(e) => setFormData(prev => ({
                      ...prev,
                      personalInfo: { ...prev.personalInfo, name: e.target.value }
                    }))}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-primary focus:border-transparent"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Email *
                  </label>
                  <input
                    type="email"
                    value={formData.personalInfo.email}
                    onChange={(e) => setFormData(prev => ({
                      ...prev,
                      personalInfo: { ...prev.personalInfo, email: e.target.value }
                    }))}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-primary focus:border-transparent"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Phone
                  </label>
                  <input
                    type="tel"
                    placeholder="+1 (555) 123-4567"
                    value={formData.personalInfo.phone}
                    onChange={(e) => setFormData(prev => ({
                      ...prev,
                      personalInfo: { ...prev.personalInfo, phone: e.target.value }
                    }))}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-primary focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Location *
                  </label>
                  <input
                    type="text"
                    placeholder="City, Country"
                    value={formData.personalInfo.location}
                    onChange={(e) => setFormData(prev => ({
                      ...prev,
                      personalInfo: { ...prev.personalInfo, location: e.target.value }
                    }))}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-primary focus:border-transparent"
                    required
                  />
                </div>
              </div>
            </div>

            {/* Professional Information */}
            <div className="mb-8">
              <h2 className="text-xl font-bold text-gray-900 mb-4">Professional Information</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Current Role *
                  </label>
                  <input
                    type="text"
                    placeholder="e.g., Senior Software Engineer"
                    value={formData.professionalInfo.currentRole}
                    onChange={(e) => setFormData(prev => ({
                      ...prev,
                      professionalInfo: { ...prev.professionalInfo, currentRole: e.target.value }
                    }))}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-primary focus:border-transparent"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Company *
                  </label>
                  <input
                    type="text"
                    placeholder="e.g., Google, Microsoft"
                    value={formData.professionalInfo.company}
                    onChange={(e) => setFormData(prev => ({
                      ...prev,
                      professionalInfo: { ...prev.professionalInfo, company: e.target.value }
                    }))}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-primary focus:border-transparent"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Years of Experience *
                    {(!formData.professionalInfo.yearsOfExperience || formData.professionalInfo.yearsOfExperience < 1) && (
                      <span className="text-red-600 text-xs ml-1">(Required - minimum 1 year)</span>
                    )}
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={formData.professionalInfo.yearsOfExperience || ''}
                    onChange={(e) => setFormData(prev => ({
                      ...prev,
                      professionalInfo: { 
                        ...prev.professionalInfo, 
                        yearsOfExperience: e.target.value ? Math.max(1, parseInt(e.target.value) || 1) : 1
                      }
                    }))}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-primary focus:border-transparent"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Industry *
                  </label>
                  <input
                    type="text"
                    placeholder="e.g., Technology, Finance"
                    value={formData.professionalInfo.industry}
                    onChange={(e) => setFormData(prev => ({
                      ...prev,
                      professionalInfo: { ...prev.professionalInfo, industry: e.target.value }
                    }))}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-primary focus:border-transparent"
                    required
                  />
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Professional Bio *
                </label>
                <textarea
                  rows={4}
                  placeholder="Tell us about your professional background and what makes you a great mentor..."
                  value={formData.professionalInfo.bio}
                  onChange={(e) => setFormData(prev => ({
                    ...prev,
                    professionalInfo: { ...prev.professionalInfo, bio: e.target.value }
                  }))}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-primary focus:border-transparent"
                  required
                />
              </div>
            </div>

            {/* Expertise Areas */}
            <div className="mb-8">
              <h2 className="text-xl font-bold text-gray-900 mb-4">Areas of Expertise *</h2>
              <p className="text-gray-600 mb-4">Select the areas where you can provide mentorship:</p>
              
              {/* Show selected count */}
              <div className="mb-4">
                <span className="text-sm text-gray-600">
                  Selected: {formData.professionalInfo.expertise.length} area{formData.professionalInfo.expertise.length !== 1 ? 's' : ''}
                  {formData.professionalInfo.expertise.length === 0 && (
                    <span className="text-red-600 font-medium"> (At least 1 required)</span>
                  )}
                </span>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {[
                  { area: 'resume', name: 'Resume Review', description: 'Help improve resumes and CVs' },
                  { area: 'linkedin', name: 'LinkedIn Optimization', description: 'LinkedIn profile enhancement' },
                  { area: 'github', name: 'GitHub Portfolio', description: 'Code portfolio and repository optimization' },
                  { area: 'career', name: 'Career Guidance', description: 'Career planning and development advice' },
                  { area: 'technical', name: 'Technical Skills', description: 'Programming and technical expertise' },
                  { area: 'interview', name: 'Interview Preparation', description: 'Interview skills and practice' }
                ].map((expertiseOption) => {
                  const isSelected = formData.professionalInfo.expertise.some(exp => exp.area === expertiseOption.area);
                  return (
                    <div
                      key={expertiseOption.area}
                      className={cn(
                        "border rounded-lg p-4 cursor-pointer transition-colors",
                        isSelected ? "border-primary bg-primary/10" : "border-gray-200 hover:border-gray-300"
                      )}
                      onClick={() => {
                        if (isSelected) {
                          setFormData(prev => ({
                            ...prev,
                            professionalInfo: {
                              ...prev.professionalInfo,
                              expertise: prev.professionalInfo.expertise.filter(exp => exp.area !== expertiseOption.area)
                            }
                          }));
                        } else {
                          setFormData(prev => ({
                            ...prev,
                            professionalInfo: {
                              ...prev.professionalInfo,
                              expertise: [...prev.professionalInfo.expertise, {
                                area: expertiseOption.area as 'resume' | 'linkedin' | 'github' | 'career' | 'technical' | 'interview',
                                level: 'intermediate' as const,
                                tags: []
                              }]
                            }
                          }));
                        }
                      }}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <h3 className="font-medium text-gray-900">{expertiseOption.name}</h3>
                        {isSelected && <Check className="h-5 w-5 text-primary" />}
                      </div>
                      <p className="text-sm text-gray-600">{expertiseOption.description}</p>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Session Types */}
            <div className="mb-8">
              <h2 className="text-xl font-bold text-gray-900 mb-4">Session Types *</h2>
              <p className="text-gray-600 mb-4">Select the types of sessions you'd like to offer:</p>
              
              {/* Show selected count */}
              <div className="mb-4">
                <span className="text-sm text-gray-600">
                  Selected: {formData.sessionTypes.length} session type{formData.sessionTypes.length !== 1 ? 's' : ''}
                  {formData.sessionTypes.length === 0 && (
                    <span className="text-red-600 font-medium"> (At least 1 required)</span>
                  )}
                </span>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {sessionTypeOptions.map((option) => {
                  const isSelected = formData.sessionTypes.some(st => st.type === option.type);
                  return (
                    <div
                      key={option.type}
                      className={cn(
                        "border rounded-lg p-4 cursor-pointer transition-colors",
                        isSelected ? "border-primary bg-primary/10" : "border-gray-200 hover:border-gray-300"
                      )}
                      onClick={() => {
                        if (isSelected) {
                          setFormData(prev => ({
                            ...prev,
                            sessionTypes: prev.sessionTypes.filter(st => st.type !== option.type)
                          }));
                        } else {
                          setFormData(prev => ({
                            ...prev,
                            sessionTypes: [...prev.sessionTypes, {
                              ...option,
                              description: '',
                              isActive: true
                            }]
                          }));
                        }
                      }}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <h3 className="font-medium text-gray-900">{option.name}</h3>
                        {isSelected && <Check className="h-5 w-5 text-primary" />}
                      </div>
                      <div className="text-sm text-gray-600">
                        {option.duration} minutes • {option.price} tokens
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Availability */}
            <div className="mb-8">
              <h2 className="text-xl font-bold text-gray-900 mb-4">Availability *</h2>
              <p className="text-gray-600 mb-4">When are you available for mentoring sessions?</p>
              
              <div className="bg-gray-50 rounded-lg p-4">
                <p className="text-sm text-gray-700 mb-4">
                  <strong>Quick Setup:</strong> Click the button below to set up your basic availability. 
                  You can customize your exact time slots later from your mentor dashboard.
                </p>
                <button
                  type="button"
                  onClick={() => {
                    // Set a simple default availability that satisfies the API requirement
                    const defaultSlots = [
                      {
                        day: 'monday' as const,
                        slots: [
                          { startTime: '09:00', endTime: '17:00', isAvailable: true }
                        ]
                      },
                      {
                        day: 'tuesday' as const,
                        slots: [
                          { startTime: '09:00', endTime: '17:00', isAvailable: true }
                        ]
                      },
                      {
                        day: 'wednesday' as const,
                        slots: [
                          { startTime: '09:00', endTime: '17:00', isAvailable: true }
                        ]
                      },
                      {
                        day: 'thursday' as const,
                        slots: [
                          { startTime: '09:00', endTime: '17:00', isAvailable: true }
                        ]
                      },
                      {
                        day: 'friday' as const,
                        slots: [
                          { startTime: '09:00', endTime: '17:00', isAvailable: true }
                        ]
                      }
                    ];
                    
                    // Update form data with availability
                    setFormData(prev => ({
                      ...prev,
                      availability: {
                        timezone: prev.personalInfo.timezone,
                        weeklySlots: defaultSlots
                      }
                    }));
                  }}
                  className="bg-primary text-white px-4 py-2 rounded-lg hover:bg-primary/90 transition-colors text-sm"
                >
                  Set Weekday Availability (9 AM - 5 PM)
                </button>
                
                <p className="text-xs text-gray-500 mt-2">
                  This will set you as available Monday-Friday, 9 AM to 5 PM in your timezone.
                </p>
                
                {formData.availability?.weeklySlots?.length > 0 && (
                  <div className="mt-4 p-3 bg-green-50 border border-green-200 rounded-lg">
                    <p className="text-sm text-green-700">
                      ✓ Availability set! You're available for {formData.availability.weeklySlots.length} days per week.
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/* Verification */}
            <div className="mb-8">
              <h2 className="text-xl font-bold text-gray-900 mb-4">Verification</h2>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Work Email (for verification)
                </label>
                <input
                  type="email"
                  placeholder="your.name@company.com"
                  value={formData.verification.workEmail}
                  onChange={(e) => setFormData(prev => ({
                    ...prev,
                    verification: { ...prev.verification, workEmail: e.target.value }
                  }))}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-primary focus:border-transparent"
                />
              </div>
            </div>

            {/* Social Links */}
            <div className="mb-8">
              <h2 className="text-xl font-bold text-gray-900 mb-4">Social Links (Optional)</h2>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    LinkedIn Profile
                  </label>
                  <input
                    type="url"
                    placeholder="https://linkedin.com/in/yourprofile"
                    value={formData.socialLinks.linkedin}
                    onChange={(e) => setFormData(prev => ({
                      ...prev,
                      socialLinks: { ...prev.socialLinks, linkedin: e.target.value }
                    }))}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-primary focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    GitHub Profile
                  </label>
                  <input
                    type="url"
                    placeholder="https://github.com/yourusername"
                    value={formData.socialLinks.github}
                    onChange={(e) => setFormData(prev => ({
                      ...prev,
                      socialLinks: { ...prev.socialLinks, github: e.target.value }
                    }))}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-primary focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Portfolio/Website
                  </label>
                  <input
                    type="url"
                    placeholder="https://yourportfolio.com"
                    value={formData.socialLinks.portfolio}
                    onChange={(e) => setFormData(prev => ({
                      ...prev,
                      socialLinks: { ...prev.socialLinks, portfolio: e.target.value }
                    }))}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-primary focus:border-transparent"
                  />
                </div>
              </div>
            </div>

            {/* Submit */}
            <div className="flex justify-end">
              <button
                type="submit"
                disabled={loading}
                className="bg-primary text-white px-8 py-3 rounded-lg hover:bg-primary/90 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? 'Submitting...' : 'Submit Application'}
              </button>
            </div>
          </form>
        </div>
      </main>
    </div>
  );
}