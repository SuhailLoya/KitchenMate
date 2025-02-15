export async function healthCheck() {
  try {
    // Check critical services
    await Promise.all([
      checkDatabase(),
      checkGeminiAPI(),
      checkGoogleCloudServices()
    ]);
    
    return { status: 'healthy' };
  } catch (error) {
    return {
      status: 'unhealthy',
      error: error.message
    };
  }
} 