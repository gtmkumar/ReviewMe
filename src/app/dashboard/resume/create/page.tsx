'use client';

import { useState, useEffect, useCallback } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { 
  Save, Plus, Trash2, ChevronDown, ChevronUp, AlertCircle, 
  CheckCircle, Info, User, Briefcase, GraduationCap, Award,
  Code, Trophy, Users, ArrowLeft, CreditCard, Clock, Eye
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { DashboardNavigation } from '@/components/dashboard-navigation';
import { 
  ExperienceSection, 
  EducationSection, 
  ProjectsSection, 
  CertificationsSection, 
  SkillsSection, 
  AchievementsSection, 
  ActivitiesSection 
} from '@/components/resume/ResumeBuilderSections';

// Types for resume data structure
interface PersonalInfo {
  name: string;
  email: string;
  phone: string;
  location: string;
  linkedinUrl?: string;
  githubUrl?: string;
  portfolioUrl?: string;
  summary?: string;
}

interface Experience {
  id: string;
  title: string;
  company: string;
  location?: string;
  startDate: string;
  endDate?: string;
  isCurrent: boolean;
  description: string;
  achievements: string[];
}

interface Education {
  id: string;
  degree: string;
  institution: string;
  location?: string;
  graduationDate?: string;
  gpa?: string;
  relevantCoursework: string[];
}

interface Project {
  id: string;
  name: string;
  description: string;
  technologies: string[];
  url?: string;
  githubUrl?: string;
  achievements: string[];
}

interface Certification {
  id: string;
  name: string;
  issuer: string;
  issueDate?: string;
  expirationDate?: string;
  credentialId?: string;
  url?: string;
}

interface Achievement {
  id: string;
  title: string;
  description: string;
  date?: string;
  category: string;
}

interface Activity {
  id: string;
  title: string;
  organization: string;
  role?: string;
  startDate?: string;
  endDate?: string;
  description: string;
}

interface ResumeData {
  personalInfo: PersonalInfo;
  experience: Experience[];
  education: Education[];
  projects: Project[];
  certifications: Certification[];
  skills: string[];
  achievements: Achievement[];
  activities: Activity[];
}

const REQUIRED_CREDITS = 15;
const AUTOSAVE_DELAY = 2000; // 2 seconds

export default function ResumeCreatePage() {
  const { data: session } = useSession();
  const router = useRouter();
  
  // State management
  const [resumeData, setResumeData] = useState<ResumeData>({
    personalInfo: {
      name: '',
      email: '',
      phone: '',
      location: '',
      linkedinUrl: '',
      githubUrl: '',
      portfolioUrl: '',
      summary: ''
    },
    experience: [],
    education: [],
    projects: [],
    certifications: [],
    skills: [],
    achievements: [],
    activities: []
  });

  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({
    personalInfo: true,
    experience: true,
    education: false,
    projects: false,
    certifications: false,
    skills: false,
    achievements: false,
    activities: false
  });

  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [credits, setCredits] = useState(0);
  const [notification, setNotification] = useState<{
    type: 'success' | 'error' | 'warning' | 'info';
    message: string;
  } | null>(null);
  const [autoSaveTimer, setAutoSaveTimer] = useState<NodeJS.Timeout | null>(null);

  // Load initial data
  useEffect(() => {
    if (session) {
      loadResumeData();
      loadUserCredits();
    }
  }, [session]);

  // Auto-save functionality
  useEffect(() => {
    if (hasUnsavedChanges && !isSaving) {
      if (autoSaveTimer) clearTimeout(autoSaveTimer);
      
      const timer = setTimeout(() => {
        handleAutoSave();
      }, AUTOSAVE_DELAY);
      
      setAutoSaveTimer(timer);
    }

    return () => {
      if (autoSaveTimer) clearTimeout(autoSaveTimer);
    };
  }, [hasUnsavedChanges, resumeData]);

  // Warn before leaving with unsaved changes
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (hasUnsavedChanges) {
        e.preventDefault();
        e.returnValue = 'You have unsaved changes. Do you want to discard them?';
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [hasUnsavedChanges]);

  const loadResumeData = async () => {
    try {
      const response = await fetch('/api/resume/builder');
      if (response.ok) {
        const data = await response.json();
        if (data.resumeData) {
          setResumeData(data.resumeData);
        }
      }
    } catch (error) {
      console.error('Error loading resume data:', error);
      showNotification('error', 'Failed to load resume data');
    } finally {
      setIsLoading(false);
    }
  };

  const loadUserCredits = async () => {
    try {
      const response = await fetch('/api/credits');
      if (response.ok) {
        const data = await response.json();
        setCredits(data.credits);
      }
    } catch (error) {
      console.error('Error loading credits:', error);
    }
  };

  const handleAutoSave = async () => {
    if (!hasUnsavedChanges) return;
    
    try {
      const response = await fetch('/api/resume/builder/autosave', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ resumeData })
      });

      if (response.ok) {
        setHasUnsavedChanges(false);
        showNotification('info', 'Changes auto-saved', 2000);
      }
    } catch (error) {
      console.error('Auto-save failed:', error);
    }
  };

  const handleSave = async () => {
    if (credits < REQUIRED_CREDITS) {
      showNotification('error', `Not enough credits. You need ${REQUIRED_CREDITS} credits to save your resume.`);
      return;
    }

    setIsSaving(true);
    try {
      const response = await fetch('/api/resume/builder/save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ resumeData })
      });

      const data = await response.json();
      
      if (response.ok) {
        setHasUnsavedChanges(false);
        setCredits(credits - REQUIRED_CREDITS);
        showNotification('success', `Resume saved successfully! ${REQUIRED_CREDITS} credits deducted.`);
      } else {
        showNotification('error', data.error || 'Failed to save resume');
      }
    } catch (error) {
      console.error('Error saving resume:', error);
      showNotification('error', 'Failed to save resume');
    } finally {
      setIsSaving(false);
    }
  };

  const showNotification = (type: 'success' | 'error' | 'warning' | 'info', message: string, duration = 5000) => {
    setNotification({ type, message });
    setTimeout(() => setNotification(null), duration);
  };

  const updateResumeData = useCallback((section: keyof ResumeData, data: any) => {
    setResumeData(prev => ({
      ...prev,
      [section]: data
    }));
    setHasUnsavedChanges(true);
  }, []);

  const toggleSection = (section: string) => {
    setExpandedSections(prev => ({
      ...prev,
      [section]: !prev[section]
    }));
  };

  const generateId = () => Math.random().toString(36).substr(2, 9);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <DashboardNavigation />
      
      {/* Header */}
      <div className="bg-white border-b sticky top-0 z-10">
        <div className="max-w-6xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <Link 
                href="/dashboard/resume"
                className="flex items-center text-gray-600 hover:text-gray-900 transition-colors"
              >
                <ArrowLeft className="h-5 w-5 mr-2" />
                Back to Resume
              </Link>
              <div className="h-6 border-l border-gray-300"></div>
              <h1 className="text-2xl font-bold text-gray-900">Resume Builder</h1>
              {hasUnsavedChanges && (
                <div className="flex items-center text-orange-600 text-sm">
                  <Clock className="h-4 w-4 mr-1" />
                  Unsaved changes
                </div>
              )}
            </div>
            
            <div className="flex items-center space-x-4">
              <div className="flex items-center text-sm text-gray-600">
                <CreditCard className="h-4 w-4 mr-1" />
                {credits} credits
              </div>
              
              <button
                onClick={handleSave}
                disabled={isSaving || credits < REQUIRED_CREDITS}
                className={cn(
                  "flex items-center px-4 py-2 rounded-lg font-medium transition-colors",
                  credits >= REQUIRED_CREDITS && !isSaving
                    ? "bg-primary text-white hover:bg-primary/90"
                    : "bg-gray-300 text-gray-500 cursor-not-allowed"
                )}
              >
                <Save className="h-4 w-4 mr-2" />
                {isSaving ? 'Saving...' : `Save (${REQUIRED_CREDITS} credits)`}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Notification */}
      {notification && (
        <div className="fixed top-20 right-4 z-50 animate-in slide-in-from-right-full">
          <div className={cn(
            "flex items-center p-4 rounded-lg shadow-lg max-w-md",
            notification.type === 'success' && "bg-green-50 text-green-800 border border-green-200",
            notification.type === 'error' && "bg-red-50 text-red-800 border border-red-200",
            notification.type === 'warning' && "bg-orange-50 text-orange-800 border border-orange-200",
            notification.type === 'info' && "bg-blue-50 text-blue-800 border border-blue-200"
          )}>
            {notification.type === 'success' && <CheckCircle className="h-5 w-5 mr-3 flex-shrink-0" />}
            {notification.type === 'error' && <AlertCircle className="h-5 w-5 mr-3 flex-shrink-0" />}
            {notification.type === 'warning' && <AlertCircle className="h-5 w-5 mr-3 flex-shrink-0" />}
            {notification.type === 'info' && <Info className="h-5 w-5 mr-3 flex-shrink-0" />}
            <span className="text-sm">{notification.message}</span>
          </div>
        </div>
      )}

      {/* Main Content */}
      <div className="max-w-6xl mx-auto px-4 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          
          {/* Sidebar Navigation */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-lg shadow-sm border p-4 sticky top-24">
              <h3 className="font-medium text-gray-900 mb-4">Resume Sections</h3>
              <nav className="space-y-2">
                {[
                  { key: 'personalInfo', label: 'Personal Info', icon: User },
                  { key: 'experience', label: 'Experience', icon: Briefcase },
                  { key: 'education', label: 'Education', icon: GraduationCap },
                  { key: 'projects', label: 'Projects', icon: Code },
                  { key: 'certifications', label: 'Certifications', icon: Award },
                  { key: 'skills', label: 'Skills', icon: Trophy },
                  { key: 'achievements', label: 'Achievements', icon: Trophy },
                  { key: 'activities', label: 'Activities', icon: Users }
                ].map(section => {
                  const Icon = section.icon;
                  return (
                    <button
                      key={section.key}
                      onClick={() => toggleSection(section.key)}
                      className={cn(
                        "w-full flex items-center justify-between p-2 rounded-lg text-left transition-colors",
                        expandedSections[section.key]
                          ? "bg-primary/10 text-primary"
                          : "text-gray-600 hover:bg-gray-50"
                      )}
                    >
                      <div className="flex items-center">
                        <Icon className="h-4 w-4 mr-2" />
                        <span className="text-sm font-medium">{section.label}</span>
                      </div>
                      {expandedSections[section.key] ? 
                        <ChevronUp className="h-4 w-4" /> : 
                        <ChevronDown className="h-4 w-4" />
                      }
                    </button>
                  );
                })}
              </nav>
            </div>
          </div>

          {/* Main Form */}
          <div className="lg:col-span-3 space-y-6">
            
            {/* Personal Information Section */}
            <PersonalInfoSection
              data={resumeData.personalInfo}
              isExpanded={expandedSections.personalInfo}
              onToggle={() => toggleSection('personalInfo')}
              onUpdate={(data) => updateResumeData('personalInfo', data)}
            />

            {/* Experience Section */}
            <ExperienceSection
              data={resumeData.experience}
              isExpanded={expandedSections.experience}
              onToggle={() => toggleSection('experience')}
              onUpdate={(data) => updateResumeData('experience', data)}
              generateId={generateId}
            />

            {/* Education Section */}
            <EducationSection
              data={resumeData.education}
              isExpanded={expandedSections.education}
              onToggle={() => toggleSection('education')}
              onUpdate={(data) => updateResumeData('education', data)}
              generateId={generateId}
            />

            {/* Projects Section */}
            <ProjectsSection
              data={resumeData.projects}
              isExpanded={expandedSections.projects}
              onToggle={() => toggleSection('projects')}
              onUpdate={(data) => updateResumeData('projects', data)}
              generateId={generateId}
            />

            {/* Certifications Section */}
            <CertificationsSection
              data={resumeData.certifications}
              isExpanded={expandedSections.certifications}
              onToggle={() => toggleSection('certifications')}
              onUpdate={(data) => updateResumeData('certifications', data)}
              generateId={generateId}
            />

            {/* Skills Section */}
            <SkillsSection
              data={resumeData.skills}
              isExpanded={expandedSections.skills}
              onToggle={() => toggleSection('skills')}
              onUpdate={(data) => updateResumeData('skills', data)}
            />

            {/* Achievements Section */}
            <AchievementsSection
              data={resumeData.achievements}
              isExpanded={expandedSections.achievements}
              onToggle={() => toggleSection('achievements')}
              onUpdate={(data) => updateResumeData('achievements', data)}
              generateId={generateId}
            />

            {/* Activities Section */}
            <ActivitiesSection
              data={resumeData.activities}
              isExpanded={expandedSections.activities}
              onToggle={() => toggleSection('activities')}
              onUpdate={(data) => updateResumeData('activities', data)}
              generateId={generateId}
            />

          </div>
        </div>
      </div>
    </div>
  );
}

// Component for Personal Information Section
interface PersonalInfoSectionProps {
  data: PersonalInfo;
  isExpanded: boolean;
  onToggle: () => void;
  onUpdate: (data: PersonalInfo) => void;
}

function PersonalInfoSection({ data, isExpanded, onToggle, onUpdate }: PersonalInfoSectionProps) {
  const handleChange = (field: keyof PersonalInfo, value: string) => {
    onUpdate({
      ...data,
      [field]: value
    });
  };

  return (
    <div className="bg-white rounded-lg shadow-sm border">
      <button
        onClick={onToggle}
        className="w-full flex items-center justify-between p-6 text-left"
      >
        <div className="flex items-center">
          <User className="h-5 w-5 text-primary mr-3" />
          <h2 className="text-lg font-medium text-gray-900">Personal Information</h2>
        </div>
        {isExpanded ? <ChevronUp className="h-5 w-5" /> : <ChevronDown className="h-5 w-5" />}
      </button>

      {isExpanded && (
        <div className="px-6 pb-6 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Full Name *
              </label>
              <input
                type="text"
                value={data.name}
                onChange={(e) => handleChange('name', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                placeholder="John Doe"
                required
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Email Address *
              </label>
              <input
                type="email"
                value={data.email}
                onChange={(e) => handleChange('email', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                placeholder="john.doe@email.com"
                required
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Phone Number *
              </label>
              <input
                type="tel"
                value={data.phone}
                onChange={(e) => handleChange('phone', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                placeholder="+1 (555) 123-4567"
                required
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Location *
              </label>
              <input
                type="text"
                value={data.location}
                onChange={(e) => handleChange('location', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                placeholder="New York, NY"
                required
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                LinkedIn URL
              </label>
              <input
                type="url"
                value={data.linkedinUrl || ''}
                onChange={(e) => handleChange('linkedinUrl', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                placeholder="https://linkedin.com/in/johndoe"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                GitHub URL
              </label>
              <input
                type="url"
                value={data.githubUrl || ''}
                onChange={(e) => handleChange('githubUrl', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                placeholder="https://github.com/johndoe"
              />
            </div>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Portfolio URL
            </label>
            <input
              type="url"
              value={data.portfolioUrl || ''}
              onChange={(e) => handleChange('portfolioUrl', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
              placeholder="https://johndoe.dev"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Professional Summary
            </label>
            <textarea
              value={data.summary || ''}
              onChange={(e) => handleChange('summary', e.target.value)}
              rows={4}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
              placeholder="A brief summary of your professional background and career objectives..."
            />
            <p className="text-xs text-gray-500 mt-1">
              Write a compelling 2-3 sentence summary highlighting your key skills and experience.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}