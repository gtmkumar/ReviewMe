async function globalTeardown() {
  console.log('🧹 Starting global teardown...');

  try {
    // Cleanup test data
    console.log('🗑️  Cleaning up test data...');
    
    // Example cleanup operations:
    // - Clear test database
    // - Remove uploaded test files
    // - Reset external service mocks
    
    // If using a test database, you might want to drop it
    if (process.env.MONGODB_URI?.includes('test')) {
      console.log('🗄️  Cleaning test database...');
      // Database cleanup logic would go here
    }

    // Clear any test files
    console.log('📁 Cleaning test files...');
    // File cleanup logic would go here

    console.log('✅ Global teardown completed successfully');

  } catch (error) {
    console.error('❌ Global teardown failed:', error);
    // Don't throw here, as it might mask test failures
  }
}

export default globalTeardown;