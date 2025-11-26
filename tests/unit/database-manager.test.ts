import { DatabaseManager } from '../../src/infrastructure/database/database-manager';

// Mock Prisma client
const mockPrismaClient = {
  $connect: jest.fn(),
  $disconnect: jest.fn(),
  $queryRaw: jest.fn(),
  user: {
    count: jest.fn(),
    findMany: jest.fn()
  }
};

const mockPrismaReadReplica = {
  $connect: jest.fn(),
  $disconnect: jest.fn(),
  $queryRaw: jest.fn(),
  user: {
    count: jest.fn(),
    findMany: jest.fn()
  }
};

jest.mock('@prisma/client', () => ({
  PrismaClient: jest.fn()
    .mockImplementationOnce(() => mockPrismaClient)
    .mockImplementationOnce(() => mockPrismaReadReplica)
}));

// Mock config
jest.mock('../../src/config', () => ({
  __esModule: true,
  default: {
    database: {
      url: 'postgresql://main:password@localhost:5432/billing',
      readReplicaUrl: 'postgresql://replica:password@localhost:5433/billing',
      connectionPoolSize: 10,
      queryTimeout: 5000,
      backup: {
        schedule: '0 2 * * *',
        retentionDays: 7,
        location: '/backups'
      }
    }
  }
}));

// Mock logger
const mockLogger = {
  info: jest.fn(),
  error: jest.fn(),
  warn: jest.fn(),
  debug: jest.fn()
};

jest.mock('../../src/shared/utils/logger.util', () => ({
  __esModule: true,
  default: mockLogger
}));

// Mock child_process
const mockSpawn = {
  stdout: { on: jest.fn() },
  stderr: { on: jest.fn() },
  on: jest.fn()
};

jest.mock('child_process', () => ({
  spawn: jest.fn(() => mockSpawn)
}));

// Mock fs
const mockFs = {
  existsSync: jest.fn(),
  mkdirSync: jest.fn(),
  readdirSync: jest.fn(),
  unlinkSync: jest.fn(),
  statSync: jest.fn()
};

jest.mock('fs', () => mockFs);

// Mock cron
const mockCronJob = {
  start: jest.fn(),
  stop: jest.fn()
};

jest.mock('cron', () => ({
  CronJob: jest.fn(() => mockCronJob)
}));

describe('DatabaseManager', () => {
  let databaseManager: DatabaseManager;

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Reset singleton
    (DatabaseManager as any)._instance = null;
    
    // Setup successful mocks by default
    mockPrismaClient.$connect.mockResolvedValue(undefined);
    mockPrismaClient.$disconnect.mockResolvedValue(undefined);
    mockPrismaClient.$queryRaw.mockResolvedValue([{ result: 1 }]);
    mockPrismaClient.user.count.mockResolvedValue(10);
    
    mockPrismaReadReplica.$connect.mockResolvedValue(undefined);
    mockPrismaReadReplica.$disconnect.mockResolvedValue(undefined);
    mockPrismaReadReplica.$queryRaw.mockResolvedValue([{ result: 1 }]);
    mockPrismaReadReplica.user.count.mockResolvedValue(10);
    
    mockFs.existsSync.mockReturnValue(false);
    mockSpawn.on.mockImplementation((event, callback) => {
      if (event === 'close') {
        setTimeout(() => callback(0), 100); // Simulate successful backup
      }
    });
  });

  afterEach(async () => {
    if (databaseManager) {
      await databaseManager.disconnect();
    }
  });

  describe('Singleton Pattern', () => {
    it('should return the same instance', () => {
      const instance1 = DatabaseManager.getInstance();
      const instance2 = DatabaseManager.getInstance();
      
      expect(instance1).toBe(instance2);
    });

    it('should initialize connections on first call', () => {
      DatabaseManager.getInstance();
      
      expect(mockPrismaClient.$connect).toHaveBeenCalledTimes(1);
      expect(mockPrismaReadReplica.$connect).toHaveBeenCalledTimes(1);
    });
  });

  describe('Connection Management', () => {
    beforeEach(() => {
      databaseManager = DatabaseManager.getInstance();
    });

    it('should connect to main and read replica databases', async () => {
      await databaseManager.connect();
      
      expect(mockPrismaClient.$connect).toHaveBeenCalled();
      expect(mockPrismaReadReplica.$connect).toHaveBeenCalled();
      expect(mockLogger.info).toHaveBeenCalledWith('Connected to main database');
      expect(mockLogger.info).toHaveBeenCalledWith('Connected to read replica database');
    });

    it('should handle main database connection failures', async () => {
      mockPrismaClient.$connect.mockRejectedValue(new Error('Connection failed'));
      
      await expect(databaseManager.connect()).rejects.toThrow('Connection failed');
      expect(mockLogger.error).toHaveBeenCalledWith(
        'Failed to connect to main database',
        expect.objectContaining({ error: expect.any(Error) })
      );
    });

    it('should handle read replica connection failures gracefully', async () => {
      mockPrismaReadReplica.$connect.mockRejectedValue(new Error('Replica connection failed'));
      
      await databaseManager.connect();
      
      expect(mockLogger.warn).toHaveBeenCalledWith(
        'Failed to connect to read replica, falling back to main database for reads',
        expect.objectContaining({ error: expect.any(Error) })
      );
    });

    it('should disconnect from all connections', async () => {
      await databaseManager.connect();
      await databaseManager.disconnect();
      
      expect(mockPrismaClient.$disconnect).toHaveBeenCalled();
      expect(mockPrismaReadReplica.$disconnect).toHaveBeenCalled();
      expect(mockLogger.info).toHaveBeenCalledWith('Disconnected from all database connections');
    });
  });

  describe('Client Access', () => {
    beforeEach(() => {
      databaseManager = DatabaseManager.getInstance();
    });

    it('should return main database client for write operations', () => {
      const client = databaseManager.getWriteClient();
      expect(client).toBe(mockPrismaClient);
    });

    it('should return read replica client for read operations', async () => {
      await databaseManager.connect();
      const client = databaseManager.getReadClient();
      expect(client).toBe(mockPrismaReadReplica);
    });

    it('should fallback to main client when read replica is unavailable', async () => {
      mockPrismaReadReplica.$connect.mockRejectedValue(new Error('Replica down'));
      await databaseManager.connect();
      
      const client = databaseManager.getReadClient();
      expect(client).toBe(mockPrismaClient);
    });
  });

  describe('Health Checks', () => {
    beforeEach(() => {
      databaseManager = DatabaseManager.getInstance();
    });

    it('should perform successful health check on main database', async () => {
      const health = await databaseManager.checkMainHealth();
      
      expect(health.isHealthy).toBe(true);
      expect(health.responseTime).toBeGreaterThan(0);
      expect(health.details.connectionState).toBe('connected');
      expect(health.details.queryResult).toBe('success');
      expect(mockPrismaClient.$queryRaw).toHaveBeenCalledWith(['SELECT 1 as result']);
    });

    it('should detect main database health issues', async () => {
      mockPrismaClient.$queryRaw.mockRejectedValue(new Error('Query failed'));
      
      const health = await databaseManager.checkMainHealth();
      
      expect(health.isHealthy).toBe(false);
      expect(health.error).toContain('Query failed');
    });

    it('should perform successful health check on read replica', async () => {
      await databaseManager.connect();
      const health = await databaseManager.checkReplicaHealth();
      
      expect(health.isHealthy).toBe(true);
      expect(health.responseTime).toBeGreaterThan(0);
      expect(health.details.connectionState).toBe('connected');
      expect(mockPrismaReadReplica.$queryRaw).toHaveBeenCalledWith(['SELECT 1 as result']);
    });

    it('should handle read replica health check when replica is unavailable', async () => {
      // Don't connect replica
      const health = await databaseManager.checkReplicaHealth();
      
      expect(health.isHealthy).toBe(false);
      expect(health.error).toContain('Read replica not available');
    });

    it('should get overall database health status', async () => {
      await databaseManager.connect();
      const status = await databaseManager.getHealthStatus();
      
      expect(status.main.isHealthy).toBe(true);
      expect(status.replica.isHealthy).toBe(true);
      expect(status.overall).toBe('healthy');
    });

    it('should report degraded status when only main is healthy', async () => {
      mockPrismaReadReplica.$connect.mockRejectedValue(new Error('Replica down'));
      await databaseManager.connect();
      
      const status = await databaseManager.getHealthStatus();
      
      expect(status.main.isHealthy).toBe(true);
      expect(status.replica.isHealthy).toBe(false);
      expect(status.overall).toBe('degraded');
    });

    it('should report unhealthy status when main is down', async () => {
      mockPrismaClient.$queryRaw.mockRejectedValue(new Error('Main DB down'));
      
      const status = await databaseManager.getHealthStatus();
      
      expect(status.main.isHealthy).toBe(false);
      expect(status.overall).toBe('unhealthy');
    });
  });

  describe('Connection Pool Management', () => {
    beforeEach(() => {
      databaseManager = DatabaseManager.getInstance();
    });

    it('should monitor connection pool metrics', () => {
      const metrics = databaseManager.getConnectionPoolMetrics();
      
      expect(metrics).toMatchObject({
        main: {
          maxConnections: expect.any(Number),
          activeConnections: expect.any(Number),
          idleConnections: expect.any(Number)
        },
        replica: {
          maxConnections: expect.any(Number),
          activeConnections: expect.any(Number),
          idleConnections: expect.any(Number)
        }
      });
    });

    it('should provide connection usage statistics', () => {
      const metrics = databaseManager.getConnectionPoolMetrics();
      
      expect(typeof metrics.main.maxConnections).toBe('number');
      expect(typeof metrics.main.activeConnections).toBe('number');
      expect(typeof metrics.main.idleConnections).toBe('number');
      
      expect(metrics.main.activeConnections).toBeGreaterThanOrEqual(0);
      expect(metrics.main.idleConnections).toBeGreaterThanOrEqual(0);
    });
  });

  describe('Backup Management', () => {
    beforeEach(() => {
      databaseManager = DatabaseManager.getInstance();
      mockFs.existsSync.mockReturnValue(true);
      mockFs.readdirSync.mockReturnValue([]);
    });

    it('should create database backup', async () => {
      const backupPath = await databaseManager.createBackup();
      
      expect(backupPath).toMatch(/\/backups\/backup_\d{8}_\d{6}\.sql$/);
      expect(mockLogger.info).toHaveBeenCalledWith('Database backup started');
      expect(mockLogger.info).toHaveBeenCalledWith(
        'Database backup completed successfully',
        expect.objectContaining({ backupPath })
      );
    });

    it('should handle backup failures', async () => {
      mockSpawn.on.mockImplementation((event, callback) => {
        if (event === 'close') {
          setTimeout(() => callback(1), 100); // Simulate backup failure
        }
      });
      
      await expect(databaseManager.createBackup()).rejects.toThrow(
        'Database backup failed with exit code: 1'
      );
    });

    it('should cleanup old backups based on retention policy', async () => {
      const oldBackupName = `backup_${new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10).replace(/-/g, '')}_120000.sql`;
      const recentBackupName = `backup_${new Date().toISOString().slice(0, 10).replace(/-/g, '')}_120000.sql`;
      
      mockFs.readdirSync.mockReturnValue([oldBackupName, recentBackupName]);
      mockFs.statSync.mockImplementation((path) => ({
        mtime: path.includes(oldBackupName) 
          ? new Date(Date.now() - 10 * 24 * 60 * 60 * 1000) 
          : new Date()
      }));
      
      await databaseManager.cleanupOldBackups();
      
      expect(mockFs.unlinkSync).toHaveBeenCalledWith(
        expect.stringContaining(oldBackupName)
      );
      expect(mockLogger.info).toHaveBeenCalledWith(
        'Cleaned up old backup',
        expect.objectContaining({ backupName: oldBackupName })
      );
    });

    it('should create backup directory if it does not exist', async () => {
      mockFs.existsSync.mockReturnValue(false);
      
      await databaseManager.createBackup();
      
      expect(mockFs.mkdirSync).toHaveBeenCalledWith('/backups', { recursive: true });
    });
  });

  describe('Automated Backup Scheduling', () => {
    beforeEach(() => {
      databaseManager = DatabaseManager.getInstance();
    });

    it('should start automated backup scheduler', () => {
      databaseManager.startBackupScheduler();
      
      expect(mockCronJob.start).toHaveBeenCalled();
      expect(mockLogger.info).toHaveBeenCalledWith('Database backup scheduler started');
    });

    it('should stop automated backup scheduler', () => {
      databaseManager.startBackupScheduler();
      databaseManager.stopBackupScheduler();
      
      expect(mockCronJob.stop).toHaveBeenCalled();
      expect(mockLogger.info).toHaveBeenCalledWith('Database backup scheduler stopped');
    });
  });

  describe('Query Execution', () => {
    beforeEach(() => {
      databaseManager = DatabaseManager.getInstance();
    });

    it('should execute read queries on read replica when available', async () => {
      await databaseManager.connect();
      
      const query = async (client: any) => client.user.findMany();
      const result = await databaseManager.executeReadQuery(query);
      
      expect(mockPrismaReadReplica.user.findMany).toHaveBeenCalled();
      expect(mockPrismaClient.user.findMany).not.toHaveBeenCalled();
    });

    it('should fallback to main database for reads when replica is unavailable', async () => {
      // Don't connect replica
      const query = async (client: any) => client.user.findMany();
      const result = await databaseManager.executeReadQuery(query);
      
      expect(mockPrismaClient.user.findMany).toHaveBeenCalled();
    });

    it('should execute write queries on main database', async () => {
      const query = async (client: any) => client.user.count();
      await databaseManager.executeWriteQuery(query);
      
      expect(mockPrismaClient.user.count).toHaveBeenCalled();
    });

    it('should handle query execution errors', async () => {
      mockPrismaClient.user.count.mockRejectedValue(new Error('Query failed'));
      
      const query = async (client: any) => client.user.count();
      
      await expect(databaseManager.executeWriteQuery(query)).rejects.toThrow('Query failed');
    });
  });

  describe('Connection Recovery', () => {
    beforeEach(() => {
      databaseManager = DatabaseManager.getInstance();
    });

    it('should attempt to recover from connection failures', async () => {
      // Simulate connection failure
      mockPrismaClient.$queryRaw
        .mockRejectedValueOnce(new Error('Connection lost'))
        .mockResolvedValueOnce([{ result: 1 }]);
      
      // First call should trigger recovery
      await expect(databaseManager.checkMainHealth()).resolves.toMatchObject({
        isHealthy: false
      });
      
      // After recovery, should work
      await expect(databaseManager.checkMainHealth()).resolves.toMatchObject({
        isHealthy: true
      });
    });
  });

  describe('Error Handling', () => {
    beforeEach(() => {
      databaseManager = DatabaseManager.getInstance();
    });

    it('should log connection errors appropriately', async () => {
      mockPrismaClient.$connect.mockRejectedValue(new Error('Connection timeout'));
      
      await expect(databaseManager.connect()).rejects.toThrow();
      
      expect(mockLogger.error).toHaveBeenCalledWith(
        'Failed to connect to main database',
        expect.objectContaining({
          error: expect.any(Error)
        })
      );
    });

    it('should handle backup directory creation errors', async () => {
      mockFs.existsSync.mockReturnValue(false);
      mockFs.mkdirSync.mockImplementation(() => {
        throw new Error('Permission denied');
      });
      
      await expect(databaseManager.createBackup()).rejects.toThrow('Permission denied');
    });

    it('should handle cleanup errors gracefully', async () => {
      mockFs.readdirSync.mockImplementation(() => {
        throw new Error('Directory read error');
      });
      
      // Should not throw, just log error
      await databaseManager.cleanupOldBackups();
      
      expect(mockLogger.error).toHaveBeenCalledWith(
        'Error during backup cleanup',
        expect.objectContaining({
          error: expect.any(Error)
        })
      );
    });
  });

  describe('Performance Monitoring', () => {
    beforeEach(() => {
      databaseManager = DatabaseManager.getInstance();
    });

    it('should measure query response times', async () => {
      const health = await databaseManager.checkMainHealth();
      
      expect(health.responseTime).toBeGreaterThan(0);
      expect(typeof health.responseTime).toBe('number');
    });

    it('should track connection statistics', () => {
      const stats = databaseManager.getConnectionStats();
      
      expect(stats).toMatchObject({
        totalConnections: expect.any(Number),
        activeQueries: expect.any(Number),
        successfulQueries: expect.any(Number),
        failedQueries: expect.any(Number),
        averageResponseTime: expect.any(Number)
      });
    });
  });
});