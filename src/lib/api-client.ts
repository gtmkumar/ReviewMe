import { getSession } from 'next-auth/react';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';

interface ApiOptions {
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
  body?: any;
  headers?: Record<string, string>;
  isFormData?: boolean;
}

class ApiClient {
  private async getAuthHeaders(): Promise<Record<string, string>> {
    const session = await getSession();
    const headers: Record<string, string> = {};
    
    if (session?.accessToken) {
      headers.Authorization = `Bearer ${session.accessToken}`;
    }
    
    return headers;
  }

  async request<T>(endpoint: string, options: ApiOptions = {}): Promise<T> {
    const { method = 'GET', body, headers = {}, isFormData = false } = options;
    
    const authHeaders = await this.getAuthHeaders();
    const finalHeaders = {
      ...authHeaders,
      ...headers,
    };

    // Don't set Content-Type for FormData - let browser set it with boundary
    if (!isFormData) {
      finalHeaders['Content-Type'] = 'application/json';
    }

    const config: RequestInit = {
      method,
      headers: finalHeaders,
      credentials: 'include',
    };

    if (body) {
      config.body = isFormData ? body : JSON.stringify(body);
    }

    try {
      const response = await fetch(`${API_BASE_URL}${endpoint}`, config);
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `HTTP ${response.status}: ${response.statusText}`);
      }

      const contentType = response.headers.get('content-type');
      if (contentType && contentType.includes('application/json')) {
        return await response.json();
      }
      
      return response.text() as any;
    } catch (error) {
      console.error(`API request failed: ${method} ${endpoint}`, error);
      throw error;
    }
  }

  // User Profile
  async getProfile() {
    return this.request('/profile');
  }

  async updateProfile(data: any) {
    return this.request('/profile', {
      method: 'PUT',
      body: data,
    });
  }

  // File Uploads
  async uploadResume(file: File) {
    const formData = new FormData();
    formData.append('resume', file);
    
    return this.request('/upload/resume', {
      method: 'POST',
      body: formData,
      isFormData: true,
    });
  }

  async uploadDocument(file: File, type: string) {
    const formData = new FormData();
    formData.append('document', file);
    formData.append('type', type);
    
    return this.request('/upload/document', {
      method: 'POST',
      body: formData,
      isFormData: true,
    });
  }

  // Integrations
  async getIntegrations() {
    return this.request('/integrations');
  }

  async syncGitHub() {
    return this.request('/integrations/github/sync', {
      method: 'POST',
    });
  }

  async connectIntegration(provider: string, data: any) {
    return this.request(`/integrations/${provider}/connect`, {
      method: 'POST',
      body: data,
    });
  }

  async disconnectIntegration(provider: string) {
    return this.request(`/integrations/${provider}/disconnect`, {
      method: 'DELETE',
    });
  }

  // Recommendations
  async getRecommendations() {
    return this.request('/recommendations');
  }

  async completeRecommendation(id: string) {
    return this.request(`/recommendations/${id}/complete`, {
      method: 'POST',
    });
  }

  async dismissRecommendation(id: string) {
    return this.request(`/recommendations/${id}/dismiss`, {
      method: 'POST',
    });
  }

  async completeActionItem(recommendationId: string, actionItemId: string) {
    return this.request(`/recommendations/${recommendationId}/actions/${actionItemId}/complete`, {
      method: 'POST',
    });
  }

  // Analytics
  async getAnalytics(timeRange?: string) {
    const params = timeRange ? `?timeRange=${timeRange}` : '';
    return this.request(`/analytics${params}`);
  }

  async getProfileScore() {
    return this.request('/analytics/score');
  }

  async getBenchmarkData(filters?: any) {
    return this.request('/analytics/benchmark', {
      method: 'POST',
      body: filters,
    });
  }

  // GitHub Integration
  async getGitHubProfile() {
    return this.request('/github/profile');
  }

  async getGitHubRepositories() {
    return this.request('/github/repositories');
  }

  async analyzeGitHubActivity() {
    return this.request('/github/analyze', {
      method: 'POST',
    });
  }

  // Resume Analysis
  async getResumeAnalysis(resumeId: string) {
    return this.request(`/resume/${resumeId}/analysis`);
  }

  async getResumeVersions() {
    return this.request('/resume/versions');
  }

  async deleteResume(resumeId: string) {
    return this.request(`/resume/${resumeId}`, {
      method: 'DELETE',
    });
  }

  // LinkedIn Import
  async uploadLinkedInData(file: File) {
    const formData = new FormData();
    formData.append('linkedin', file);
    
    return this.request('/linkedin/upload', {
      method: 'POST',
      body: formData,
      isFormData: true,
    });
  }

  async getLinkedInAnalysis() {
    return this.request('/linkedin/analysis');
  }

  // Notifications
  async getNotifications() {
    return this.request('/notifications');
  }

  async markNotificationRead(id: string) {
    return this.request(`/notifications/${id}/read`, {
      method: 'POST',
    });
  }

  async markAllNotificationsRead() {
    return this.request('/notifications/read-all', {
      method: 'POST',
    });
  }

  // User Preferences
  async getPreferences() {
    return this.request('/preferences');
  }

  async updatePreferences(preferences: any) {
    return this.request('/preferences', {
      method: 'PUT',
      body: preferences,
    });
  }

  // Export Data
  async exportUserData() {
    return this.request('/export/data');
  }

  async deleteUserData() {
    return this.request('/user/delete', {
      method: 'DELETE',
    });
  }
}

// Create singleton instance
export const apiClient = new ApiClient();

// React Query helpers
export const createQueryKey = (endpoint: string, params?: any) => {
  if (params) {
    return [endpoint, params];
  }
  return [endpoint];
};

// Error handling utility
export const isApiError = (error: any): error is { message: string; status?: number } => {
  return error && typeof error.message === 'string';
};

// Retry configuration for React Query
export const queryRetryConfig = {
  retry: (failureCount: number, error: any) => {
    // Don't retry on 4xx errors except 429 (rate limit)
    if (error?.status >= 400 && error?.status < 500 && error?.status !== 429) {
      return false;
    }
    return failureCount < 3;
  },
  retryDelay: (attemptIndex: number) => Math.min(1000 * 2 ** attemptIndex, 30000),
};

export default apiClient;