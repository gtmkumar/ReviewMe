import { chromium, FullConfig } from '@playwright/test';

async function globalSetup(config: FullConfig) {
  console.log('🚀 Starting global setup...');

  // Set environment variables for testing
  (process.env as any).NODE_ENV = 'test';
  (process.env as any).NEXTAUTH_SECRET = 'test-secret-key';
  (process.env as any).NEXTAUTH_URL = 'http://localhost:3000';
  
  // Mock external service credentials
  (process.env as any).GITHUB_CLIENT_ID = 'test-github-client-id';
  (process.env as any).GITHUB_CLIENT_SECRET = 'test-github-client-secret';
  (process.env as any).GOOGLE_CLIENT_ID = 'test-google-client-id';
  (process.env as any).GOOGLE_CLIENT_SECRET = 'test-google-client-secret';
  
  // Use test database
  (process.env as any).MONGODB_URI = 'mongodb+srv://thedevankit:dbUserAnkit@cluster0.jb5pxci.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0';

  // Create a browser instance for auth setup
  const browser = await chromium.launch();
  const context = await browser.newContext();
  const page = await context.newPage();

  try {
    // Wait for the development server to be ready
    console.log('⏳ Waiting for development server...');
    
    let retries = 0;
    const maxRetries = 30;
    
    while (retries < maxRetries) {
      try {
        const response = await page.goto('http://localhost:3000', {
          waitUntil: 'networkidle',
          timeout: 5000,
        });
        
        if (response?.ok()) {
          console.log('✅ Development server is ready');
          break;
        }
      } catch (error) {
        retries++;
        console.log(`⏳ Retry ${retries}/${maxRetries} - waiting for server...`);
        await new Promise(resolve => setTimeout(resolve, 2000));
      }
    }

    if (retries >= maxRetries) {
      throw new Error('Development server failed to start within timeout');
    }

    // Setup test data or perform initial configuration here
    console.log('🔧 Setting up test environment...');

    // Example: Create test user, seed database, etc.
    // This would typically involve API calls to your backend
    
    console.log('✅ Global setup completed successfully');

  } catch (error) {
    console.error('❌ Global setup failed:', error);
    throw error;
  } finally {
    await browser.close();
  }
}

export default globalSetup;