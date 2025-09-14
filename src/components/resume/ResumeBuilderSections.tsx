import { useState } from 'react';
import { Plus, Trash2, ChevronDown, ChevronUp, Briefcase, GraduationCap, Code, Award, Trophy, Users } from 'lucide-react';
import { cn } from '@/lib/utils';

// Types (duplicated for component file)
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

// Experience Section Component
interface ExperienceSectionProps {
  data: Experience[];
  isExpanded: boolean;
  onToggle: () => void;
  onUpdate: (data: Experience[]) => void;
  generateId: () => string;
}

export function ExperienceSection({ data, isExpanded, onToggle, onUpdate, generateId }: ExperienceSectionProps) {
  const addExperience = () => {
    const newExperience: Experience = {
      id: generateId(),
      title: '',
      company: '',
      location: '',
      startDate: '',
      endDate: '',
      isCurrent: false,
      description: '',
      achievements: ['']
    };
    onUpdate([...data, newExperience]);
  };

  const updateExperience = (id: string, field: keyof Experience, value: any) => {
    const updated = data.map(exp => 
      exp.id === id ? { ...exp, [field]: value } : exp
    );
    onUpdate(updated);
  };

  const removeExperience = (id: string) => {
    onUpdate(data.filter(exp => exp.id !== id));
  };

  const addAchievement = (expId: string) => {
    updateExperience(expId, 'achievements', [...data.find(exp => exp.id === expId)!.achievements, '']);
  };

  const updateAchievement = (expId: string, index: number, value: string) => {
    const experience = data.find(exp => exp.id === expId)!;
    const achievements = [...experience.achievements];
    achievements[index] = value;
    updateExperience(expId, 'achievements', achievements);
  };

  const removeAchievement = (expId: string, index: number) => {
    const experience = data.find(exp => exp.id === expId)!;
    const achievements = experience.achievements.filter((_, i) => i !== index);
    updateExperience(expId, 'achievements', achievements);
  };

  return (
    <div className="bg-white rounded-lg shadow-sm border">
      <button
        onClick={onToggle}
        className="w-full flex items-center justify-between p-6 text-left"
      >
        <div className="flex items-center">
          <Briefcase className="h-5 w-5 text-primary mr-3" />
          <h2 className="text-lg font-medium text-gray-900">Work Experience</h2>
          {data.length > 0 && (
            <span className="ml-2 px-2 py-1 bg-primary/10 text-primary text-xs rounded-full">
              {data.length}
            </span>
          )}
        </div>
        {isExpanded ? <ChevronUp className="h-5 w-5" /> : <ChevronDown className="h-5 w-5" />}
      </button>

      {isExpanded && (
        <div className="px-6 pb-6">
          <div className="space-y-6">
            {data.map((experience) => (
              <div key={experience.id} className="border border-gray-200 rounded-lg p-4 relative">
                <button
                  onClick={() => removeExperience(experience.id)}
                  className="absolute top-4 right-4 text-red-500 hover:text-red-700"
                >
                  <Trash2 className="h-4 w-4" />
                </button>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Job Title *
                    </label>
                    <input
                      type="text"
                      value={experience.title}
                      onChange={(e) => updateExperience(experience.id, 'title', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                      placeholder="Software Engineer"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Company *
                    </label>
                    <input
                      type="text"
                      value={experience.company}
                      onChange={(e) => updateExperience(experience.id, 'company', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                      placeholder="Google"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Location
                    </label>
                    <input
                      type="text"
                      value={experience.location || ''}
                      onChange={(e) => updateExperience(experience.id, 'location', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                      placeholder="San Francisco, CA"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Start Date *
                    </label>
                    <input
                      type="month"
                      value={experience.startDate}
                      onChange={(e) => updateExperience(experience.id, 'startDate', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                      required
                    />
                  </div>

                  <div className="md:col-span-2">
                    <div className="flex items-center space-x-4">
                      <label className="flex items-center">
                        <input
                          type="checkbox"
                          checked={experience.isCurrent}
                          onChange={(e) => {
                            updateExperience(experience.id, 'isCurrent', e.target.checked);
                            if (e.target.checked) {
                              updateExperience(experience.id, 'endDate', '');
                            }
                          }}
                          className="h-4 w-4 text-primary focus:ring-primary border-gray-300 rounded"
                        />
                        <span className="ml-2 text-sm text-gray-700">I currently work here</span>
                      </label>
                      
                      {!experience.isCurrent && (
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            End Date
                          </label>
                          <input
                            type="month"
                            value={experience.endDate || ''}
                            onChange={(e) => updateExperience(experience.id, 'endDate', e.target.value)}
                            className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                          />
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Job Description
                  </label>
                  <textarea
                    value={experience.description}
                    onChange={(e) => updateExperience(experience.id, 'description', e.target.value)}
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                    placeholder="Describe your role and responsibilities..."
                  />
                </div>

                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="block text-sm font-medium text-gray-700">
                      Key Achievements
                    </label>
                    <button
                      onClick={() => addAchievement(experience.id)}
                      className="flex items-center text-primary hover:text-primary/80 text-sm"
                    >
                      <Plus className="h-4 w-4 mr-1" />
                      Add Achievement
                    </button>
                  </div>
                  
                  <div className="space-y-2">
                    {experience.achievements.map((achievement, index) => (
                      <div key={index} className="flex items-center space-x-2">
                        <input
                          type="text"
                          value={achievement}
                          onChange={(e) => updateAchievement(experience.id, index, e.target.value)}
                          className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                          placeholder="• Increased team productivity by 30%..."
                        />
                        {experience.achievements.length > 1 && (
                          <button
                            onClick={() => removeAchievement(experience.id, index)}
                            className="text-red-500 hover:text-red-700"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            ))}

            <button
              onClick={addExperience}
              className="w-full border-2 border-dashed border-gray-300 rounded-lg p-4 text-gray-600 hover:border-primary hover:text-primary transition-all"
            >
              <Plus className="h-5 w-5 mx-auto mb-2" />
              Add Work Experience
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// Activities Section Component
interface ActivitiesSectionProps {
  data: Activity[];
  isExpanded: boolean;
  onToggle: () => void;
  onUpdate: (data: Activity[]) => void;
  generateId: () => string;
}

export function ActivitiesSection({ data, isExpanded, onToggle, onUpdate, generateId }: ActivitiesSectionProps) {
  const addActivity = () => {
    const newActivity: Activity = {
      id: generateId(),
      title: '',
      organization: '',
      role: '',
      startDate: '',
      endDate: '',
      description: ''
    };
    onUpdate([...data, newActivity]);
  };

  const updateActivity = (id: string, field: keyof Activity, value: any) => {
    const updated = data.map(activity => 
      activity.id === id ? { ...activity, [field]: value } : activity
    );
    onUpdate(updated);
  };

  const removeActivity = (id: string) => {
    onUpdate(data.filter(activity => activity.id !== id));
  };

  return (
    <div className="bg-white rounded-lg shadow-sm border">
      <button
        onClick={onToggle}
        className="w-full flex items-center justify-between p-6 text-left"
      >
        <div className="flex items-center">
          <Users className="h-5 w-5 text-primary mr-3" />
          <h2 className="text-lg font-medium text-gray-900">Extracurricular Activities</h2>
          {data.length > 0 && (
            <span className="ml-2 px-2 py-1 bg-primary/10 text-primary text-xs rounded-full">
              {data.length}
            </span>
          )}
        </div>
        {isExpanded ? <ChevronUp className="h-5 w-5" /> : <ChevronDown className="h-5 w-5" />}
      </button>

      {isExpanded && (
        <div className="px-6 pb-6">
          <div className="space-y-6">
            {data.map((activity) => (
              <div key={activity.id} className="border border-gray-200 rounded-lg p-4 relative">
                <button
                  onClick={() => removeActivity(activity.id)}
                  className="absolute top-4 right-4 text-red-500 hover:text-red-700"
                >
                  <Trash2 className="h-4 w-4" />
                </button>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Activity Title *
                    </label>
                    <input
                      type="text"
                      value={activity.title}
                      onChange={(e) => updateActivity(activity.id, 'title', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                      placeholder="Volunteer Work, Sports Team, Club"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Organization *
                    </label>
                    <input
                      type="text"
                      value={activity.organization}
                      onChange={(e) => updateActivity(activity.id, 'organization', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                      placeholder="Red Cross, University Soccer Team"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Role/Position
                    </label>
                    <input
                      type="text"
                      value={activity.role || ''}
                      onChange={(e) => updateActivity(activity.id, 'role', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                      placeholder="Team Captain, Volunteer Coordinator"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Start Date
                    </label>
                    <input
                      type="month"
                      value={activity.startDate || ''}
                      onChange={(e) => updateActivity(activity.id, 'startDate', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      End Date
                    </label>
                    <input
                      type="month"
                      value={activity.endDate || ''}
                      onChange={(e) => updateActivity(activity.id, 'endDate', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Description
                  </label>
                  <textarea
                    value={activity.description}
                    onChange={(e) => updateActivity(activity.id, 'description', e.target.value)}
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                    placeholder="Describe your involvement and any key accomplishments..."
                  />
                </div>
              </div>
            ))}

            <button
              onClick={addActivity}
              className="w-full border-2 border-dashed border-gray-300 rounded-lg p-4 text-gray-600 hover:border-primary hover:text-primary transition-all"
            >
              <Plus className="h-5 w-5 mx-auto mb-2" />
              Add Activity
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// Projects Section Component
interface ProjectsSectionProps {
  data: Project[];
  isExpanded: boolean;
  onToggle: () => void;
  onUpdate: (data: Project[]) => void;
  generateId: () => string;
}

export function ProjectsSection({ data, isExpanded, onToggle, onUpdate, generateId }: ProjectsSectionProps) {
  const addProject = () => {
    const newProject: Project = {
      id: generateId(),
      name: '',
      description: '',
      technologies: [''],
      url: '',
      githubUrl: '',
      achievements: ['']
    };
    onUpdate([...data, newProject]);
  };

  const updateProject = (id: string, field: keyof Project, value: any) => {
    const updated = data.map(project => 
      project.id === id ? { ...project, [field]: value } : project
    );
    onUpdate(updated);
  };

  const removeProject = (id: string) => {
    onUpdate(data.filter(project => project.id !== id));
  };

  const addTechnology = (projectId: string) => {
    const project = data.find(p => p.id === projectId)!;
    updateProject(projectId, 'technologies', [...project.technologies, '']);
  };

  const updateTechnology = (projectId: string, index: number, value: string) => {
    const project = data.find(p => p.id === projectId)!;
    const technologies = [...project.technologies];
    technologies[index] = value;
    updateProject(projectId, 'technologies', technologies);
  };

  const removeTechnology = (projectId: string, index: number) => {
    const project = data.find(p => p.id === projectId)!;
    const technologies = project.technologies.filter((_, i) => i !== index);
    updateProject(projectId, 'technologies', technologies);
  };

  const addAchievement = (projectId: string) => {
    const project = data.find(p => p.id === projectId)!;
    updateProject(projectId, 'achievements', [...project.achievements, '']);
  };

  const updateAchievement = (projectId: string, index: number, value: string) => {
    const project = data.find(p => p.id === projectId)!;
    const achievements = [...project.achievements];
    achievements[index] = value;
    updateProject(projectId, 'achievements', achievements);
  };

  const removeAchievement = (projectId: string, index: number) => {
    const project = data.find(p => p.id === projectId)!;
    const achievements = project.achievements.filter((_, i) => i !== index);
    updateProject(projectId, 'achievements', achievements);
  };

  return (
    <div className="bg-white rounded-lg shadow-sm border">
      <button
        onClick={onToggle}
        className="w-full flex items-center justify-between p-6 text-left"
      >
        <div className="flex items-center">
          <Code className="h-5 w-5 text-primary mr-3" />
          <h2 className="text-lg font-medium text-gray-900">Projects</h2>
          {data.length > 0 && (
            <span className="ml-2 px-2 py-1 bg-primary/10 text-primary text-xs rounded-full">
              {data.length}
            </span>
          )}
        </div>
        {isExpanded ? <ChevronUp className="h-5 w-5" /> : <ChevronDown className="h-5 w-5" />}
      </button>

      {isExpanded && (
        <div className="px-6 pb-6">
          <div className="space-y-6">
            {data.map((project) => (
              <div key={project.id} className="border border-gray-200 rounded-lg p-4 relative">
                <button
                  onClick={() => removeProject(project.id)}
                  className="absolute top-4 right-4 text-red-500 hover:text-red-700"
                >
                  <Trash2 className="h-4 w-4" />
                </button>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Project Name *
                    </label>
                    <input
                      type="text"
                      value={project.name}
                      onChange={(e) => updateProject(project.id, 'name', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                      placeholder="E-commerce Website"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Project URL
                    </label>
                    <input
                      type="url"
                      value={project.url || ''}
                      onChange={(e) => updateProject(project.id, 'url', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                      placeholder="https://myproject.com"
                    />
                  </div>

                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      GitHub URL
                    </label>
                    <input
                      type="url"
                      value={project.githubUrl || ''}
                      onChange={(e) => updateProject(project.id, 'githubUrl', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                      placeholder="https://github.com/username/project"
                    />
                  </div>
                </div>

                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Description *
                  </label>
                  <textarea
                    value={project.description}
                    onChange={(e) => updateProject(project.id, 'description', e.target.value)}
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                    placeholder="Describe your project and its purpose..."
                    required
                  />
                </div>

                <div className="mb-4">
                  <div className="flex items-center justify-between mb-2">
                    <label className="block text-sm font-medium text-gray-700">
                      Technologies Used
                    </label>
                    <button
                      onClick={() => addTechnology(project.id)}
                      className="flex items-center text-primary hover:text-primary/80 text-sm"
                    >
                      <Plus className="h-4 w-4 mr-1" />
                      Add Technology
                    </button>
                  </div>
                  
                  <div className="space-y-2">
                    {project.technologies.map((tech, index) => (
                      <div key={index} className="flex items-center space-x-2">
                        <input
                          type="text"
                          value={tech}
                          onChange={(e) => updateTechnology(project.id, index, e.target.value)}
                          className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                          placeholder="React, Node.js, MongoDB"
                        />
                        {project.technologies.length > 1 && (
                          <button
                            onClick={() => removeTechnology(project.id, index)}
                            className="text-red-500 hover:text-red-700"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="block text-sm font-medium text-gray-700">
                      Key Achievements
                    </label>
                    <button
                      onClick={() => addAchievement(project.id)}
                      className="flex items-center text-primary hover:text-primary/80 text-sm"
                    >
                      <Plus className="h-4 w-4 mr-1" />
                      Add Achievement
                    </button>
                  </div>
                  
                  <div className="space-y-2">
                    {project.achievements.map((achievement, index) => (
                      <div key={index} className="flex items-center space-x-2">
                        <input
                          type="text"
                          value={achievement}
                          onChange={(e) => updateAchievement(project.id, index, e.target.value)}
                          className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                          placeholder="• Achieved 99% uptime with 10k+ users"
                        />
                        {project.achievements.length > 1 && (
                          <button
                            onClick={() => removeAchievement(project.id, index)}
                            className="text-red-500 hover:text-red-700"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            ))}

            <button
              onClick={addProject}
              className="w-full border-2 border-dashed border-gray-300 rounded-lg p-4 text-gray-600 hover:border-primary hover:text-primary transition-all"
            >
              <Plus className="h-5 w-5 mx-auto mb-2" />
              Add Project
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// Certifications Section Component
interface CertificationsSectionProps {
  data: Certification[];
  isExpanded: boolean;
  onToggle: () => void;
  onUpdate: (data: Certification[]) => void;
  generateId: () => string;
}

export function CertificationsSection({ data, isExpanded, onToggle, onUpdate, generateId }: CertificationsSectionProps) {
  const addCertification = () => {
    const newCertification: Certification = {
      id: generateId(),
      name: '',
      issuer: '',
      issueDate: '',
      expirationDate: '',
      credentialId: '',
      url: ''
    };
    onUpdate([...data, newCertification]);
  };

  const updateCertification = (id: string, field: keyof Certification, value: any) => {
    const updated = data.map(cert => 
      cert.id === id ? { ...cert, [field]: value } : cert
    );
    onUpdate(updated);
  };

  const removeCertification = (id: string) => {
    onUpdate(data.filter(cert => cert.id !== id));
  };

  return (
    <div className="bg-white rounded-lg shadow-sm border">
      <button
        onClick={onToggle}
        className="w-full flex items-center justify-between p-6 text-left"
      >
        <div className="flex items-center">
          <Award className="h-5 w-5 text-primary mr-3" />
          <h2 className="text-lg font-medium text-gray-900">Certifications</h2>
          {data.length > 0 && (
            <span className="ml-2 px-2 py-1 bg-primary/10 text-primary text-xs rounded-full">
              {data.length}
            </span>
          )}
        </div>
        {isExpanded ? <ChevronUp className="h-5 w-5" /> : <ChevronDown className="h-5 w-5" />}
      </button>

      {isExpanded && (
        <div className="px-6 pb-6">
          <div className="space-y-6">
            {data.map((certification) => (
              <div key={certification.id} className="border border-gray-200 rounded-lg p-4 relative">
                <button
                  onClick={() => removeCertification(certification.id)}
                  className="absolute top-4 right-4 text-red-500 hover:text-red-700"
                >
                  <Trash2 className="h-4 w-4" />
                </button>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Certification Name *
                    </label>
                    <input
                      type="text"
                      value={certification.name}
                      onChange={(e) => updateCertification(certification.id, 'name', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                      placeholder="AWS Certified Solutions Architect"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Issuing Organization *
                    </label>
                    <input
                      type="text"
                      value={certification.issuer}
                      onChange={(e) => updateCertification(certification.id, 'issuer', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                      placeholder="Amazon Web Services"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Issue Date
                    </label>
                    <input
                      type="month"
                      value={certification.issueDate || ''}
                      onChange={(e) => updateCertification(certification.id, 'issueDate', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Expiration Date
                    </label>
                    <input
                      type="month"
                      value={certification.expirationDate || ''}
                      onChange={(e) => updateCertification(certification.id, 'expirationDate', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Credential ID
                    </label>
                    <input
                      type="text"
                      value={certification.credentialId || ''}
                      onChange={(e) => updateCertification(certification.id, 'credentialId', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                      placeholder="ABC123DEF456"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Verification URL
                    </label>
                    <input
                      type="url"
                      value={certification.url || ''}
                      onChange={(e) => updateCertification(certification.id, 'url', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                      placeholder="https://verify.certificate.com"
                    />
                  </div>
                </div>
              </div>
            ))}

            <button
              onClick={addCertification}
              className="w-full border-2 border-dashed border-gray-300 rounded-lg p-4 text-gray-600 hover:border-primary hover:text-primary transition-all"
            >
              <Plus className="h-5 w-5 mx-auto mb-2" />
              Add Certification
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// Skills Section Component
interface SkillsSectionProps {
  data: string[];
  isExpanded: boolean;
  onToggle: () => void;
  onUpdate: (data: string[]) => void;
}

export function SkillsSection({ data, isExpanded, onToggle, onUpdate }: SkillsSectionProps) {
  const [newSkill, setNewSkill] = useState('');

  const addSkill = () => {
    if (newSkill.trim() && !data.includes(newSkill.trim())) {
      onUpdate([...data, newSkill.trim()]);
      setNewSkill('');
    }
  };

  const removeSkill = (index: number) => {
    onUpdate(data.filter((_, i) => i !== index));
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      addSkill();
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-sm border">
      <button
        onClick={onToggle}
        className="w-full flex items-center justify-between p-6 text-left"
      >
        <div className="flex items-center">
          <Trophy className="h-5 w-5 text-primary mr-3" />
          <h2 className="text-lg font-medium text-gray-900">Skills</h2>
          {data.length > 0 && (
            <span className="ml-2 px-2 py-1 bg-primary/10 text-primary text-xs rounded-full">
              {data.length}
            </span>
          )}
        </div>
        {isExpanded ? <ChevronUp className="h-5 w-5" /> : <ChevronDown className="h-5 w-5" />}
      </button>

      {isExpanded && (
        <div className="px-6 pb-6">
          <div className="mb-4">
            <div className="flex items-center space-x-2">
              <input
                type="text"
                value={newSkill}
                onChange={(e) => setNewSkill(e.target.value)}
                onKeyPress={handleKeyPress}
                className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                placeholder="Enter a skill (e.g., JavaScript, Python, Leadership)"
              />
              <button
                onClick={addSkill}
                disabled={!newSkill.trim() || data.includes(newSkill.trim())}
                className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 disabled:bg-gray-300 disabled:cursor-not-allowed"
              >
                Add
              </button>
            </div>
            <p className="text-xs text-gray-500 mt-1">
              Press Enter or click Add to include a skill. Include both technical and soft skills.
            </p>
          </div>

          {data.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {data.map((skill, index) => (
                <div
                  key={index}
                  className="flex items-center bg-primary/10 text-primary px-3 py-1 rounded-full text-sm"
                >
                  <span>{skill}</span>
                  <button
                    onClick={() => removeSkill(index)}
                    className="ml-2 text-primary/70 hover:text-primary"
                  >
                    <Trash2 className="h-3 w-3" />
                  </button>
                </div>
              ))}
            </div>
          )}

          {data.length === 0 && (
            <div className="text-center py-8 text-gray-500">
              <Trophy className="h-12 w-12 mx-auto mb-4 text-gray-300" />
              <p>No skills added yet. Add your technical and soft skills above.</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// Achievements Section Component
interface AchievementsSectionProps {
  data: Achievement[];
  isExpanded: boolean;
  onToggle: () => void;
  onUpdate: (data: Achievement[]) => void;
  generateId: () => string;
}

export function AchievementsSection({ data, isExpanded, onToggle, onUpdate, generateId }: AchievementsSectionProps) {
  const addAchievement = () => {
    const newAchievement: Achievement = {
      id: generateId(),
      title: '',
      description: '',
      date: '',
      category: ''
    };
    onUpdate([...data, newAchievement]);
  };

  const updateAchievement = (id: string, field: keyof Achievement, value: any) => {
    const updated = data.map(achievement => 
      achievement.id === id ? { ...achievement, [field]: value } : achievement
    );
    onUpdate(updated);
  };

  const removeAchievement = (id: string) => {
    onUpdate(data.filter(achievement => achievement.id !== id));
  };

  const achievementCategories = [
    'Academic',
    'Professional',
    'Technical',
    'Leadership',
    'Community',
    'Awards',
    'Publications',
    'Other'
  ];

  return (
    <div className="bg-white rounded-lg shadow-sm border">
      <button
        onClick={onToggle}
        className="w-full flex items-center justify-between p-6 text-left"
      >
        <div className="flex items-center">
          <Trophy className="h-5 w-5 text-primary mr-3" />
          <h2 className="text-lg font-medium text-gray-900">Achievements</h2>
          {data.length > 0 && (
            <span className="ml-2 px-2 py-1 bg-primary/10 text-primary text-xs rounded-full">
              {data.length}
            </span>
          )}
        </div>
        {isExpanded ? <ChevronUp className="h-5 w-5" /> : <ChevronDown className="h-5 w-5" />}
      </button>

      {isExpanded && (
        <div className="px-6 pb-6">
          <div className="space-y-6">
            {data.map((achievement) => (
              <div key={achievement.id} className="border border-gray-200 rounded-lg p-4 relative">
                <button
                  onClick={() => removeAchievement(achievement.id)}
                  className="absolute top-4 right-4 text-red-500 hover:text-red-700"
                >
                  <Trash2 className="h-4 w-4" />
                </button>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Achievement Title *
                    </label>
                    <input
                      type="text"
                      value={achievement.title}
                      onChange={(e) => updateAchievement(achievement.id, 'title', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                      placeholder="Employee of the Year"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Category
                    </label>
                    <select
                      value={achievement.category}
                      onChange={(e) => updateAchievement(achievement.id, 'category', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                    >
                      <option value="">Select category</option>
                      {achievementCategories.map(category => (
                        <option key={category} value={category}>{category}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Date
                    </label>
                    <input
                      type="month"
                      value={achievement.date || ''}
                      onChange={(e) => updateAchievement(achievement.id, 'date', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Description
                  </label>
                  <textarea
                    value={achievement.description}
                    onChange={(e) => updateAchievement(achievement.id, 'description', e.target.value)}
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                    placeholder="Describe the achievement and its significance..."
                  />
                </div>
              </div>
            ))}

            <button
              onClick={addAchievement}
              className="w-full border-2 border-dashed border-gray-300 rounded-lg p-4 text-gray-600 hover:border-primary hover:text-primary transition-all"
            >
              <Plus className="h-5 w-5 mx-auto mb-2" />
              Add Achievement
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// Education Section Component
interface EducationSectionProps {
  data: Education[];
  isExpanded: boolean;
  onToggle: () => void;
  onUpdate: (data: Education[]) => void;
  generateId: () => string;
}

export function EducationSection({ data, isExpanded, onToggle, onUpdate, generateId }: EducationSectionProps) {
  const addEducation = () => {
    const newEducation: Education = {
      id: generateId(),
      degree: '',
      institution: '',
      location: '',
      graduationDate: '',
      gpa: '',
      relevantCoursework: ['']
    };
    onUpdate([...data, newEducation]);
  };

  const updateEducation = (id: string, field: keyof Education, value: any) => {
    const updated = data.map(edu => 
      edu.id === id ? { ...edu, [field]: value } : edu
    );
    onUpdate(updated);
  };

  const removeEducation = (id: string) => {
    onUpdate(data.filter(edu => edu.id !== id));
  };

  const addCoursework = (eduId: string) => {
    const education = data.find(edu => edu.id === eduId)!;
    updateEducation(eduId, 'relevantCoursework', [...education.relevantCoursework, '']);
  };

  const updateCoursework = (eduId: string, index: number, value: string) => {
    const education = data.find(edu => edu.id === eduId)!;
    const coursework = [...education.relevantCoursework];
    coursework[index] = value;
    updateEducation(eduId, 'relevantCoursework', coursework);
  };

  const removeCoursework = (eduId: string, index: number) => {
    const education = data.find(edu => edu.id === eduId)!;
    const coursework = education.relevantCoursework.filter((_, i) => i !== index);
    updateEducation(eduId, 'relevantCoursework', coursework);
  };

  return (
    <div className="bg-white rounded-lg shadow-sm border">
      <button
        onClick={onToggle}
        className="w-full flex items-center justify-between p-6 text-left"
      >
        <div className="flex items-center">
          <GraduationCap className="h-5 w-5 text-primary mr-3" />
          <h2 className="text-lg font-medium text-gray-900">Education</h2>
          {data.length > 0 && (
            <span className="ml-2 px-2 py-1 bg-primary/10 text-primary text-xs rounded-full">
              {data.length}
            </span>
          )}
        </div>
        {isExpanded ? <ChevronUp className="h-5 w-5" /> : <ChevronDown className="h-5 w-5" />}
      </button>

      {isExpanded && (
        <div className="px-6 pb-6">
          <div className="space-y-6">
            {data.map((education) => (
              <div key={education.id} className="border border-gray-200 rounded-lg p-4 relative">
                <button
                  onClick={() => removeEducation(education.id)}
                  className="absolute top-4 right-4 text-red-500 hover:text-red-700"
                >
                  <Trash2 className="h-4 w-4" />
                </button>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Degree *
                    </label>
                    <input
                      type="text"
                      value={education.degree}
                      onChange={(e) => updateEducation(education.id, 'degree', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                      placeholder="Bachelor of Science in Computer Science"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Institution *
                    </label>
                    <input
                      type="text"
                      value={education.institution}
                      onChange={(e) => updateEducation(education.id, 'institution', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                      placeholder="Stanford University"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Location
                    </label>
                    <input
                      type="text"
                      value={education.location || ''}
                      onChange={(e) => updateEducation(education.id, 'location', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                      placeholder="Stanford, CA"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Graduation Date
                    </label>
                    <input
                      type="month"
                      value={education.graduationDate || ''}
                      onChange={(e) => updateEducation(education.id, 'graduationDate', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      GPA (Optional)
                    </label>
                    <input
                      type="text"
                      value={education.gpa || ''}
                      onChange={(e) => updateEducation(education.id, 'gpa', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                      placeholder="3.8/4.0"
                    />
                  </div>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="block text-sm font-medium text-gray-700">
                      Relevant Coursework
                    </label>
                    <button
                      onClick={() => addCoursework(education.id)}
                      className="flex items-center text-primary hover:text-primary/80 text-sm"
                    >
                      <Plus className="h-4 w-4 mr-1" />
                      Add Course
                    </button>
                  </div>
                  
                  <div className="space-y-2">
                    {education.relevantCoursework.map((course, index) => (
                      <div key={index} className="flex items-center space-x-2">
                        <input
                          type="text"
                          value={course}
                          onChange={(e) => updateCoursework(education.id, index, e.target.value)}
                          className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                          placeholder="Data Structures and Algorithms"
                        />
                        {education.relevantCoursework.length > 1 && (
                          <button
                            onClick={() => removeCoursework(education.id, index)}
                            className="text-red-500 hover:text-red-700"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            ))}

            <button
              onClick={addEducation}
              className="w-full border-2 border-dashed border-gray-300 rounded-lg p-4 text-gray-600 hover:border-primary hover:text-primary transition-all"
            >
              <Plus className="h-5 w-5 mx-auto mb-2" />
              Add Education
            </button>
          </div>
        </div>
      )}
    </div>
  );
}