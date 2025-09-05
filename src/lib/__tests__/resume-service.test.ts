import { ResumeService } from '@/lib/resume-service';
import * as pdfParse from 'pdf-parse';
import * as mammoth from 'mammoth';

// Mock dependencies
jest.mock('pdf-parse');
jest.mock('mammoth');

const mockPdfParse = pdfParse as jest.MockedFunction<typeof pdfParse>;
const mockMammoth = mammoth as jest.Mocked<typeof mammoth>;

describe('ResumeService', () => {
  let resumeService: ResumeService;

  beforeEach(() => {
    jest.clearAllMocks();
    resumeService = new ResumeService();
  });

  describe('parseResume', () => {
    it('should parse PDF resume successfully', async () => {
      const mockBuffer = Buffer.from('test pdf content');
      const mockPdfText = `
        John Doe
        Software Engineer
        john.doe@email.com
        (555) 123-4567
        
        EXPERIENCE
        Senior Software Engineer - Tech Company (2020-2023)
        - Developed web applications using React and Node.js
        - Led a team of 5 developers
        - Increased performance by 50%
        
        EDUCATION
        Bachelor of Science in Computer Science
        University of Technology (2016-2020)
        
        SKILLS
        JavaScript, TypeScript, React, Node.js, Python, SQL
      `;

      mockPdfParse.mockResolvedValue({
        text: mockPdfText,
        numpages: 1,
        numrender: 1,
        info: {},
        metadata: {},
        version: '1.0',
      });

      const result = await resumeService.parseResume(mockBuffer, 'application/pdf');

      expect(mockPdfParse).toHaveBeenCalledWith(mockBuffer);
      expect(result).toEqual({
        rawText: mockPdfText,
        personalInfo: {
          name: 'John Doe',
          email: 'john.doe@email.com',
          phone: '(555) 123-4567',
          location: '',
        },
        sections: {
          experience: expect.arrayContaining([
            expect.objectContaining({
              company: 'Tech Company',
              position: 'Senior Software Engineer',
              duration: '2020-2023',
            }),
          ]),
          education: expect.arrayContaining([
            expect.objectContaining({
              institution: 'University of Technology',
              degree: 'Bachelor of Science in Computer Science',
              duration: '2016-2020',
            }),
          ]),
          skills: expect.arrayContaining(['JavaScript', 'TypeScript', 'React']),
        },
        wordCount: expect.any(Number),
        hasContactInfo: true,
        hasExperience: true,
        hasEducation: true,
        hasSkills: true,
      });
    });

    it('should parse DOCX resume successfully', async () => {
      const mockBuffer = Buffer.from('test docx content');
      const mockDocxText = `
        Jane Smith
        Product Manager
        jane.smith@email.com
        
        PROFESSIONAL EXPERIENCE
        Product Manager - StartupCo (2021-Present)
        - Managed product roadmap for mobile application
        - Coordinated with engineering and design teams
        
        EDUCATION
        MBA - Business School (2019-2021)
        
        SKILLS
        Product Management, Agile, Scrum, Analytics
      `;

      mockMammoth.extractRawText.mockResolvedValue({
        value: mockDocxText,
        messages: [],
      });

      const result = await resumeService.parseResume(
        mockBuffer,
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
      );

      expect(mockMammoth.extractRawText).toHaveBeenCalledWith({
        buffer: mockBuffer,
      });
      expect(result.personalInfo.name).toBe('Jane Smith');
      expect(result.personalInfo.email).toBe('jane.smith@email.com');
      expect(result.hasExperience).toBe(true);
      expect(result.hasEducation).toBe(true);
      expect(result.hasSkills).toBe(true);
    });

    it('should throw error for unsupported file type', async () => {
      const mockBuffer = Buffer.from('test content');

      await expect(
        resumeService.parseResume(mockBuffer, 'text/plain')
      ).rejects.toThrow('Unsupported file type: text/plain');
    });

    it('should handle PDF parsing errors', async () => {
      const mockBuffer = Buffer.from('invalid pdf');
      mockPdfParse.mockRejectedValue(new Error('Invalid PDF'));

      await expect(
        resumeService.parseResume(mockBuffer, 'application/pdf')
      ).rejects.toThrow('Failed to parse PDF: Invalid PDF');
    });

    it('should handle DOCX parsing errors', async () => {
      const mockBuffer = Buffer.from('invalid docx');
      mockMammoth.extractRawText.mockRejectedValue(new Error('Invalid DOCX'));

      await expect(
        resumeService.parseResume(
          mockBuffer,
          'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
        )
      ).rejects.toThrow('Failed to parse DOCX: Invalid DOCX');
    });
  });

  describe('calculateResumeScore', () => {
    it('should calculate resume score correctly for well-structured resume', () => {
      const mockParsedResume = {
        rawText: 'Mock resume text with sufficient content for analysis.',
        personalInfo: {
          name: 'John Doe',
          email: 'john.doe@email.com',
          phone: '(555) 123-4567',
          location: 'New York, NY',
        },
        sections: {
          experience: [
            {
              company: 'Tech Company',
              position: 'Senior Software Engineer',
              duration: '2020-2023',
              description: 'Developed applications and led team of 5 developers',
            },
          ],
          education: [
            {
              institution: 'University',
              degree: 'Bachelor of Science',
              duration: '2016-2020',
            },
          ],
          skills: ['JavaScript', 'React', 'Node.js', 'Python'],
        },
        wordCount: 150,
        hasContactInfo: true,
        hasExperience: true,
        hasEducation: true,
        hasSkills: true,
      };

      const result = resumeService.calculateResumeScore(mockParsedResume);

      expect(result.overall).toBeGreaterThan(0);
      expect(result.overall).toBeLessThanOrEqual(100);
      expect(result.ats).toBeGreaterThan(0);
      expect(result.keywords).toBeGreaterThan(0);
      expect(result.clarity).toBeGreaterThan(0);
      expect(result.quantification).toBeGreaterThan(0);
      expect(result.formatting).toBeGreaterThan(0);
      expect(result.consistency).toBeGreaterThan(0);
      expect(result.breakdown).toBeDefined();
    });

    it('should give lower scores for poorly structured resume', () => {
      const mockParsedResume = {
        rawText: 'Short text.',
        personalInfo: {
          name: '',
          email: '',
          phone: '',
          location: '',
        },
        sections: {
          experience: [],
          education: [],
          skills: [],
        },
        wordCount: 10,
        hasContactInfo: false,
        hasExperience: false,
        hasEducation: false,
        hasSkills: false,
      };

      const result = resumeService.calculateResumeScore(mockParsedResume);

      expect(result.overall).toBeLessThan(50);
      expect(result.ats).toBeLessThan(50);
      expect(result.keywords).toBeLessThan(50);
    });

    it('should identify quantified achievements', () => {
      const textWithNumbers = 'Increased sales by 50% and managed team of 10 people';
      const score = (resumeService as any).calculateQuantificationScore(textWithNumbers);
      expect(score).toBeGreaterThan(70);
    });

    it('should detect formatting consistency', () => {
      const sections = {
        experience: [
          {
            company: 'Company A',
            position: 'Position A',
            duration: '2020-2023',
            description: 'Description A',
          },
          {
            company: 'Company B',
            position: 'Position B',
            duration: '2018-2020',
            description: 'Description B',
          },
        ],
        education: [
          {
            institution: 'University A',
            degree: 'Degree A',
            duration: '2014-2018',
          },
        ],
        skills: ['Skill1', 'Skill2'],
      };

      const score = (resumeService as any).calculateFormattingScore(sections);
      expect(score).toBeGreaterThan(50);
    });
  });

  describe('extractPersonalInfo', () => {
    it('should extract personal information correctly', () => {
      const text = `
        John Doe
        Software Engineer
        john.doe@email.com
        (555) 123-4567
        New York, NY 10001
      `;

      const result = (resumeService as any).extractPersonalInfo(text);

      expect(result.name).toBe('John Doe');
      expect(result.email).toBe('john.doe@email.com');
      expect(result.phone).toBe('(555) 123-4567');
      expect(result.location).toContain('New York');
    });

    it('should handle missing information gracefully', () => {
      const text = 'Just some random text without contact information';

      const result = (resumeService as any).extractPersonalInfo(text);

      expect(result.name).toBe('');
      expect(result.email).toBe('');
      expect(result.phone).toBe('');
      expect(result.location).toBe('');
    });
  });

  describe('extractSections', () => {
    it('should extract experience section correctly', () => {
      const text = `
        EXPERIENCE
        Senior Software Engineer - Tech Company (2020-2023)
        - Developed web applications
        - Led development team
        
        Software Engineer - Previous Company (2018-2020)
        - Built backend services
      `;

      const result = (resumeService as any).extractSections(text);

      expect(result.experience).toHaveLength(2);
      expect(result.experience[0].position).toBe('Senior Software Engineer');
      expect(result.experience[0].company).toBe('Tech Company');
      expect(result.experience[0].duration).toBe('2020-2023');
    });

    it('should extract education section correctly', () => {
      const text = `
        EDUCATION
        Bachelor of Science in Computer Science
        University of Technology (2016-2020)
        
        Master of Science in Software Engineering
        Graduate University (2020-2022)
      `;

      const result = (resumeService as any).extractSections(text);

      expect(result.education).toHaveLength(2);
      expect(result.education[0].degree).toBe('Bachelor of Science in Computer Science');
      expect(result.education[0].institution).toBe('University of Technology');
      expect(result.education[0].duration).toBe('2016-2020');
    });

    it('should extract skills section correctly', () => {
      const text = `
        SKILLS
        JavaScript, TypeScript, React, Node.js, Python, SQL, AWS, Docker
        
        Technical Skills: Java, C++, MongoDB
        Soft Skills: Leadership, Communication
      `;

      const result = (resumeService as any).extractSections(text);

      expect(result.skills.length).toBeGreaterThan(5);
      expect(result.skills).toContain('JavaScript');
      expect(result.skills).toContain('Python');
      expect(result.skills).toContain('Leadership');
    });
  });

  describe('validateFileType', () => {
    it('should validate PDF files', () => {
      expect(resumeService.validateFileType('application/pdf')).toBe(true);
    });

    it('should validate DOCX files', () => {
      expect(
        resumeService.validateFileType(
          'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
        )
      ).toBe(true);
    });

    it('should reject invalid file types', () => {
      expect(resumeService.validateFileType('text/plain')).toBe(false);
      expect(resumeService.validateFileType('image/jpeg')).toBe(false);
      expect(resumeService.validateFileType('application/json')).toBe(false);
    });
  });
});