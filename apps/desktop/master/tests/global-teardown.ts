export const globalTeardown = async () => {
  console.log('[Global Teardown] Cleaning up test environment...');
  
  await new Promise(resolve => setTimeout(resolve, 100));
  
  console.log('[Global Teardown] Test environment cleaned up');
};

export default globalTeardown;
