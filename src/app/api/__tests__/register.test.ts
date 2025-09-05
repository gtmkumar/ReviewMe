import { POST } from '@/app/api/auth/register/route';
import { getDbManager } from '@/lib/database';
import bcrypt from 'bcryptjs';
import { NextRequest } from 'next/server';

// Mock dependencies
jest.mock('@/lib/database');
jest.mock('bcryptjs');

// Mock NextRequest
class MockRequest {
  constructor(public url: string, public init: RequestInit) {}
  async json() {
    return JSON.parse(this.init.body as string);
  }
}

// Mock the Request constructor
global.Request = MockRequest as any;

const mockGetDbManager = getDbManager as jest.MockedFunction<typeof getDbManager>;
const mockBcrypt = bcrypt as jest.Mocked<typeof bcrypt>;

describe('/api/auth/register', () => {
  let mockDb: any;

  beforeEach(() => {
    jest.clearAllMocks();

    // Mock database
    mockDb = {
      connect: jest.fn(),
      collection: jest.fn((name: string) => ({
        findOne: jest.fn(),
        insertOne: jest.fn(),
        updateOne: jest.fn(),
      })),
      users: {
        findOne: jest.fn(),
        insertOne: jest.fn(),
        updateOne: jest.fn(),
      },
      referrals: {
        findOne: jest.fn(),
        insertOne: jest.fn(),
      },
    };

    mockGetDbManager.mockReturnValue(mockDb);

    // Mock bcrypt
    mockBcrypt.hash.mockResolvedValue('hashed-password' as never);
  });

  describe('POST /api/auth/register', () => {
    it('should assign 100 credits to new user by default', async () => {
      const requestBody = {
        name: 'Test User',
        email: 'test@example.com',
        password: 'Password123!',
      };

      // Mock user doesn't exist
      mockDb.users.findOne.mockResolvedValue(null);
      
      // Mock successful user creation
      const mockInsertResult = {
        acknowledged: true,
        insertedId: 'new-user-id',
      };
      mockDb.users.insertOne.mockResolvedValue(mockInsertResult);

      const request = new Request('http://localhost:3000/api/auth/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(201);
      expect(data.success).toBe(true);
      expect(data.message).toBe('User registered successfully');

      // Verify user was created with 100 credits
      expect(mockDb.users.insertOne).toHaveBeenCalledWith(
        expect.objectContaining({
          name: 'Test User',
          email: 'test@example.com',
          credits: 100, // This is the key assertion
          totalReferrals: 0,
          profilePublic: true,
          requestCounts: {
            github: 0,
            linkedin: 0,
            resume: 0,
          },
        })
      );
    });

    it('should assign 100 + 300 credits to new user with referral code', async () => {
      const requestBody = {
        name: 'Test User',
        email: 'test@example.com',
        password: 'Password123!',
        referralCode: 'REF123456',
      };

      // Mock user doesn't exist
      mockDb.users.findOne.mockResolvedValue(null);
      
      // Mock referral exists
      const mockReferral = {
        _id: 'referral-id',
        referrerId: 'referrer-user-id',
        code: 'REF123456',
        isUsed: false,
      };
      mockDb.referrals.findOne.mockResolvedValue(mockReferral);

      // Mock successful user creation
      const mockInsertResult = {
        acknowledged: true,
        insertedId: 'new-user-id',
      };
      mockDb.users.insertOne.mockResolvedValue(mockInsertResult);

      // Mock credit service calls
      const mockCreditService = {
        addCredits: jest.fn().mockResolvedValue(true),
      };
      
      // Mock the CreditService import
      jest.doMock('@/lib/services', () => ({
        CreditService: mockCreditService,
        REFERRAL_BONUS: 200,
        NEW_USER_REFERRAL_BONUS: 300,
      }));

      const request = new Request('http://localhost:3000/api/auth/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(201);
      expect(data.success).toBe(true);

      // Verify user was created with initial 100 credits
      expect(mockDb.users.insertOne).toHaveBeenCalledWith(
        expect.objectContaining({
          name: 'Test User',
          email: 'test@example.com',
          credits: 100, // Initial credits
        })
      );
    });

    it('should handle existing user error', async () => {
      const requestBody = {
        name: 'Test User',
        email: 'existing@example.com',
        password: 'Password123!',
      };

      // Mock user already exists
      mockDb.users.findOne.mockResolvedValue({
        _id: 'existing-user-id',
        email: 'existing@example.com',
      });

      const request = new Request('http://localhost:3000/api/auth/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('User already exists');
      
      // Verify no user creation was attempted
      expect(mockDb.users.insertOne).not.toHaveBeenCalled();
    });

    it('should validate required fields', async () => {
      const requestBody = {
        name: '', // Missing name
        email: 'test@example.com',
        password: 'Password123!',
      };

      const request = new Request('http://localhost:3000/api/auth/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toContain('validation'); // Should contain validation error
      
      // Verify no user creation was attempted
      expect(mockDb.users.insertOne).not.toHaveBeenCalled();
    });

    it('should validate email format', async () => {
      const requestBody = {
        name: 'Test User',
        email: 'invalid-email', // Invalid email format
        password: 'Password123!',
      };

      const request = new Request('http://localhost:3000/api/auth/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toContain('email'); // Should contain email validation error
      
      // Verify no user creation was attempted
      expect(mockDb.users.insertOne).not.toHaveBeenCalled();
    });

    it('should validate password strength', async () => {
      const requestBody = {
        name: 'Test User',
        email: 'test@example.com',
        password: '123', // Weak password
      };

      const request = new Request('http://localhost:3000/api/auth/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toContain('password'); // Should contain password validation error
      
      // Verify no user creation was attempted
      expect(mockDb.users.insertOne).not.toHaveBeenCalled();
    });

    it('should generate unique public username', async () => {
      const requestBody = {
        name: 'John Doe',
        email: 'john@example.com',
        password: 'Password123!',
      };

      // Mock user doesn't exist
      mockDb.users.findOne.mockResolvedValue(null);
      
      // Mock successful user creation
      const mockInsertResult = {
        acknowledged: true,
        insertedId: 'new-user-id',
      };
      mockDb.users.insertOne.mockResolvedValue(mockInsertResult);

      const request = new Request('http://localhost:3000/api/auth/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(201);

      // Verify user was created with a generated public username
      expect(mockDb.users.insertOne).toHaveBeenCalledWith(
        expect.objectContaining({
          publicUsername: expect.stringMatching(/^johndoe\d{6}$/), // Should match pattern: johndoe + 6 digits
        })
      );
    });

    it('should handle database connection errors', async () => {
      const requestBody = {
        name: 'Test User',
        email: 'test@example.com',
        password: 'Password123!',
      };

      // Mock database connection failure
      mockDb.connect.mockRejectedValue(new Error('Database connection failed'));

      const request = new Request('http://localhost:3000/api/auth/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toBe('Internal server error');
    });
  });
});