import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import { body, validationResult } from 'express-validator';
import { Db } from 'mongodb';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { getDbManager } from '../src/lib/database';

const app = express();
const PORT = process.env.PORT || 5000;

// MongoDB connection using centralized database manager
let db: Db;
const connectToMongoDB = async () => {
  try {
    const dbManager = getDbManager(process.env.MONGODB_URI || 'mongodb://localhost:27017/reviewme');
    await dbManager.connect();
    db = await dbManager.getDb();
    console.log('Server connected to MongoDB via centralized connection');
  } catch (error) {
    console.error('MongoDB connection error:', error);
    process.exit(1);
  }
};

// Security middleware
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'", 'https://fonts.googleapis.com'],
      fontSrc: ["'self'", 'https://fonts.gstatic.com'],
      imgSrc: ["'self'", 'data:', 'https:'],
      scriptSrc: ["'self'"],
      connectSrc: ["'self'", 'https://api.github.com'],
    },
  },
}));

// CORS configuration
app.use(cors({
  origin: process.env.NODE_ENV === 'production' 
    ? ['https://reviewme.app', 'https://www.reviewme.app']
    : ['http://localhost:3000', 'http://localhost:3001'],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));

// Rate limiting
const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per windowMs
  message: 'Too many requests from this IP, please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
});

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // Limit each IP to 5 auth requests per windowMs
  message: 'Too many authentication attempts, please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
});

const uploadLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 10, // Limit each IP to 10 uploads per hour
  message: 'Too many uploads, please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
});

app.use('/api/auth', authLimiter);
app.use('/api/upload', uploadLimiter);
app.use('/api', generalLimiter);

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// File upload configuration
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = path.join(process.cwd(), 'uploads');
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const fileFilter = (req: any, file: any, cb: any) => {
  const allowedTypes = /pdf|doc|docx/;
  const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
  const mimetype = allowedTypes.test(file.mimetype);

  if (mimetype && extname) {
    return cb(null, true);
  } else {
    cb(new Error('Only PDF, DOC, and DOCX files are allowed'));
  }
};

const upload = multer({
  storage: storage,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
  },
  fileFilter: fileFilter
});

// Authentication middleware
const authenticateToken = (req: any, res: any, next: any) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'Access token required' });
  }

  jwt.verify(token, process.env.JWT_SECRET || 'fallback-secret', (err: any, user: any) => {
    if (err) {
      return res.status(403).json({ error: 'Invalid or expired token' });
    }
    req.user = user;
    next();
  });
};

// Validation middleware
const handleValidationErrors = (req: any, res: any, next: any) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      error: 'Validation failed',
      details: errors.array()
    });
  }
  next();
};

// Routes

// Health check
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});

// User profile routes
app.get('/api/profile', authenticateToken, async (req: any, res: any) => {
  try {
    const profile = await db.collection('profiles').findOne({ userId: req.user.id });
    const preferences = await db.collection('preferences').findOne({ userId: req.user.id });
    
    res.json({
      success: true,
      data: {
        profile,
        preferences
      }
    });
  } catch (error) {
    console.error('Profile fetch error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.put('/api/profile', 
  authenticateToken,
  [
    body('name').optional().isLength({ min: 2, max: 50 }),
    body('bio').optional().isLength({ max: 500 }),
    body('location').optional().isLength({ max: 100 }),
    body('website').optional().isURL(),
  ],
  handleValidationErrors,
  async (req: any, res: any) => {
    try {
      const updates = {
        ...req.body,
        updatedAt: new Date()
      };

      await db.collection('users').updateOne(
        { _id: req.user.id },
        { $set: updates }
      );

      res.json({
        success: true,
        message: 'Profile updated successfully'
      });
    } catch (error) {
      console.error('Profile update error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }
);

// File upload routes
app.post('/api/upload/resume', 
  authenticateToken,
  upload.single('resume'),
  async (req: any, res: any) => {
    try {
      if (!req.file) {
        return res.status(400).json({ error: 'No file uploaded' });
      }

      // Store file metadata in database
      const fileData = {
        userId: req.user.id,
        fileName: req.file.originalname,
        filePath: req.file.path,
        fileSize: req.file.size,
        mimeType: req.file.mimetype,
        uploadedAt: new Date(),
        type: 'resume',
        status: 'pending'
      };

      const result = await db.collection('documents').insertOne(fileData);

      res.json({
        success: true,
        data: {
          id: result.insertedId,
          fileName: req.file.originalname,
          fileSize: req.file.size
        }
      });

      // TODO: Trigger background job for resume parsing
      console.log('Resume uploaded, should trigger parsing job');

    } catch (error) {
      console.error('Resume upload error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }
);

app.post('/api/upload/document',
  authenticateToken,
  upload.single('document'),
  [
    body('type').isIn(['cover_letter', 'portfolio', 'certificate', 'other']),
  ],
  handleValidationErrors,
  async (req: any, res: any) => {
    try {
      if (!req.file) {
        return res.status(400).json({ error: 'No file uploaded' });
      }

      const fileData = {
        userId: req.user.id,
        fileName: req.file.originalname,
        filePath: req.file.path,
        fileSize: req.file.size,
        mimeType: req.file.mimetype,
        uploadedAt: new Date(),
        type: req.body.type,
        status: 'pending'
      };

      const result = await db.collection('documents').insertOne(fileData);

      res.json({
        success: true,
        data: {
          id: result.insertedId,
          fileName: req.file.originalname,
          fileSize: req.file.size,
          type: req.body.type
        }
      });

    } catch (error) {
      console.error('Document upload error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }
);

// Integration routes
app.get('/api/integrations', authenticateToken, async (req: any, res: any) => {
  try {
    const integrations = await db.collection('integrations').find({ 
      userId: req.user.id 
    }).toArray();

    res.json({
      success: true,
      data: integrations
    });
  } catch (error) {
    console.error('Integrations fetch error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.post('/api/integrations/github/sync', 
  authenticateToken,
  async (req: any, res: any) => {
    try {
      // TODO: Implement GitHub API sync
      res.json({
        success: true,
        message: 'GitHub sync initiated'
      });
    } catch (error) {
      console.error('GitHub sync error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }
);

// Recommendations routes
app.get('/api/recommendations', authenticateToken, async (req: any, res: any) => {
  try {
    const recommendations = await db.collection('recommendations').find({
      userId: req.user.id,
      isCompleted: false,
      isDismissed: false
    }).sort({ priority: -1, createdAt: -1 }).toArray();

    res.json({
      success: true,
      data: recommendations
    });
  } catch (error) {
    console.error('Recommendations fetch error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.post('/api/recommendations/:id/complete',
  authenticateToken,
  async (req: any, res: any) => {
    try {
      await db.collection('recommendations').updateOne(
        { _id: req.params.id, userId: req.user.id },
        { 
          $set: { 
            isCompleted: true, 
            completedAt: new Date() 
          } 
        }
      );

      res.json({
        success: true,
        message: 'Recommendation marked as completed'
      });
    } catch (error) {
      console.error('Recommendation complete error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }
);

// Analytics routes
app.get('/api/analytics', authenticateToken, async (req: any, res: any) => {
  try {
    const analytics = await db.collection('analytics').find({
      userId: req.user.id
    }).sort({ date: -1 }).limit(30).toArray();

    res.json({
      success: true,
      data: analytics
    });
  } catch (error) {
    console.error('Analytics fetch error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Error handling middleware
app.use((error: any, req: any, res: any, next: any) => {
  console.error('Error:', error);
  
  if (error instanceof multer.MulterError) {
    if (error.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({ error: 'File too large. Maximum size is 10MB.' });
    }
  }
  
  res.status(500).json({ error: 'Internal server error' });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: 'Endpoint not found' });
});

// Start server
const startServer = async () => {
  await connectToMongoDB();
  
  app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
    console.log(`Environment: ${process.env.NODE_ENV}`);
  });
};

startServer().catch(console.error);

export default app;