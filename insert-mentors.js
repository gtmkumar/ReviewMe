const { MongoClient, ObjectId } = require('mongodb');
require('dotenv').config();

// MongoDB connection URI - update this with your actual MongoDB connection string
// For local MongoDB with Docker: 'mongodb://admin:password@localhost:27017/reviewme?authSource=admin'
// For MongoDB Atlas: 'mongodb+srv://username:password@cluster.mongodb.net/reviewme?retryWrites=true&w=majority'


const MONGODB_URI = 'mongodb+srv://thedevankit:dbUserAnkit@cluster0.jb5pxci.mongodb.net/reviewme?retryWrites=true&w=majority&appName=Cluster0&ssl=true';

async function insertDummyMentors() {
  const client = new MongoClient(MONGODB_URI);
  
  try {
    console.log('Connecting to MongoDB...');
    await client.connect();
    console.log('Connected successfully to MongoDB');
    
    const db = client.db();
    const mentorsCollection = db.collection('mentors');
    const usersCollection = db.collection('users');
    
    // Check if dummy mentors already exist
    const existingMentors = await mentorsCollection.countDocuments({
      email: { $in: [
        'sarah.johnson@techcorp.com',
        'michael.chen@startup.io',
        'priya.patel@designstudio.com',
        'james.wilson@fintech.com',
        'emily.davis@consultancy.com'
      ]}
    });

    if (existingMentors > 0) {
      console.log(`Found ${existingMentors} existing dummy mentors. Skipping insertion.`);
      return;
    }

    const now = new Date();

    // Create 5 dummy mentors with different skills and expertise
    const dummyMentors = [
      {
        _id: new ObjectId(),
        userId: new ObjectId().toString(),
        name: 'Sarah Johnson',
        email: 'sarah.johnson@techcorp.com',
        avatar: 'https://images.unsplash.com/photo-1494790108755-2616b1e7e48?auto=format&fit=crop&w=150&h=150&q=80',
        bio: 'Senior Software Engineer with 8+ years of experience in full-stack development. Specialized in React, Node.js, and system design. Passionate about mentoring developers to build scalable applications.',
        role: 'Senior Software Engineer',
        company: 'TechCorp',
        yearsOfExperience: 8,
        expertise: [
          {
            area: 'github',
            level: 'expert',
            tags: ['React', 'Node.js', 'TypeScript', 'System Design', 'Code Review']
          },
          {
            area: 'technical',
            level: 'expert', 
            tags: ['Full Stack', 'Architecture', 'Performance', 'Testing']
          },
          {
            area: 'career',
            level: 'intermediate',
            tags: ['Tech Leadership', 'Career Growth', 'Skill Development']
          }
        ],
        sessionTypes: [
          {
            type: 'github_review',
            name: 'GitHub Profile & Code Review',
            description: 'Comprehensive review of your GitHub profile, repositories, and code quality',
            duration: 60,
            price: 150,
            isActive: true
          },
          {
            type: 'project_review',
            name: 'Technical Project Review',
            description: 'In-depth review of your technical projects with improvement suggestions',
            duration: 90,
            price: 200,
            isActive: true
          },
          {
            type: 'career_discussion',
            name: 'Tech Career Guidance',
            description: 'Career guidance for software developers and tech professionals',
            duration: 60,
            price: 120,
            isActive: true
          }
        ],
        status: 'approved',
        isActive: true,
        rating: {
          average: 4.8,
          count: 42
        },
        totalSessions: 42,
        joinedAt: new Date(Date.now() - 6 * 30 * 24 * 60 * 60 * 1000), // 6 months ago
        lastActiveAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000), // 2 days ago
        availability: {
          timezone: 'America/New_York',
          weeklySlots: [
            {
              day: 'monday',
              slots: [
                { startTime: '09:00', endTime: '10:00', isAvailable: true },
                { startTime: '14:00', endTime: '15:00', isAvailable: true },
                { startTime: '16:00', endTime: '17:00', isAvailable: true }
              ]
            },
            {
              day: 'wednesday',
              slots: [
                { startTime: '10:00', endTime: '11:00', isAvailable: true },
                { startTime: '15:00', endTime: '16:00', isAvailable: true }
              ]
            },
            {
              day: 'friday',
              slots: [
                { startTime: '09:00', endTime: '10:00', isAvailable: true },
                { startTime: '13:00', endTime: '14:00', isAvailable: true }
              ]
            }
          ]
        },
        socialLinks: {
          linkedin: 'https://linkedin.com/in/sarahjohnson-dev',
          github: 'https://github.com/sarahjohnsondev',
          portfolio: 'https://sarahjohnson.dev'
        },
        preferences: {
          communicationStyle: 'technical',
          sessionPreferences: ['screen sharing', 'code review', 'pair programming']
        },
        createdAt: now,
        updatedAt: now
      },
      {
        _id: new ObjectId(),
        userId: new ObjectId().toString(),
        name: 'Michael Chen',
        email: 'michael.chen@startup.io',
        avatar: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?auto=format&fit=crop&w=150&h=150&q=80',
        bio: 'Product Manager turned entrepreneur with deep experience in career transitions. Helped 100+ professionals navigate their career paths and build compelling resumes that land interviews.',
        role: 'Product Manager & Career Coach',
        company: 'CareerGrowth Startup',
        yearsOfExperience: 6,
        expertise: [
          {
            area: 'resume',
            level: 'expert',
            tags: ['ATS Optimization', 'Career Transitions', 'Tech Resumes', 'Quantified Results']
          },
          {
            area: 'career',
            level: 'expert',
            tags: ['Product Management', 'Career Pivoting', 'Startup Experience', 'Leadership']
          },
          {
            area: 'interview',
            level: 'intermediate',
            tags: ['Product Interviews', 'Behavioral Questions', 'Case Studies']
          }
        ],
        sessionTypes: [
          {
            type: 'resume_review',
            name: 'Resume Optimization & ATS',
            description: 'Comprehensive resume review with ATS optimization and keyword enhancement',
            duration: 75,
            price: 180,
            isActive: true
          },
          {
            type: 'career_discussion',
            name: 'Career Strategy Session',
            description: 'Strategic career planning and transition guidance',
            duration: 60,
            price: 160,
            isActive: true
          },
          {
            type: 'interview_prep',
            name: 'Interview Preparation',
            description: 'Mock interviews and behavioral question practice',
            duration: 90,
            price: 220,
            isActive: true
          }
        ],
        status: 'approved',
        isActive: true,
        rating: {
          average: 4.9,
          count: 58
        },
        totalSessions: 58,
        joinedAt: new Date(Date.now() - 8 * 30 * 24 * 60 * 60 * 1000), // 8 months ago
        lastActiveAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000), // 1 day ago
        availability: {
          timezone: 'America/Los_Angeles',
          weeklySlots: [
            {
              day: 'tuesday',
              slots: [
                { startTime: '08:00', endTime: '09:00', isAvailable: true },
                { startTime: '11:00', endTime: '12:00', isAvailable: true },
                { startTime: '17:00', endTime: '18:00', isAvailable: true }
              ]
            },
            {
              day: 'thursday',
              slots: [
                { startTime: '09:00', endTime: '10:00', isAvailable: true },
                { startTime: '14:00', endTime: '15:00', isAvailable: true },
                { startTime: '16:00', endTime: '17:00', isAvailable: true }
              ]
            },
            {
              day: 'saturday',
              slots: [
                { startTime: '10:00', endTime: '11:00', isAvailable: true },
                { startTime: '15:00', endTime: '16:00', isAvailable: true }
              ]
            }
          ]
        },
        socialLinks: {
          linkedin: 'https://linkedin.com/in/michaelchen-pm',
          portfolio: 'https://michaelchen.io'
        },
        preferences: {
          communicationStyle: 'formal',
          sessionPreferences: ['goal setting', 'action plans', 'follow-up sessions']
        },
        createdAt: now,
        updatedAt: now
      },
      {
        _id: new ObjectId(),
        userId: new ObjectId().toString(),
        name: 'Priya Patel',
        email: 'priya.patel@designstudio.com',
        avatar: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?auto=format&fit=crop&w=150&h=150&q=80',
        bio: 'UX Designer and LinkedIn strategist with expertise in personal branding. Specialized in helping professionals optimize their LinkedIn profiles for maximum visibility and networking success.',
        role: 'Senior UX Designer',
        company: 'Creative Design Studio',
        yearsOfExperience: 7,
        expertise: [
          {
            area: 'linkedin',
            level: 'expert',
            tags: ['Personal Branding', 'Profile Optimization', 'Content Strategy', 'Networking']
          },
          {
            area: 'career',
            level: 'intermediate',
            tags: ['Design Career', 'Creative Industries', 'Portfolio Building']
          },
          {
            area: 'resume',
            level: 'intermediate',
            tags: ['Design Resumes', 'Creative Portfolios', 'Visual Design']
          }
        ],
        sessionTypes: [
          {
            type: 'linkedin_review',
            name: 'LinkedIn Profile Optimization',
            description: 'Complete LinkedIn profile makeover with personal branding strategy',
            duration: 60,
            price: 140,
            isActive: true
          },
          {
            type: 'career_discussion',
            name: 'Design Career Mentoring',
            description: 'Career guidance for designers and creative professionals',
            duration: 60,
            price: 130,
            isActive: true
          },
          {
            type: 'resume_review',
            name: 'Creative Resume & Portfolio',
            description: 'Review and enhancement of design resumes and portfolios',
            duration: 75,
            price: 170,
            isActive: true
          }
        ],
        status: 'approved',
        isActive: true,
        rating: {
          average: 4.7,
          count: 35
        },
        totalSessions: 35,
        joinedAt: new Date(Date.now() - 4 * 30 * 24 * 60 * 60 * 1000), // 4 months ago
        lastActiveAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000), // 3 days ago
        availability: {
          timezone: 'America/Chicago',
          weeklySlots: [
            {
              day: 'monday',
              slots: [
                { startTime: '10:00', endTime: '11:00', isAvailable: true },
                { startTime: '15:00', endTime: '16:00', isAvailable: true }
              ]
            },
            {
              day: 'wednesday',
              slots: [
                { startTime: '09:00', endTime: '10:00', isAvailable: true },
                { startTime: '13:00', endTime: '14:00', isAvailable: true },
                { startTime: '17:00', endTime: '18:00', isAvailable: true }
              ]
            },
            {
              day: 'friday',
              slots: [
                { startTime: '11:00', endTime: '12:00', isAvailable: true },
                { startTime: '16:00', endTime: '17:00', isAvailable: true }
              ]
            }
          ]
        },
        socialLinks: {
          linkedin: 'https://linkedin.com/in/priyapatel-ux',
          portfolio: 'https://priyapatel.design'
        },
        preferences: {
          communicationStyle: 'casual',
          sessionPreferences: ['visual presentations', 'design critique', 'branding discussions']
        },
        createdAt: now,
        updatedAt: now
      },
      {
        _id: new ObjectId(),
        userId: new ObjectId().toString(),
        name: 'James Wilson',
        email: 'james.wilson@fintech.com',
        avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=150&h=150&q=80',
        bio: 'Tech Lead at a leading fintech company with extensive experience in system architecture and team leadership. Specializes in interview preparation and technical mentoring for senior roles.',
        role: 'Technical Lead',
        company: 'FinTech Solutions',
        yearsOfExperience: 10,
        expertise: [
          {
            area: 'interview',
            level: 'expert',
            tags: ['System Design', 'Technical Leadership', 'Behavioral Interviews', 'Coding Interviews']
          },
          {
            area: 'technical',
            level: 'expert',
            tags: ['Architecture', 'Microservices', 'Team Leadership', 'Scalability']
          },
          {
            area: 'career',
            level: 'expert',
            tags: ['Senior Roles', 'Tech Leadership', 'Team Management', 'Promotion Strategy']
          }
        ],
        sessionTypes: [
          {
            type: 'interview_prep',
            name: 'Technical Interview Mastery',
            description: 'Comprehensive technical interview preparation including system design and coding',
            duration: 120,
            price: 299,
            isActive: true
          },
          {
            type: 'career_discussion',
            name: 'Tech Leadership Coaching',
            description: 'Leadership and career advancement for senior technical roles',
            duration: 90,
            price: 250,
            isActive: true
          },
          {
            type: 'project_review',
            name: 'Architecture & System Review',
            description: 'Review of system architecture and technical project decisions',
            duration: 90,
            price: 270,
            isActive: true
          }
        ],
        status: 'approved',
        isActive: true,
        rating: {
          average: 4.9,
          count: 73
        },
        totalSessions: 73,
        joinedAt: new Date(Date.now() - 12 * 30 * 24 * 60 * 60 * 1000), // 12 months ago
        lastActiveAt: new Date(Date.now() - 6 * 60 * 60 * 1000), // 6 hours ago
        availability: {
          timezone: 'America/New_York',
          weeklySlots: [
            {
              day: 'tuesday',
              slots: [
                { startTime: '18:00', endTime: '19:00', isAvailable: true },
                { startTime: '19:00', endTime: '20:00', isAvailable: true }
              ]
            },
            {
              day: 'wednesday',
              slots: [
                { startTime: '17:00', endTime: '18:00', isAvailable: true },
                { startTime: '20:00', endTime: '21:00', isAvailable: true }
              ]
            },
            {
              day: 'saturday',
              slots: [
                { startTime: '09:00', endTime: '10:00', isAvailable: true },
                { startTime: '10:00', endTime: '11:00', isAvailable: true },
                { startTime: '14:00', endTime: '15:00', isAvailable: true }
              ]
            },
            {
              day: 'sunday',
              slots: [
                { startTime: '10:00', endTime: '11:00', isAvailable: true },
                { startTime: '15:00', endTime: '16:00', isAvailable: true }
              ]
            }
          ]
        },
        socialLinks: {
          linkedin: 'https://linkedin.com/in/jameswilson-tech',
          github: 'https://github.com/jameswilsontech'
        },
        preferences: {
          communicationStyle: 'technical',
          sessionPreferences: ['whiteboarding', 'system design', 'code review', 'mock interviews']
        },
        createdAt: now,
        updatedAt: now
      },
      {
        _id: new ObjectId(),
        userId: new ObjectId().toString(),
        name: 'Emily Davis',
        email: 'emily.davis@consultancy.com',
        avatar: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&w=150&h=150&q=80',
        bio: 'Management consultant and career strategist with a track record of helping professionals across industries. Expert in resume writing, LinkedIn optimization, and career pivoting strategies.',
        role: 'Senior Consultant',
        company: 'Strategy Consultancy',
        yearsOfExperience: 9,
        expertise: [
          {
            area: 'resume',
            level: 'expert',
            tags: ['Executive Resumes', 'Career Transitions', 'Consulting', 'Strategy']
          },
          {
            area: 'linkedin',
            level: 'expert',
            tags: ['Executive Profiles', 'Thought Leadership', 'Professional Networking']
          },
          {
            area: 'career',
            level: 'expert',
            tags: ['Career Strategy', 'Industry Transitions', 'Executive Coaching', 'Leadership Development']
          },
          {
            area: 'interview',
            level: 'intermediate',
            tags: ['Case Interviews', 'Executive Interviews', 'Consulting Interviews']
          }
        ],
        sessionTypes: [
          {
            type: 'resume_review',
            name: 'Executive Resume Strategy',
            description: 'High-level resume strategy for senior professionals and executives',
            duration: 90,
            price: 280,
            isActive: true
          },
          {
            type: 'linkedin_review',
            name: 'Executive LinkedIn Presence',
            description: 'LinkedIn optimization for senior professionals and thought leadership',
            duration: 75,
            price: 200,
            isActive: true
          },
          {
            type: 'career_discussion',
            name: 'Strategic Career Planning',
            description: 'Comprehensive career strategy for mid to senior level professionals',
            duration: 90,
            price: 240,
            isActive: true
          },
          {
            type: 'interview_prep',
            name: 'Executive Interview Prep',
            description: 'Interview preparation for senior roles and consulting positions',
            duration: 90,
            price: 260,
            isActive: true
          }
        ],
        status: 'approved',
        isActive: true,
        rating: {
          average: 4.8,
          count: 67
        },
        totalSessions: 67,
        joinedAt: new Date(Date.now() - 10 * 30 * 24 * 60 * 60 * 1000), // 10 months ago
        lastActiveAt: new Date(Date.now() - 12 * 60 * 60 * 1000), // 12 hours ago
        availability: {
          timezone: 'Europe/London',
          weeklySlots: [
            {
              day: 'monday',
              slots: [
                { startTime: '08:00', endTime: '09:00', isAvailable: true },
                { startTime: '17:00', endTime: '18:00', isAvailable: true }
              ]
            },
            {
              day: 'tuesday',
              slots: [
                { startTime: '07:00', endTime: '08:00', isAvailable: true },
                { startTime: '18:00', endTime: '19:00', isAvailable: true }
              ]
            },
            {
              day: 'thursday',
              slots: [
                { startTime: '08:00', endTime: '09:00', isAvailable: true },
                { startTime: '12:00', endTime: '13:00', isAvailable: true },
                { startTime: '17:00', endTime: '18:00', isAvailable: true }
              ]
            },
            {
              day: 'friday',
              slots: [
                { startTime: '09:00', endTime: '10:00', isAvailable: true },
                { startTime: '16:00', endTime: '17:00', isAvailable: true }
              ]
            }
          ]
        },
        socialLinks: {
          linkedin: 'https://linkedin.com/in/emilydavis-strategy',
          portfolio: 'https://emilydavis.consulting'
        },
        preferences: {
          communicationStyle: 'formal',
          sessionPreferences: ['strategic planning', 'goal setting', 'action planning', 'follow-up tracking']
        },
        createdAt: now,
        updatedAt: now
      }
    ];

    // Insert dummy mentors
    console.log('Inserting dummy mentors...');
    const result = await mentorsCollection.insertMany(dummyMentors);
    console.log(`Successfully inserted ${result.insertedCount} mentors`);

    // Create corresponding user records for each mentor
    const mentorUsers = dummyMentors.map((mentor, index) => ({
      _id: new ObjectId(),
      name: mentor.name,
      email: mentor.email,
      avatar: mentor.avatar,
      emailVerified: now,
      credits: 1000, // Give mentors plenty of credits
      totalReferrals: 0,
      profilePublic: true,
      requestCounts: {
        github: 0,
        linkedin: 0,
        resume: 0
      },
      onboardingCompleted: true,
      isFirstTimeLogin: false,
      firstLoginAt: mentor.joinedAt,
      lastLoginAt: mentor.lastActiveAt,
      createdAt: mentor.joinedAt,
      updatedAt: now
    }));

    console.log('Inserting corresponding user records...');
    const userResult = await usersCollection.insertMany(mentorUsers);
    console.log(`Successfully inserted ${userResult.insertedCount} user records`);

    console.log('\n=== SUMMARY ===');
    console.log(`Total mentors inserted: ${result.insertedCount}`);
    console.log(`Total user records inserted: ${userResult.insertedCount}`);
    
    console.log('\n=== MENTOR LIST ===');
    dummyMentors.forEach((mentor, index) => {
      console.log(`${index + 1}. ${mentor.name} (${mentor.email})`);
      console.log(`   Role: ${mentor.role} at ${mentor.company}`);
      console.log(`   Expertise: ${mentor.expertise.map(e => e.area).join(', ')}`);
      console.log(`   Session Types: ${mentor.sessionTypes.map(st => st.type).join(', ')}`);
      console.log(`   Rating: ${mentor.rating.average} (${mentor.rating.count} reviews)`);
      console.log(`   Status: ${mentor.status}, Active: ${mentor.isActive}`);
      console.log('');
    });

  } catch (error) {
    console.error('Error inserting dummy mentors:', error);
  } finally {
    await client.close();
    console.log('Database connection closed');
  }
}

// Run the insertion
insertDummyMentors().catch(console.error);