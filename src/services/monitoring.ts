export class MonitoringService {
  private static instance: MonitoringService;
  
  private constructor() {}
  
  static getInstance() {
    if (!MonitoringService.instance) {
      MonitoringService.instance = new MonitoringService();
    }
    return MonitoringService.instance;
  }

  logError(error: Error, context: string) {
    console.error(`[${context}]`, error);
    // Add error reporting service here (e.g., Sentry)
  }

  logPerformance(action: string, duration: number) {
    console.log(`Performance [${action}]: ${duration}ms`);
    // Add performance monitoring here
  }
} 