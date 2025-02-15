export const productionConfig = {
  imageCaptureInterval: 5000, // ms
  maxConcurrentRequests: 10,
  cacheTimeout: 3600, // 1 hour
  retryAttempts: 3,
  
  // Add rate limiting
  rateLimit: {
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100 // limit each IP to 100 requests per windowMs
  }
}; 