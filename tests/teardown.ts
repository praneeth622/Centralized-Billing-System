// Jest global teardown file
export default async (): Promise<void> => {
  // Cleanup after all tests are complete
  console.log('🧹 Running global teardown...');
  
  // Close any remaining connections, cleanup resources, etc.
  // For now, we don't have any global resources to cleanup
  
  console.log('✅ Global teardown complete');
};