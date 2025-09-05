'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { 
  User, Camera, Save, Copy, Check, ExternalLink, Eye, EyeOff,
  Settings, Upload, X, AlertCircle
} from 'lucide-react';
import Link from 'next/link';
import { DashboardNavigation } from '@/components/dashboard-navigation';
import { cn } from '@/lib/utils';

interface UserSettings {
  name: string;
  email: string;
  bio: string;
  avatar?: string;
  image?: string;
  publicUsername: string;
  profilePublic: boolean;
  onboarding?: {
    completed: boolean;
    data: {
      userType?: string;
      experience?: string;
      industry?: string;
      careerGoals?: string[];
      socialProfiles?: {
        github?: string;
        medium?: string;
        linkedin?: string;
        portfolio?: string;
      };
      preferences?: {
        communicationStyle?: string;
        feedbackFrequency?: string;
        privacyLevel?: string;
      };
      consents?: {
        dataCollection: boolean;
        analytics: boolean;
        marketing: boolean;
        profileSharing: boolean;
      };
    } | null;
  };
}

export default function SettingsPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [settings, setSettings] = useState<UserSettings>({
    name: '',
    email: '',
    bio: '',
    publicUsername: '',
    profilePublic: true,
  });
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [copiedUrl, setCopiedUrl] = useState(false);
  const [isUploadingPhoto, setIsUploadingPhoto] = useState(false);
  const [photoError, setPhotoError] = useState('');

  useEffect(() => {
    if (status === 'loading') return;
    if (!session) router.push('/auth/signin');
    
    loadUserSettings();
  }, [session, status, router]);

  const loadUserSettings = async () => {
    try {
      setIsLoading(true);
      const response = await fetch('/api/user/settings');
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to load settings');
      }

      setSettings(data.settings);
    } catch (error: any) {
      setError(error.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setError('');
    setSuccess('');

    try {
      const response = await fetch('/api/user/settings', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          bio: settings.bio,
          profilePublic: settings.profilePublic,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to save settings');
      }

      setSuccess('Settings saved successfully!');
      setTimeout(() => setSuccess(''), 3000);
    } catch (error: any) {
      setError(error.message);
    } finally {
      setIsSaving(false);
    }
  };

  const copyProfileUrl = async () => {
    const profileUrl = `${window.location.origin}/u/${settings.publicUsername}`;
    try {
      await navigator.clipboard.writeText(profileUrl);
      setCopiedUrl(true);
      setTimeout(() => setCopiedUrl(false), 2000);
    } catch (error) {
      console.error('Failed to copy URL:', error);
    }
  };

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
    if (!allowedTypes.includes(file.type)) {
      setPhotoError('Please select a valid image file (JPEG, PNG, or WebP)');
      return;
    }

    // Validate file size (5MB)
    const maxSize = 5 * 1024 * 1024;
    if (file.size > maxSize) {
      setPhotoError('File size too large. Maximum size is 5MB.');
      return;
    }

    setIsUploadingPhoto(true);
    setPhotoError('');
    setError('');

    try {
      const formData = new FormData();
      formData.append('photo', file);

      const response = await fetch('/api/user/avatar', {
        method: 'POST',
        body: formData,
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to upload photo');
      }

      // Update settings with new avatar URL
      setSettings({ ...settings, avatar: data.avatarUrl });
      setSuccess('Profile photo updated successfully!');
      setTimeout(() => setSuccess(''), 3000);
    } catch (error: any) {
      setPhotoError(error.message);
    } finally {
      setIsUploadingPhoto(false);
      // Clear the input
      e.target.value = '';
    }
  };

  const handleRemovePhoto = async () => {
    setIsUploadingPhoto(true);
    setPhotoError('');
    setError('');

    try {
      const response = await fetch('/api/user/avatar', {
        method: 'DELETE',
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to remove photo');
      }

      // Update settings to remove avatar
      setSettings({ ...settings, avatar: undefined, image: undefined });
      setSuccess('Profile photo removed successfully!');
      setTimeout(() => setSuccess(''), 3000);
    } catch (error: any) {
      setPhotoError(error.message);
    } finally {
      setIsUploadingPhoto(false);
    }
  };

  if (status === 'loading' || isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!session) return null;

  const profileUrl = `${typeof window !== 'undefined' ? window.location.origin : ''}/u/${settings.publicUsername}`;

  return (
    <div className="min-h-screen bg-gray-50">
      <DashboardNavigation />
      
      <main className="max-w-4xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          
          {/* Header */}
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-900">Profile Settings</h1>
            <p className="text-gray-600 mt-2">
              Manage your profile information and public visibility settings.
            </p>
          </div>

          {/* Success/Error Messages */}
          {success && (
            <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg">
              <div className="flex items-center space-x-2">
                <Check className="h-5 w-5 text-green-600" />
                <span className="text-green-800">{success}</span>
              </div>
            </div>
          )}

          {error && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
              <div className="flex items-center space-x-2">
                <AlertCircle className="h-5 w-5 text-red-600" />
                <span className="text-red-800">{error}</span>
              </div>
            </div>
          )}

          {photoError && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
              <div className="flex items-center space-x-2">
                <AlertCircle className="h-5 w-5 text-red-600" />
                <span className="text-red-800">{photoError}</span>
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            
            {/* Profile Information */}
            <div className="lg:col-span-2">
              <form onSubmit={handleSaveSettings} className="space-y-6">
                
                {/* Basic Information */}
                <div className="bg-white rounded-lg shadow p-6">
                  <h2 className="text-xl font-semibold text-gray-900 mb-6">Basic Information</h2>
                  
                  {/* Profile Picture */}
                  <div className="flex items-center space-x-6 mb-6">
                    <div className="relative">
                      {settings.avatar || settings.image ? (
                        <img
                          src={settings.avatar || settings.image}
                          alt={settings.name}
                          className="w-20 h-20 rounded-full"
                        />
                      ) : (
                        <div className="w-20 h-20 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full flex items-center justify-center">
                          <User className="h-10 w-10 text-white" />
                        </div>
                      )}
                      <label className="absolute -bottom-2 -right-2 bg-white rounded-full p-2 shadow-lg hover:bg-gray-50 transition-colors cursor-pointer">
                        <Camera className="h-4 w-4 text-gray-600" />
                        <input
                          type="file"
                          accept="image/*"
                          onChange={handlePhotoUpload}
                          className="hidden"
                          disabled={isUploadingPhoto}
                        />
                      </label>
                    </div>
                    <div>
                      <h3 className="text-lg font-medium text-gray-900">{settings.name}</h3>
                      <p className="text-sm text-gray-500">@{settings.publicUsername}</p>
                      <div className="mt-2 space-y-2">
                        <label className="text-sm text-primary hover:text-primary/80 transition-colors cursor-pointer">
                          {isUploadingPhoto ? 'Uploading...' : 'Upload new photo'}
                          <input
                            type="file"
                            accept="image/*"
                            onChange={handlePhotoUpload}
                            className="hidden"
                            disabled={isUploadingPhoto}
                          />
                        </label>
                        {(settings.avatar || settings.image) && (
                          <button
                            type="button"
                            onClick={handleRemovePhoto}
                            className="block text-sm text-red-600 hover:text-red-700 transition-colors"
                            disabled={isUploadingPhoto}
                          >
                            Remove photo
                          </button>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Name (Read-only) */}
                  <div className="mb-6">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Full Name
                    </label>
                    <input
                      type="text"
                      value={settings.name}
                      disabled
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-50 text-gray-500"
                    />
                    <p className="text-sm text-gray-500 mt-1">
                      Contact support to change your name
                    </p>
                  </div>

                  {/* Email (Read-only) */}
                  <div className="mb-6">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Email Address
                    </label>
                    <input
                      type="email"
                      value={settings.email}
                      disabled
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-50 text-gray-500"
                    />
                  </div>

                  {/* Bio */}
                  <div className="mb-6">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Bio <span className="text-gray-400">(Optional)</span>
                    </label>
                    <textarea
                      value={settings.bio}
                      onChange={(e) => setSettings({ ...settings, bio: e.target.value })}
                      placeholder="Tell people a bit about yourself..."
                      maxLength={200}
                      rows={3}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                    />
                    <p className="text-sm text-gray-500 mt-1">
                      {settings.bio.length}/200 characters
                    </p>
                  </div>
                </div>

                {/* Public Profile Settings */}
                <div className="bg-white rounded-lg shadow p-6">
                  <h2 className="text-xl font-semibold text-gray-900 mb-6">Public Profile</h2>
                  
                  {/* Profile URL */}
                  <div className="mb-6">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Your Profile URL
                    </label>
                    <div className="flex space-x-2">
                      <input
                        type="text"
                        value={profileUrl}
                        disabled
                        className="flex-1 px-3 py-2 border border-gray-300 rounded-lg bg-gray-50 text-gray-700 text-sm"
                      />
                      <button
                        type="button"
                        onClick={copyProfileUrl}
                        className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors flex items-center space-x-2"
                      >
                        {copiedUrl ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                        <span>{copiedUrl ? 'Copied!' : 'Copy'}</span>
                      </button>
                      {settings.profilePublic && (
                        <>
                          <a
                            href={profileUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors flex items-center space-x-2"
                          >
                            <ExternalLink className="h-4 w-4" />
                            <span>View</span>
                          </a>
                          <a
                            href={profileUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors flex items-center space-x-2"
                          >
                            <Eye className="h-4 w-4" />
                            <span>Demo</span>
                          </a>
                        </>
                      )}
                    </div>
                  </div>

                  {/* Public Visibility Toggle */}
                  <div className="mb-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="text-lg font-medium text-gray-900 flex items-center space-x-2">
                          <span>Public Profile Visibility</span>
                          {settings.profilePublic ? (
                            <Eye className="h-5 w-5 text-green-600" />
                          ) : (
                            <EyeOff className="h-5 w-5 text-gray-400" />
                          )}
                        </h3>
                        <p className="text-sm text-gray-600 mt-1">
                          {settings.profilePublic 
                            ? 'Your profile is visible to everyone with the link'
                            : 'Your profile is private and not accessible to others'
                          }
                        </p>
                      </div>
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input
                          type="checkbox"
                          checked={settings.profilePublic}
                          onChange={(e) => setSettings({ ...settings, profilePublic: e.target.checked })}
                          className="sr-only peer"
                        />
                        <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary/20 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
                      </label>
                    </div>
                  </div>

                  {!settings.profilePublic && (
                    <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                      <div className="flex items-start space-x-3">
                        <AlertCircle className="h-5 w-5 text-yellow-600 mt-0.5" />
                        <div>
                          <h4 className="text-yellow-800 font-medium">Profile is Private</h4>
                          <p className="text-yellow-700 text-sm mt-1">
                            When your profile is private, visitors to your profile URL will see a "Profile Private" message instead of your information.
                          </p>
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {/* Onboarding Information */}
                {settings.onboarding && (
                  <div className="bg-white rounded-lg shadow p-6">
                    <h2 className="text-xl font-semibold text-gray-900 mb-6">Your Profile Information</h2>
                    
                    {settings.onboarding.completed ? (
                      <div className="space-y-6">
                        {/* User Type */}
                        {settings.onboarding.data?.userType && (
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                              User Type
                            </label>
                            <div className="px-3 py-2 border border-gray-200 rounded-lg bg-gray-50 text-gray-700 capitalize">
                              {settings.onboarding.data.userType.replace('_', ' ')}
                            </div>
                          </div>
                        )}

                        {/* Experience Level */}
                        {settings.onboarding.data?.experience && (
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                              Experience Level
                            </label>
                            <div className="px-3 py-2 border border-gray-200 rounded-lg bg-gray-50 text-gray-700 capitalize">
                              {settings.onboarding.data.experience.replace('_', ' ')}
                            </div>
                          </div>
                        )}

                        {/* Industry */}
                        {settings.onboarding.data?.industry && (
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                              Industry
                            </label>
                            <div className="px-3 py-2 border border-gray-200 rounded-lg bg-gray-50 text-gray-700">
                              {settings.onboarding.data.industry}
                            </div>
                          </div>
                        )}

                        {/* Career Goals */}
                        {settings.onboarding.data?.careerGoals && settings.onboarding.data.careerGoals.length > 0 && (
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                              Career Goals
                            </label>
                            <div className="flex flex-wrap gap-2">
                              {settings.onboarding.data.careerGoals.map((goal, index) => (
                                <span
                                  key={index}
                                  className="px-3 py-1 bg-blue-100 text-blue-800 text-sm rounded-full"
                                >
                                  {goal}
                                </span>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Social Profiles */}
                        {settings.onboarding.data?.socialProfiles && (
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                              Social Profiles
                            </label>
                            <div className="space-y-2">
                              {settings.onboarding.data.socialProfiles.github && (
                                <div className="flex items-center space-x-3 px-3 py-2 border border-gray-200 rounded-lg bg-gray-50">
                                  <span className="text-sm font-medium text-gray-600">GitHub:</span>
                                  <a
                                    href={settings.onboarding.data.socialProfiles.github}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-blue-600 hover:text-blue-700 text-sm flex items-center"
                                  >
                                    {settings.onboarding.data.socialProfiles.github}
                                    <ExternalLink className="h-3 w-3 ml-1" />
                                  </a>
                                </div>
                              )}
                              {settings.onboarding.data.socialProfiles.linkedin && (
                                <div className="flex items-center space-x-3 px-3 py-2 border border-gray-200 rounded-lg bg-gray-50">
                                  <span className="text-sm font-medium text-gray-600">LinkedIn:</span>
                                  <a
                                    href={settings.onboarding.data.socialProfiles.linkedin}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-blue-600 hover:text-blue-700 text-sm flex items-center"
                                  >
                                    {settings.onboarding.data.socialProfiles.linkedin}
                                    <ExternalLink className="h-3 w-3 ml-1" />
                                  </a>
                                </div>
                              )}
                              {settings.onboarding.data.socialProfiles.medium && (
                                <div className="flex items-center space-x-3 px-3 py-2 border border-gray-200 rounded-lg bg-gray-50">
                                  <span className="text-sm font-medium text-gray-600">Medium:</span>
                                  <a
                                    href={settings.onboarding.data.socialProfiles.medium}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-blue-600 hover:text-blue-700 text-sm flex items-center"
                                  >
                                    {settings.onboarding.data.socialProfiles.medium}
                                    <ExternalLink className="h-3 w-3 ml-1" />
                                  </a>
                                </div>
                              )}
                              {settings.onboarding.data.socialProfiles.portfolio && (
                                <div className="flex items-center space-x-3 px-3 py-2 border border-gray-200 rounded-lg bg-gray-50">
                                  <span className="text-sm font-medium text-gray-600">Portfolio:</span>
                                  <a
                                    href={settings.onboarding.data.socialProfiles.portfolio}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-blue-600 hover:text-blue-700 text-sm flex items-center"
                                  >
                                    {settings.onboarding.data.socialProfiles.portfolio}
                                    <ExternalLink className="h-3 w-3 ml-1" />
                                  </a>
                                </div>
                              )}
                            </div>
                          </div>
                        )}

                        <div className="bg-blue-50 p-4 rounded-lg">
                          <p className="text-sm text-blue-800">
                            <strong>Note:</strong> To modify these settings, please contact support or complete the onboarding process again.
                          </p>
                        </div>
                      </div>
                    ) : (
                      <div className="text-center py-8">
                        <AlertCircle className="h-12 w-12 text-yellow-600 mx-auto mb-4" />
                        <h3 className="text-lg font-medium text-gray-900 mb-2">
                          Complete Your Profile
                        </h3>
                        <p className="text-gray-600 mb-4">
                          You haven't completed the onboarding process yet. Complete it to personalize your experience.
                        </p>
                        <button
                          type="button"
                          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                          onClick={() => window.location.reload()}
                        >
                          Complete Onboarding
                        </button>
                      </div>
                    )}
                  </div>
                )}

                {/* Save Button */}
                <div className="flex justify-end">
                  <button
                    type="submit"
                    disabled={isSaving}
                    className={cn(
                      "px-6 py-3 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors flex items-center space-x-2",
                      isSaving && "opacity-50 cursor-not-allowed"
                    )}
                  >
                    {isSaving ? (
                      <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    ) : (
                      <Save className="h-5 w-5" />
                    )}
                    <span>{isSaving ? 'Saving...' : 'Save Changes'}</span>
                  </button>
                </div>
              </form>
            </div>

            {/* Sidebar */}
            <div className="space-y-6">
              
              {/* Profile Preview */}
              <div className="bg-white rounded-lg shadow p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Profile Preview</h3>
                <div className="space-y-3">
                  <div className="flex items-center space-x-3">
                    {settings.avatar || settings.image ? (
                      <img
                        src={settings.avatar || settings.image}
                        alt={settings.name}
                        className="w-12 h-12 rounded-full"
                      />
                    ) : (
                      <div className="w-12 h-12 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full flex items-center justify-center">
                        <User className="h-6 w-6 text-white" />
                      </div>
                    )}
                    <div>
                      <h4 className="font-medium text-gray-900">{settings.name}</h4>
                      <p className="text-sm text-gray-600">@{settings.publicUsername}</p>
                    </div>
                  </div>
                  {settings.bio && (
                    <p className="text-sm text-gray-700">{settings.bio}</p>
                  )}
                  <div className="flex items-center space-x-2 text-sm">
                    {settings.profilePublic ? (
                      <>
                        <Eye className="h-4 w-4 text-green-600" />
                        <span className="text-green-600">Public</span>
                      </>
                    ) : (
                      <>
                        <EyeOff className="h-4 w-4 text-gray-400" />
                        <span className="text-gray-500">Private</span>
                      </>
                    )}
                  </div>
                </div>
              </div>

              {/* Help */}
              <div className="bg-blue-50 rounded-lg p-6">
                <h3 className="text-lg font-semibold text-blue-900 mb-3">Need Help?</h3>
                <p className="text-blue-800 text-sm mb-4">
                  Learn more about profile settings and privacy controls.
                </p>
                <Link
                  href="/help/profile-settings"
                  className="text-blue-600 hover:text-blue-700 text-sm font-medium"
                >
                  View Documentation →
                </Link>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}