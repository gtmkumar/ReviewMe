import pdfParse from 'pdf-parse';
import fs from 'fs';
import { JSDOM } from 'jsdom';
import { getDbManager } from './database';

export interface LinkedInProfile {
  personalInfo: {
    firstName: string;
    lastName: string;
    headline: string;
    summary: string;
    location: string;
    industry: string;
    profileUrl?: string;
    email?: string;
    phone?: string;
  };
  experience: LinkedInExperience[];
  education: LinkedInEducation[];
  skills: LinkedInSkill[];
  certifications: LinkedInCertification[];
  languages: LinkedInLanguage[];
  rawData: string;
}

export interface LinkedInExperience {
  title: string;
  company: string;
  companyUrl?: string;
  location?: string;
  description?: string;
  startDate: string;
  endDate?: string;
  isCurrent: boolean;
  duration?: string;
}

export interface LinkedInEducation {
  school: string;
  degree: string;
  fieldOfStudy: string;
  startYear?: string;
  endYear?: string;
  description?: string;
  activities?: string;
}

export interface LinkedInSkill {
  name: string;
  endorsements: number;
  endorsed: boolean;
}

export interface LinkedInCertification {
  name: string;
  authority: string;
  licenseNumber?: string;
  url?: string;
  issueDate?: string;
  expirationDate?: string;
}

export interface LinkedInLanguage {
  name: string;
  proficiency?: string;
}

export interface LinkedInScore {
  overall: number;
  completeness: number;
  keywords: number;
  engagement: number;
  professional: number;
  breakdown: {
    profilePhoto: number;
    headline: number;
    summary: number;
    experience: number;
    education: number;
    skills: number;
    recommendations: number;
    connections: number;
    activityLevel: number;
  };
}

export class LinkedInService {
  private db = getDbManager();

  async parseLinkedInFile(filePath: string, fileType: 'pdf' | 'html'): Promise<LinkedInProfile> {
    try {
      let rawData: string;

      if (fileType === 'pdf') {
        rawData = await this.parsePDF(filePath);
      } else if (fileType === 'html') {
        rawData = await this.parseHTML(filePath);
      } else {
        throw new Error('Unsupported file type. Only PDF and HTML files are supported.');
      }

      return this.parseLinkedInContent(rawData, fileType);
    } catch (error) {
      console.error('Error parsing LinkedIn file:', error);
      throw new Error('Failed to parse LinkedIn file');
    }
  }

  private async parsePDF(filePath: string): Promise<string> {
    const buffer = fs.readFileSync(filePath);
    const data = await pdfParse(buffer);
    return data.text;
  }

  private async parseHTML(filePath: string): Promise<string> {
    const htmlContent = fs.readFileSync(filePath, 'utf-8');
    const dom = new JSDOM(htmlContent);
    const document = dom.window.document;

    // Extract text content while preserving some structure
    const textContent = document.body?.textContent || '';
    return textContent;
  }

  private parseLinkedInContent(content: string, fileType: 'pdf' | 'html'): LinkedInProfile {
    const lines = content.split('\n').filter(line => line.trim());
    const normalizedContent = content.toLowerCase();

    return {
      personalInfo: this.extractPersonalInfo(content, lines),
      experience: this.extractExperience(content, lines),
      education: this.extractEducation(content, lines),
      skills: this.extractSkills(content, lines),
      certifications: this.extractCertifications(content, lines),
      languages: this.extractLanguages(content, lines),
      rawData: content,
    };
  }

  private extractPersonalInfo(content: string, lines: string[]): LinkedInProfile['personalInfo'] {
    const emailRegex = /([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/g;
    const phoneRegex = /(\+?[\d\s\-\(\)\.]{10,})/g;
    const linkedInUrlRegex = /(linkedin\.com\/in\/[^\s]+)/gi;

    // Extract basic info (first few lines usually contain name and headline)
    let firstName = '';
    let lastName = '';
    let headline = '';
    let summary = '';
    let location = '';
    let industry = '';

    // Try to extract name from the first substantial line
    for (let i = 0; i < Math.min(5, lines.length); i++) {
      const line = lines[i].trim();
      if (line && line.length < 100 && !line.includes('@') && !line.match(phoneRegex)) {
        const nameParts = line.split(' ');
        if (nameParts.length >= 2) {
          firstName = nameParts[0];
          lastName = nameParts.slice(1).join(' ');
          break;
        }
      }
    }

    // Extract headline (usually appears after name)
    const headlineKeywords = ['at ', 'senior ', 'lead ', 'manager ', 'director ', 'engineer ', 'developer '];
    for (const line of lines.slice(0, 10)) {
      if (headlineKeywords.some(keyword => line.toLowerCase().includes(keyword))) {
        headline = line.trim();
        break;
      }
    }

    // Extract summary/about section
    const summaryStart = content.toLowerCase().indexOf('summary') || content.toLowerCase().indexOf('about');
    if (summaryStart !== -1) {
      const summarySection = content.substring(summaryStart);
      const summaryEnd = summarySection.search(/\n\s*[A-Z][A-Z\s]*\n/);
      
      if (summaryEnd !== -1) {
        summary = summarySection.substring(0, summaryEnd)
          .replace(/summary|about/gi, '')
          .trim();
        
        if (summary.length > 50 && summary.length < 1000) {
          // Keep the summary
        } else {
          summary = '';
        }
      }
    }

    // Extract location
    const locationRegex = /([A-Za-z\s]+,\s*[A-Z]{2}|[A-Za-z\s]+,\s*[A-Za-z\s]+)/g;
    const locationMatch = content.match(locationRegex);
    if (locationMatch) {
      location = locationMatch[0];
    }

    return {
      firstName,
      lastName,
      headline,
      summary,
      location,
      industry,
      profileUrl: content.match(linkedInUrlRegex)?.[0] || '',
      email: content.match(emailRegex)?.[0] || '',
      phone: content.match(phoneRegex)?.[0]?.replace(/[^\d+]/g, '') || '',
    };
  }

  private extractExperience(content: string, lines: string[]): LinkedInExperience[] {
    const experiences: LinkedInExperience[] = [];
    const experienceKeywords = ['experience', 'work history', 'employment', 'professional experience'];
    const lowerContent = content.toLowerCase();

    let experienceStart = -1;
    for (const keyword of experienceKeywords) {
      const index = lowerContent.indexOf(keyword);
      if (index !== -1) {
        experienceStart = index;
        break;
      }
    }

    if (experienceStart === -1) return experiences;

    const experienceSection = content.substring(experienceStart);
    const entries = experienceSection.split(/\n\s*\n/).filter(entry => entry.trim().length > 20);

    for (const entry of entries.slice(0, 10)) { // Limit to first 10 entries
      const entryLines = entry.split('\n').filter(line => line.trim());
      if (entryLines.length < 2) continue;

      // Date patterns
      const dateRegex = /(\d{4}|\w+\s+\d{4}|present|current)/gi;
      const dates = entry.match(dateRegex) || [];

      // Extract title and company
      let title = '';
      let company = '';
      
      for (const line of entryLines) {
        if (!dates.some(date => line.toLowerCase().includes(date.toLowerCase())) && 
            line.length < 150 && 
            !line.toLowerCase().includes('experience')) {
          
          if (line.includes(' at ')) {
            [title, company] = line.split(' at ');
          } else if (line.includes(' · ')) {
            [title, company] = line.split(' · ');
          } else if (!title && line.trim()) {
            title = line.trim();
          } else if (!company && line.trim() && title) {
            company = line.trim();
          }
          break;
        }
      }

      if (!title) continue;

      // Extract description
      const description = entryLines
        .filter(line => 
          !dates.some(date => line.includes(date)) &&
          line !== title &&
          line !== company &&
          line.trim().length > 20
        )
        .join(' ')
        .trim();

      // Determine if current position
      const isCurrent = entry.toLowerCase().includes('present') || 
                       entry.toLowerCase().includes('current');

      experiences.push({
        title: title.trim(),
        company: company.trim(),
        description,
        startDate: dates[0] || '',
        endDate: dates[1] || (isCurrent ? '' : dates[0]),
        isCurrent,
        duration: this.calculateDuration(dates[0], dates[1], isCurrent),
      });
    }

    return experiences;
  }

  private extractEducation(content: string, lines: string[]): LinkedInEducation[] {
    const education: LinkedInEducation[] = [];
    const educationKeywords = ['education', 'academic background', 'qualifications'];
    const lowerContent = content.toLowerCase();

    let educationStart = -1;
    for (const keyword of educationKeywords) {
      const index = lowerContent.indexOf(keyword);
      if (index !== -1) {
        educationStart = index;
        break;
      }
    }

    if (educationStart === -1) return education;

    const educationSection = content.substring(educationStart);
    const entries = educationSection.split(/\n\s*\n/).filter(entry => entry.trim().length > 20);

    for (const entry of entries.slice(0, 5)) { // Limit to first 5 entries
      const entryLines = entry.split('\n').filter(line => line.trim());
      
      let school = '';
      let degree = '';
      let fieldOfStudy = '';
      let startYear = '';
      let endYear = '';

      const yearRegex = /\b(19|20)\d{2}\b/g;
      const years = entry.match(yearRegex) || [];

      for (const line of entryLines) {
        if (line.toLowerCase().includes('university') || 
            line.toLowerCase().includes('college') || 
            line.toLowerCase().includes('institute') ||
            line.toLowerCase().includes('school')) {
          school = line.trim();
        } else if (line.toLowerCase().includes('bachelor') || 
                  line.toLowerCase().includes('master') || 
                  line.toLowerCase().includes('phd') || 
                  line.toLowerCase().includes('degree')) {
          degree = line.trim();
        } else if (!years.some(year => line.includes(year)) && 
                  line.length > 10 && 
                  !school && !degree) {
          if (!school) {
            school = line.trim();
          } else if (!degree) {
            degree = line.trim();
          }
        }
      }

      if (school) {
        education.push({
          school: school.trim(),
          degree: degree.trim(),
          fieldOfStudy: fieldOfStudy.trim(),
          startYear: years[0] || '',
          endYear: years[1] || years[0] || '',
        });
      }
    }

    return education;
  }

  private extractSkills(content: string, lines: string[]): LinkedInSkill[] {
    const skills: LinkedInSkill[] = [];
    const skillsKeywords = ['skills', 'technical skills', 'competencies', 'expertise'];
    const lowerContent = content.toLowerCase();

    let skillsStart = -1;
    for (const keyword of skillsKeywords) {
      const index = lowerContent.indexOf(keyword);
      if (index !== -1) {
        skillsStart = index;
        break;
      }
    }

    if (skillsStart === -1) return skills;

    const skillsSection = content.substring(skillsStart);
    const nextSectionIndex = skillsSection.search(/\n\s*[A-Z][A-Z\s]*\n/);
    const relevantText = nextSectionIndex !== -1 ? skillsSection.substring(0, nextSectionIndex) : skillsSection;

    // Extract skills from various formats
    const skillLines = relevantText
      .split('\n')
      .filter(line => line.trim())
      .filter(line => !skillsKeywords.some(keyword => line.toLowerCase().includes(keyword)));

    for (const line of skillLines) {
      // Check for endorsement numbers
      const endorsementMatch = line.match(/(\d+)\s*endorsements?/i);
      const endorsements = endorsementMatch ? parseInt(endorsementMatch[1]) : 0;

      // Extract skill name
      const skillName = line
        .replace(/\d+\s*endorsements?/i, '')
        .replace(/•|\-|\*/, '')
        .trim();

      if (skillName.length > 2 && skillName.length < 50) {
        skills.push({
          name: skillName,
          endorsements,
          endorsed: endorsements > 0,
        });
      }
    }

    // Also extract skills from comma-separated lists
    const commaSeparatedSkills = relevantText
      .split(/[,;]/)
      .map(skill => skill.trim())
      .filter(skill => skill.length > 2 && skill.length < 50)
      .filter(skill => !skillsKeywords.some(keyword => skill.toLowerCase().includes(keyword)));

    for (const skill of commaSeparatedSkills) {
      if (!skills.some(s => s.name.toLowerCase() === skill.toLowerCase())) {
        skills.push({
          name: skill,
          endorsements: 0,
          endorsed: false,
        });
      }
    }

    return skills.slice(0, 50); // Limit to 50 skills
  }

  private extractCertifications(content: string, lines: string[]): LinkedInCertification[] {
    const certifications: LinkedInCertification[] = [];
    const certKeywords = ['certification', 'certificate', 'credentials', 'licenses'];
    
    // Implementation would extract certification details
    // For now, return empty array
    return certifications;
  }

  private extractLanguages(content: string, lines: string[]): LinkedInLanguage[] {
    const languages: LinkedInLanguage[] = [];
    const languageKeywords = ['languages', 'language skills'];
    
    // Implementation would extract language skills
    // For now, return empty array
    return languages;
  }

  private calculateDuration(startDate: string, endDate: string, isCurrent: boolean): string {
    if (!startDate) return '';

    try {
      const start = new Date(startDate);
      const end = isCurrent ? new Date() : new Date(endDate || startDate);
      
      const diffTime = Math.abs(end.getTime() - start.getTime());
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      const diffMonths = Math.round(diffDays / 30);
      const diffYears = Math.floor(diffMonths / 12);
      const remainingMonths = diffMonths % 12;

      if (diffYears > 0) {
        return `${diffYears} year${diffYears > 1 ? 's' : ''}${remainingMonths > 0 ? ` ${remainingMonths} month${remainingMonths > 1 ? 's' : ''}` : ''}`;
      } else {
        return `${diffMonths} month${diffMonths > 1 ? 's' : ''}`;
      }
    } catch (error) {
      return '';
    }
  }

  calculateLinkedInScore(profile: LinkedInProfile): LinkedInScore {
    const breakdown = {
      profilePhoto: profile.personalInfo.firstName ? 100 : 0, // Assume photo exists if name exists
      headline: this.scoreHeadline(profile.personalInfo.headline),
      summary: this.scoreSummary(profile.personalInfo.summary),
      experience: this.scoreExperience(profile.experience),
      education: this.scoreEducation(profile.education),
      skills: this.scoreSkills(profile.skills),
      recommendations: 0, // Would need to parse recommendations
      connections: 50, // Assume average connections
      activityLevel: 50, // Would need activity data
    };

    const completeness = (
      (breakdown.profilePhoto > 0 ? 1 : 0) +
      (breakdown.headline > 50 ? 1 : 0) +
      (breakdown.summary > 50 ? 1 : 0) +
      (breakdown.experience > 50 ? 1 : 0) +
      (breakdown.education > 0 ? 1 : 0) +
      (breakdown.skills > 50 ? 1 : 0)
    ) / 6 * 100;

    const keywords = this.calculateKeywordScore(profile);
    const engagement = (breakdown.skills + breakdown.activityLevel) / 2;
    const professional = (breakdown.headline + breakdown.summary + breakdown.experience) / 3;

    const overall = (
      completeness * 0.30 +
      keywords * 0.25 +
      engagement * 0.20 +
      professional * 0.25
    );

    return {
      overall: Math.round(overall),
      completeness: Math.round(completeness),
      keywords: Math.round(keywords),
      engagement: Math.round(engagement),
      professional: Math.round(professional),
      breakdown,
    };
  }

  private scoreHeadline(headline: string): number {
    if (!headline) return 0;
    
    let score = 0;
    score += headline.length > 10 ? 30 : 0;
    score += headline.length < 120 ? 20 : 0; // LinkedIn headline limit
    score += /\b(senior|lead|manager|director|engineer|developer|analyst)\b/i.test(headline) ? 30 : 0;
    score += headline.includes(' at ') || headline.includes(' | ') ? 20 : 0;

    return Math.min(score, 100);
  }

  private scoreSummary(summary: string): number {
    if (!summary) return 0;
    
    let score = 0;
    score += summary.length > 100 ? 30 : 0;
    score += summary.length > 300 ? 20 : 0;
    score += summary.length < 2000 ? 20 : 0; // LinkedIn summary limit
    score += summary.split('.').length > 3 ? 15 : 0; // Multiple sentences
    score += /\b(experience|skilled|passionate|results|achieved)\b/i.test(summary) ? 15 : 0;

    return Math.min(score, 100);
  }

  private scoreExperience(experience: LinkedInExperience[]): number {
    if (experience.length === 0) return 0;
    
    let score = 0;
    score += Math.min(experience.length * 20, 60); // Max 60 for having experience
    
    const withDescriptions = experience.filter(exp => exp.description && exp.description.length > 50).length;
    score += (withDescriptions / experience.length) * 40; // 40 points for descriptions

    return Math.min(score, 100);
  }

  private scoreEducation(education: LinkedInEducation[]): number {
    if (education.length === 0) return 30; // Not required but helpful
    
    let score = 30; // Base score for having education
    score += Math.min(education.length * 35, 70); // Max 70 for multiple degrees

    return Math.min(score, 100);
  }

  private scoreSkills(skills: LinkedInSkill[]): number {
    if (skills.length === 0) return 0;
    
    let score = 0;
    score += Math.min(skills.length * 2, 40); // Max 40 for having skills
    
    const endorsedSkills = skills.filter(skill => skill.endorsements > 0).length;
    score += Math.min(endorsedSkills * 5, 30); // Max 30 for endorsed skills
    
    score += skills.length >= 20 ? 30 : 0; // Bonus for comprehensive skills

    return Math.min(score, 100);
  }

  private calculateKeywordScore(profile: LinkedInProfile): number {
    const professionalKeywords = [
      'experience', 'skilled', 'management', 'leadership', 'development',
      'strategy', 'analysis', 'implementation', 'optimization', 'innovation',
      'collaboration', 'communication', 'results', 'achievement', 'growth'
    ];

    const allText = (
      profile.personalInfo.headline + ' ' +
      profile.personalInfo.summary + ' ' +
      profile.experience.map(exp => exp.description || '').join(' ')
    ).toLowerCase();

    const foundKeywords = professionalKeywords.filter(keyword => 
      allText.includes(keyword)
    ).length;

    return Math.min((foundKeywords / professionalKeywords.length) * 100, 100);
  }

  async processLinkedInFile(userId: string, filePath: string, fileName: string, fileType: 'pdf' | 'html'): Promise<void> {
    try {
      // Parse the LinkedIn file
      const parsedProfile = await this.parseLinkedInFile(filePath, fileType);
      
      // Calculate score
      const score = this.calculateLinkedInScore(parsedProfile);

      // Update user profile in database
      await this.db.profiles.updateOne(
        { userId },
        {
          $set: {
            linkedin: {
              firstName: parsedProfile.personalInfo.firstName,
              lastName: parsedProfile.personalInfo.lastName,
              headline: parsedProfile.personalInfo.headline,
              summary: parsedProfile.personalInfo.summary,
              location: parsedProfile.personalInfo.location,
              industry: parsedProfile.personalInfo.industry,
              connectionCount: 0, // Would need to be extracted
              score,
              lastSyncedAt: new Date(),
            },
            updatedAt: new Date(),
          }
        },
        { upsert: true }
      );

      // Update document status
      await this.db.documents.updateOne(
        { userId, fileName, type: 'linkedin' },
        {
          $set: {
            status: 'completed',
            processedAt: new Date(),
            parsedContent: parsedProfile,
            analysis: { score },
          }
        }
      );

      console.log(`Successfully processed LinkedIn profile for user ${userId}`);
    } catch (error) {
      console.error('Error processing LinkedIn profile:', error);
      
      // Update document status to error
      await this.db.documents.updateOne(
        { userId, fileName, type: 'linkedin' },
        {
          $set: {
            status: 'error',
            error: error instanceof Error ? error.message : 'Unknown error',
          }
        }
      );
      
      throw error;
    }
  }
}

export default LinkedInService;