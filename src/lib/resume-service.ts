import pdfParse from 'pdf-parse';
import mammoth from 'mammoth';
import fs from 'fs';
import path from 'path';
import { getDbManager } from './database';

export interface ParsedResume {
  personalInfo: {
    name: string;
    email: string;
    phone: string;
    location: string;
    linkedInUrl?: string;
    githubUrl?: string;
    portfolioUrl?: string;
  };
  summary?: string;
  experience: ResumeExperience[];
  education: ResumeEducation[];
  skills: string[];
  certifications: ResumeCertification[];
  projects: ResumeProject[];
  languages: ResumeLanguage[];
  rawText: string;
}

export interface ResumeExperience {
  title: string;
  company: string;
  location?: string;
  startDate: string;
  endDate?: string;
  isCurrent: boolean;
  description: string[];
  achievements: string[];
}

export interface ResumeEducation {
  degree: string;
  institution: string;
  location?: string;
  graduationDate?: string;
  gpa?: string;
  relevantCoursework?: string[];
}

export interface ResumeCertification {
  name: string;
  issuer: string;
  issueDate?: string;
  expirationDate?: string;
  credentialId?: string;
}

export interface ResumeProject {
  name: string;
  description: string;
  technologies: string[];
  url?: string;
  githubUrl?: string;
  achievements: string[];
}

export interface ResumeLanguage {
  name: string;
  proficiency: 'Basic' | 'Intermediate' | 'Advanced' | 'Native';
}

export interface ResumeScore {
  overall: number;
  ats: number;
  keywords: number;
  clarity: number;
  quantification: number;
  formatting: number;
  consistency: number;
  breakdown: {
    contactInfo: number;
    summary: number;
    experience: number;
    education: number;
    skills: number;
    achievements: number;
    formatting: number;
    atsCompatibility: number;
    keywordDensity: number;
    quantificationScore: number;
  };
}

export class ResumeParsingService {
  private db = getDbManager();

  async parseResumeFile(filePath: string, fileType: 'pdf' | 'docx'): Promise<ParsedResume> {
    try {
      let rawText: string;

      if (fileType === 'pdf') {
        rawText = await this.parsePDF(filePath);
      } else if (fileType === 'docx') {
        rawText = await this.parseDOCX(filePath);
      } else {
        throw new Error('Unsupported file type');
      }

      return this.parseTextContent(rawText);
    } catch (error) {
      console.error('Error parsing resume file:', error);
      throw new Error('Failed to parse resume file');
    }
  }

  private async parsePDF(filePath: string): Promise<string> {
    const buffer = fs.readFileSync(filePath);
    const data = await pdfParse(buffer);
    return data.text;
  }

  private async parseDOCX(filePath: string): Promise<string> {
    const buffer = fs.readFileSync(filePath);
    const result = await mammoth.extractRawText({ buffer });
    return result.value;
  }

  private parseTextContent(text: string): ParsedResume {
    const lines = text.split('\n').filter(line => line.trim());
    const normalizedText = text.toLowerCase();

    return {
      personalInfo: this.extractPersonalInfo(text, lines),
      summary: this.extractSummary(text, lines),
      experience: this.extractExperience(text, lines),
      education: this.extractEducation(text, lines),
      skills: this.extractSkills(text, lines),
      certifications: this.extractCertifications(text, lines),
      projects: this.extractProjects(text, lines),
      languages: this.extractLanguages(text, lines),
      rawText: text,
    };
  }

  private extractPersonalInfo(text: string, lines: string[]): ParsedResume['personalInfo'] {
    const emailRegex = /([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/g;
    const phoneRegex = /(\+?[\d\s\-\(\)\.]{10,})/g;
    const linkedInRegex = /(linkedin\.com\/in\/[^\s]+)/gi;
    const githubRegex = /(github\.com\/[^\s]+)/gi;
    const portfolioRegex = /((?:https?:\/\/)?(?:www\.)?[a-zA-Z0-9-]+\.[a-zA-Z]{2,}(?:\/[^\s]*)?)/g;

    const email = text.match(emailRegex)?.[0] || '';
    const phone = text.match(phoneRegex)?.[0]?.replace(/[^\d+]/g, '') || '';
    const linkedInUrl = text.match(linkedInRegex)?.[0] || '';
    const githubUrl = text.match(githubRegex)?.[0] || '';

    // Extract name (usually in the first few lines)
    let name = '';
    for (let i = 0; i < Math.min(5, lines.length); i++) {
      const line = lines[i].trim();
      if (line && !line.includes('@') && !line.match(phoneRegex) && line.length < 50) {
        name = line;
        break;
      }
    }

    // Extract location (look for city, state patterns)
    const locationRegex = /([A-Za-z\s]+,\s*[A-Z]{2}|[A-Za-z\s]+,\s*[A-Za-z\s]+)/g;
    const location = text.match(locationRegex)?.[0] || '';

    return {
      name,
      email,
      phone,
      location,
      linkedInUrl,
      githubUrl,
      portfolioUrl: portfolioRegex.test(text) ? text.match(portfolioRegex)?.[0] : undefined,
    };
  }

  private extractSummary(text: string, lines: string[]): string | undefined {
    const summaryKeywords = ['summary', 'objective', 'profile', 'about'];
    const lowerText = text.toLowerCase();

    for (const keyword of summaryKeywords) {
      const index = lowerText.indexOf(keyword);
      if (index !== -1) {
        // Find the section after the keyword
        const afterKeyword = text.substring(index);
        const nextSectionIndex = afterKeyword.search(/\n\s*[A-Z][A-Z\s]*\n/);
        
        if (nextSectionIndex !== -1) {
          const summary = afterKeyword.substring(0, nextSectionIndex)
            .replace(new RegExp(keyword, 'gi'), '')
            .trim();
          
          if (summary.length > 20 && summary.length < 500) {
            return summary;
          }
        }
      }
    }

    return undefined;
  }

  private extractExperience(text: string, lines: string[]): ResumeExperience[] {
    const experiences: ResumeExperience[] = [];
    const experienceKeywords = ['experience', 'employment', 'work history', 'professional experience'];
    const lowerText = text.toLowerCase();

    // Find experience section
    let experienceStart = -1;
    for (const keyword of experienceKeywords) {
      const index = lowerText.indexOf(keyword);
      if (index !== -1) {
        experienceStart = index;
        break;
      }
    }

    if (experienceStart === -1) return experiences;

    // Extract experience entries
    const experienceText = text.substring(experienceStart);
    const dateRegex = /(\d{1,2}\/\d{4}|\d{4}|[A-Za-z]+\s+\d{4})/g;
    const entries = experienceText.split(/\n\s*\n/);

    for (const entry of entries) {
      if (entry.trim().length < 20) continue;

      const lines = entry.split('\n').filter(line => line.trim());
      if (lines.length < 2) continue;

      const dates = entry.match(dateRegex) || [];
      const titleLine = lines.find(line => 
        !line.toLowerCase().includes('experience') && 
        line.length < 100 &&
        !dates.some(date => line.includes(date))
      );

      if (!titleLine) continue;

      const [title, company] = titleLine.split(' at ').length === 2 
        ? titleLine.split(' at ')
        : titleLine.split(',').length === 2
        ? titleLine.split(',')
        : [titleLine, ''];

      const description = lines
        .filter(line => line !== titleLine && !dates.some(date => line.includes(date)))
        .filter(line => line.startsWith('•') || line.startsWith('-') || line.trim().length > 20);

      const achievements = description.filter(line => 
        line.includes('increased') || 
        line.includes('improved') || 
        line.includes('reduced') ||
        line.includes('%') ||
        line.includes('$')
      );

      experiences.push({
        title: title.trim(),
        company: company.trim(),
        startDate: dates[0] || '',
        endDate: dates[1] || '',
        isCurrent: entry.toLowerCase().includes('present') || entry.toLowerCase().includes('current'),
        description: description.map(d => d.trim()),
        achievements: achievements.map(a => a.trim()),
      });
    }

    return experiences;
  }

  private extractEducation(text: string, lines: string[]): ResumeEducation[] {
    const education: ResumeEducation[] = [];
    const educationKeywords = ['education', 'academic background', 'qualifications'];
    const degreeKeywords = ['bachelor', 'master', 'phd', 'doctorate', 'associate', 'certificate', 'diploma'];
    
    const lowerText = text.toLowerCase();

    // Find education section
    let educationStart = -1;
    for (const keyword of educationKeywords) {
      const index = lowerText.indexOf(keyword);
      if (index !== -1) {
        educationStart = index;
        break;
      }
    }

    if (educationStart === -1) return education;

    const educationText = text.substring(educationStart);
    const entries = educationText.split(/\n\s*\n/);

    for (const entry of entries) {
      const hasDegreKeyword = degreeKeywords.some(keyword => 
        entry.toLowerCase().includes(keyword)
      );

      if (!hasDegreKeyword) continue;

      const lines = entry.split('\n').filter(line => line.trim());
      const dateRegex = /(\d{4})/g;
      const dates = entry.match(dateRegex) || [];

      let degree = '';
      let institution = '';

      for (const line of lines) {
        if (degreeKeywords.some(keyword => line.toLowerCase().includes(keyword))) {
          degree = line.trim();
        } else if (!dates.some(date => line.includes(date)) && line.length > 10 && line.length < 100) {
          institution = line.trim();
        }
      }

      if (degree && institution) {
        education.push({
          degree,
          institution,
          graduationDate: dates[dates.length - 1] || '',
        });
      }
    }

    return education;
  }

  private extractSkills(text: string, lines: string[]): string[] {
    const skillsKeywords = ['skills', 'technical skills', 'technologies', 'competencies'];
    const lowerText = text.toLowerCase();

    let skillsStart = -1;
    for (const keyword of skillsKeywords) {
      const index = lowerText.indexOf(keyword);
      if (index !== -1) {
        skillsStart = index;
        break;
      }
    }

    if (skillsStart === -1) return [];

    const skillsText = text.substring(skillsStart);
    const nextSectionIndex = skillsText.search(/\n\s*[A-Z][A-Z\s]*\n/);
    const relevantText = nextSectionIndex !== -1 ? skillsText.substring(0, nextSectionIndex) : skillsText;

    // Extract skills separated by commas, bullets, or new lines
    const skills = relevantText
      .split(/[,•\-\n]/)
      .map(skill => skill.trim())
      .filter(skill => skill.length > 1 && skill.length < 50)
      .filter(skill => !skillsKeywords.some(keyword => skill.toLowerCase().includes(keyword)));

    return [...new Set(skills)]; // Remove duplicates
  }

  private extractCertifications(text: string, lines: string[]): ResumeCertification[] {
    const certifications: ResumeCertification[] = [];
    const certKeywords = ['certification', 'certificates', 'credentials', 'licenses'];
    
    // Implementation would extract certification details
    // For now, return empty array
    return certifications;
  }

  private extractProjects(text: string, lines: string[]): ResumeProject[] {
    const projects: ResumeProject[] = [];
    const projectKeywords = ['projects', 'portfolio', 'personal projects'];
    
    // Implementation would extract project details
    // For now, return empty array
    return projects;
  }

  private extractLanguages(text: string, lines: string[]): ResumeLanguage[] {
    const languages: ResumeLanguage[] = [];
    const languageKeywords = ['languages', 'language skills'];
    
    // Implementation would extract language skills
    // For now, return empty array
    return languages;
  }

  calculateResumeScore(parsedResume: ParsedResume): ResumeScore {
    const breakdown = {
      contactInfo: this.scoreContactInfo(parsedResume.personalInfo),
      summary: this.scoreSummary(parsedResume.summary),
      experience: this.scoreExperience(parsedResume.experience),
      education: this.scoreEducation(parsedResume.education),
      skills: this.scoreSkills(parsedResume.skills),
      achievements: this.scoreAchievements(parsedResume.experience),
      formatting: this.scoreFormatting(parsedResume.rawText),
      atsCompatibility: this.scoreATSCompatibility(parsedResume),
      keywordDensity: this.scoreKeywordDensity(parsedResume.rawText),
      quantificationScore: this.scoreQuantification(parsedResume.rawText),
    };

    const ats = (breakdown.atsCompatibility + breakdown.formatting) / 2;
    const keywords = breakdown.keywordDensity;
    const clarity = (breakdown.summary + breakdown.formatting) / 2;
    const quantification = breakdown.quantificationScore;
    const formatting = breakdown.formatting;
    const consistency = this.scoreConsistency(parsedResume);

    const overall = (
      ats * 0.20 +
      keywords * 0.25 +
      clarity * 0.15 +
      quantification * 0.20 +
      formatting * 0.10 +
      consistency * 0.10
    );

    return {
      overall: Math.round(overall),
      ats: Math.round(ats),
      keywords: Math.round(keywords),
      clarity: Math.round(clarity),
      quantification: Math.round(quantification),
      formatting: Math.round(formatting),
      consistency: Math.round(consistency),
      breakdown,
    };
  }

  private scoreContactInfo(personalInfo: ParsedResume['personalInfo']): number {
    let score = 0;
    
    score += personalInfo.name ? 25 : 0;
    score += personalInfo.email ? 25 : 0;
    score += personalInfo.phone ? 20 : 0;
    score += personalInfo.location ? 15 : 0;
    score += personalInfo.linkedInUrl ? 10 : 0;
    score += personalInfo.githubUrl ? 5 : 0;

    return Math.min(score, 100);
  }

  private scoreSummary(summary?: string): number {
    if (!summary) return 0;
    
    let score = 0;
    score += summary.length > 50 ? 30 : 0;
    score += summary.length < 300 ? 20 : 0;
    score += /[A-Z]/.test(summary.charAt(0)) ? 10 : 0; // Starts with capital
    score += summary.split(' ').length >= 20 ? 20 : 0; // Good length
    score += summary.includes('experience') || summary.includes('skilled') ? 20 : 0;

    return Math.min(score, 100);
  }

  private scoreExperience(experience: ResumeExperience[]): number {
    if (experience.length === 0) return 0;

    let score = 0;
    score += Math.min(experience.length * 20, 60); // Max 60 for having experience
    
    const hasDescriptions = experience.filter(exp => exp.description.length > 0).length;
    score += (hasDescriptions / experience.length) * 40; // 40 points for descriptions

    return Math.min(score, 100);
  }

  private scoreEducation(education: ResumeEducation[]): number {
    if (education.length === 0) return 50; // Not required but helpful

    let score = 0;
    score += Math.min(education.length * 30, 70);
    score += education.filter(edu => edu.degree && edu.institution).length * 30;

    return Math.min(score, 100);
  }

  private scoreSkills(skills: string[]): number {
    if (skills.length === 0) return 0;

    let score = 0;
    score += Math.min(skills.length * 5, 60); // Max 60 for having skills
    score += skills.length >= 10 ? 40 : 0; // Bonus for comprehensive skills

    return Math.min(score, 100);
  }

  private scoreAchievements(experience: ResumeExperience[]): number {
    const totalAchievements = experience.reduce((sum, exp) => sum + exp.achievements.length, 0);
    
    if (totalAchievements === 0) return 0;

    let score = 0;
    score += Math.min(totalAchievements * 15, 60);
    score += totalAchievements >= 5 ? 40 : 0;

    return Math.min(score, 100);
  }

  private scoreFormatting(rawText: string): number {
    let score = 100; // Start with perfect score and deduct

    // Check for formatting issues
    const lines = rawText.split('\n');
    const emptyLines = lines.filter(line => line.trim() === '').length;
    const totalLines = lines.length;

    // Penalize excessive empty lines
    if (emptyLines / totalLines > 0.3) score -= 20;

    // Check for consistent spacing
    const inconsistentSpacing = rawText.match(/\s{3,}/g);
    if (inconsistentSpacing && inconsistentSpacing.length > 5) score -= 15;

    // Check for proper capitalization
    const sentences = rawText.split(/[.!?]/);
    const improperCapitalization = sentences.filter(sentence => {
      const trimmed = sentence.trim();
      return trimmed.length > 0 && /^[a-z]/.test(trimmed);
    }).length;

    if (improperCapitalization > sentences.length * 0.2) score -= 10;

    return Math.max(score, 0);
  }

  private scoreATSCompatibility(parsedResume: ParsedResume): number {
    let score = 0;

    // Standard sections present
    score += parsedResume.personalInfo.name ? 15 : 0;
    score += parsedResume.personalInfo.email ? 15 : 0;
    score += parsedResume.experience.length > 0 ? 20 : 0;
    score += parsedResume.skills.length > 0 ? 20 : 0;
    score += parsedResume.education.length > 0 ? 10 : 0;

    // Avoid ATS-unfriendly elements (would need original document)
    score += 20; // Assume good formatting for parsed content

    return Math.min(score, 100);
  }

  private scoreKeywordDensity(rawText: string): number {
    const commonKeywords = [
      'experience', 'skilled', 'responsible', 'managed', 'developed',
      'implemented', 'achieved', 'improved', 'increased', 'reduced',
      'leadership', 'collaboration', 'communication', 'problem-solving'
    ];

    const lowerText = rawText.toLowerCase();
    const keywordCount = commonKeywords.filter(keyword => 
      lowerText.includes(keyword)
    ).length;

    return Math.min((keywordCount / commonKeywords.length) * 100, 100);
  }

  private scoreQuantification(rawText: string): number {
    const quantificationPatterns = [
      /\d+%/, // Percentages
      /\$[\d,]+/, // Dollar amounts
      /\d+\s*(years?|months?|weeks?)/, // Time periods
      /\d+\s*(people|employees|team members?)/, // Team sizes
      /\d+\s*(projects?|initiatives?)/, // Project counts
    ];

    let quantificationCount = 0;
    quantificationPatterns.forEach(pattern => {
      const matches = rawText.match(pattern);
      if (matches) quantificationCount += matches.length;
    });

    return Math.min(quantificationCount * 20, 100);
  }

  private scoreConsistency(parsedResume: ParsedResume): number {
    let score = 100;

    // Check date format consistency
    const allDates = parsedResume.experience
      .flatMap(exp => [exp.startDate, exp.endDate])
      .filter(date => date);

    if (allDates.length > 1) {
      const dateFormats = new Set(allDates.map(date => {
        if (/\d{4}/.test(date)) return 'year';
        if (/\d{1,2}\/\d{4}/.test(date)) return 'month/year';
        return 'other';
      }));

      if (dateFormats.size > 1) score -= 20;
    }

    // Check bullet point consistency
    const descriptions = parsedResume.experience.flatMap(exp => exp.description);
    const bulletStyles = new Set(descriptions.map(desc => {
      if (desc.startsWith('•')) return 'bullet';
      if (desc.startsWith('-')) return 'dash';
      if (desc.startsWith('*')) return 'asterisk';
      return 'none';
    }));

    if (bulletStyles.size > 2) score -= 15;

    return Math.max(score, 0);
  }

  async processResumeFile(userId: string, filePath: string, fileName: string, fileType: 'pdf' | 'docx'): Promise<void> {
    try {
      // Parse the resume
      const parsedResume = await this.parseResumeFile(filePath, fileType);
      
      // Calculate score
      const score = this.calculateResumeScore(parsedResume);

      // Update user profile in database
      await this.db.profiles.updateOne(
        { userId },
        {
          $set: {
            resume: {
              fileName,
              fileType,
              uploadedAt: new Date(),
              score,
              parsedContent: parsedResume,
            },
            updatedAt: new Date(),
          }
        },
        { upsert: true }
      );

      // Update document status
      await this.db.documents.updateOne(
        { userId, fileName, type: 'resume' },
        {
          $set: {
            status: 'completed',
            processedAt: new Date(),
            parsedContent: parsedResume,
            analysis: { score },
          }
        }
      );

      console.log(`Successfully processed resume for user ${userId}`);
    } catch (error) {
      console.error('Error processing resume:', error);
      
      // Update document status to error
      await this.db.documents.updateOne(
        { userId, fileName, type: 'resume' },
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

export default ResumeParsingService;