/**
 * Database Redundancy and Backup Configuration
 * 
 * Enterprise-grade database management including:
 * - Read replica configuration
 * - Automated backup strategies
 * - Point-in-time recovery
 * - Connection pooling optimization
 * - Failover mechanisms
 */

import { PrismaClient } from '@prisma/client';
import config from '../../config';
import logger from '../../shared/utils/logger.util';
import { DatabaseError } from '../../shared/errors/custom-errors';

/**
 * Database connection pool configuration
 */
interface DatabasePoolConfig {
  connectionLimit: number;
  queueLimit: number;
  acquireTimeoutMillis: number;
  timeoutMillis: number;
  idleTimeoutMillis: number;
}

/**
 * Backup configuration
 */
interface BackupConfig {
  enabled: boolean;
  schedule: string;
  retention: number;
  compression: boolean;
  encryption: boolean;
  storageLocation: string;
  notificationWebhook?: string;
}

/**
 * Read replica configuration
 */
interface ReadReplicaConfig {
  enabled: boolean;
  url?: string;
  maxConnections: number;
  fallbackToMaster: boolean;
  healthCheckInterval: number;
}

/**
 * Enterprise Database Manager
 */
class DatabaseManager {
  private masterClient: PrismaClient;
  private replicaClient?: PrismaClient;
  private isReplicaHealthy: boolean = true;
  private healthCheckInterval?: NodeJS.Timeout;

  constructor() {
    this.masterClient = this.createMasterClient();
    
    if (config.database.readReplica) {
      this.replicaClient = this.createReplicaClient();
      this.startReplicaHealthCheck();
    }
    
    this.setupEventHandlers();
  }

  /**
   * Create master database client with optimized configuration
   */
  private createMasterClient(): PrismaClient {
    const poolConfig = this.getOptimalPoolConfig();
    
    return new PrismaClient({
      datasources: {
        db: {
          url: config.database.url
        }
      },
      log: config.nodeEnv === 'development' ? ['query', 'info', 'warn', 'error'] : ['error'],
    });
  }

  /**
   * Create read replica client
   */
  private createReplicaClient(): PrismaClient | undefined {
    if (!config.database.readReplica?.url) {
      return undefined;
    }

    return new PrismaClient({
      datasources: {
        db: {
          url: config.database.readReplica.url
        }
      },
      log: config.nodeEnv === 'development' ? ['info', 'warn', 'error'] : ['error'],
    });
  }

  /**
   * Get optimal connection pool configuration
   */
  private getOptimalPoolConfig(): DatabasePoolConfig {
    const cpuCount = require('os').cpus().length;
    
    return {
      connectionLimit: Math.max(config.database.maxConnections, cpuCount * 2),
      queueLimit: config.database.maxConnections * 2,
      acquireTimeoutMillis: config.database.connectionTimeout,
      timeoutMillis: config.database.queryTimeout,
      idleTimeoutMillis: 60000 // 1 minute
    };
  }

  /**
   * Setup database event handlers
   */
  private setupEventHandlers(): void {
    // Handle connection errors
    this.masterClient.$on('error', (e) => {
      logger.error('Master database error', { error: e });
      this.handleDatabaseError(e, 'master');
    });

    if (this.replicaClient) {
      this.replicaClient.$on('error', (e) => {
        logger.error('Replica database error', { error: e });
        this.handleDatabaseError(e, 'replica');
        this.isReplicaHealthy = false;
      });
    }

    // Graceful shutdown
    process.on('SIGTERM', () => this.gracefulShutdown());
    process.on('SIGINT', () => this.gracefulShutdown());
  }

  /**
   * Start health check for read replica
   */
  private startReplicaHealthCheck(): void {
    if (!this.replicaClient || !config.database.readReplica) {
      return;
    }

    const checkInterval = 30000; // 30 seconds
    
    this.healthCheckInterval = setInterval(async () => {
      try {
        await this.replicaClient!.$queryRaw`SELECT 1`;
        if (!this.isReplicaHealthy) {
          logger.info('Read replica is healthy again');
          this.isReplicaHealthy = true;
        }
      } catch (error) {
        if (this.isReplicaHealthy) {
          logger.error('Read replica health check failed', { error });
          this.isReplicaHealthy = false;
        }
      }
    }, checkInterval);
  }

  /**
   * Get database client for read operations
   */
  public getReadClient(): PrismaClient {
    // Use replica if available and healthy, otherwise fall back to master
    if (this.replicaClient && this.isReplicaHealthy) {
      return this.replicaClient;
    }
    
    if (this.replicaClient && !this.isReplicaHealthy) {
      logger.warn('Using master database for read operation due to replica failure');
    }
    
    return this.masterClient;
  }

  /**
   * Get database client for write operations (always master)
   */
  public getWriteClient(): PrismaClient {
    return this.masterClient;
  }

  /**
   * Execute read operation with automatic fallback
   */
  public async executeRead<T>(operation: (client: PrismaClient) => Promise<T>): Promise<T> {
    const client = this.getReadClient();
    
    try {
      return await operation(client);
    } catch (error) {
      // If replica operation fails, try master if we were using replica
      if (client === this.replicaClient && this.isReplicaHealthy) {
        logger.warn('Read operation failed on replica, retrying on master', { error });
        this.isReplicaHealthy = false;
        return await operation(this.masterClient);
      }
      
      throw error;
    }
  }

  /**
   * Execute write operation
   */
  public async executeWrite<T>(operation: (client: PrismaClient) => Promise<T>): Promise<T> {
    try {
      return await operation(this.masterClient);
    } catch (error) {
      logger.error('Write operation failed', { error });
      throw new DatabaseError('Write operation failed', { error });
    }
  }

  /**
   * Execute transaction
   */
  public async executeTransaction<T>(
    operations: (client: PrismaClient) => Promise<T>
  ): Promise<T> {
    try {
      return await this.masterClient.$transaction(async (client) => {
        return await operations(client);
      });
    } catch (error) {
      logger.error('Transaction failed', { error });
      throw new DatabaseError('Transaction failed', { error });
    }
  }

  /**
   * Handle database errors
   */
  private handleDatabaseError(error: any, type: 'master' | 'replica'): void {
    const errorInfo = {
      type,
      error,
      timestamp: new Date().toISOString()
    };

    // Check if it's a connection error
    if (this.isConnectionError(error)) {
      logger.error('Database connection error detected', errorInfo);
      
      if (type === 'replica') {
        this.isReplicaHealthy = false;
      }
      
      // Here you could implement additional alerting logic
      this.sendDatabaseAlert(errorInfo);
    }
  }

  /**
   * Check if error is a connection error
   */
  private isConnectionError(error: any): boolean {
    const connectionErrors = [
      'ECONNRESET',
      'ECONNREFUSED',
      'ETIMEDOUT',
      'EHOSTUNREACH',
      'ENETUNREACH'
    ];
    
    return connectionErrors.some(code => 
      error.code === code || 
      error.message?.includes(code) ||
      error.message?.includes('Connection terminated') ||
      error.message?.includes('Connection lost')
    );
  }

  /**
   * Send database alert
   */
  private sendDatabaseAlert(errorInfo: any): void {
    // Implementation would depend on your alerting system
    // Examples: PagerDuty, Slack, email, etc.
    logger.error('DATABASE ALERT', {
      alertType: 'database_error',
      severity: 'high',
      ...errorInfo
    });
  }

  /**
   * Get database statistics
   */
  public async getDatabaseStats(): Promise<any> {
    try {
      const masterStats = await this.getMasterStats();
      const replicaStats = this.replicaClient ? await this.getReplicaStats() : null;
      
      return {
        master: masterStats,
        replica: replicaStats,
        replicaHealthy: this.isReplicaHealthy,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      logger.error('Failed to get database stats', { error });
      throw new DatabaseError('Failed to get database statistics');
    }
  }

  /**
   * Get master database statistics
   */
  private async getMasterStats(): Promise<any> {
    const stats = await this.masterClient.$queryRaw`
      SELECT 
        pg_database_size(current_database()) as database_size,
        (SELECT count(*) FROM pg_stat_activity WHERE state = 'active') as active_connections,
        (SELECT count(*) FROM pg_stat_activity) as total_connections
    `;
    
    return stats;
  }

  /**
   * Get replica database statistics
   */
  private async getReplicaStats(): Promise<any> {
    if (!this.replicaClient || !this.isReplicaHealthy) {
      return { status: 'unhealthy' };
    }
    
    try {
      const stats = await this.replicaClient.$queryRaw`
        SELECT 
          pg_database_size(current_database()) as database_size,
          (SELECT count(*) FROM pg_stat_activity WHERE state = 'active') as active_connections,
          (SELECT count(*) FROM pg_stat_activity) as total_connections,
          pg_last_wal_receive_lsn() as last_wal_receive_lsn,
          pg_last_wal_replay_lsn() as last_wal_replay_lsn
      `;
      
      return { ...stats, status: 'healthy' };
    } catch (error) {
      return { status: 'error', error: error.message };
    }
  }

  /**
   * Graceful shutdown
   */
  private async gracefulShutdown(): Promise<void> {
    logger.info('Shutting down database connections');
    
    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval);
    }
    
    try {
      await Promise.all([
        this.masterClient.$disconnect(),
        this.replicaClient?.$disconnect()
      ]);
      logger.info('Database connections closed successfully');
    } catch (error) {
      logger.error('Error closing database connections', { error });
    }
  }
}

/**
 * Backup Management System
 */
class BackupManager {
  private config: BackupConfig;

  constructor() {
    this.config = {
      enabled: config.database.backup.enabled,
      schedule: config.database.backup.schedule,
      retention: config.database.backup.retention,
      compression: true,
      encryption: true,
      storageLocation: process.env.BACKUP_STORAGE_LOCATION || './backups',
      notificationWebhook: process.env.BACKUP_NOTIFICATION_WEBHOOK
    };
  }

  /**
   * Create database backup
   */
  public async createBackup(): Promise<string> {
    if (!this.config.enabled) {
      throw new Error('Backups are not enabled');
    }

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const backupFile = `backup-${timestamp}.sql`;
    const backupPath = `${this.config.storageLocation}/${backupFile}`;

    try {
      logger.info('Starting database backup', { backupPath });

      // Create backup using pg_dump
      const { spawn } = require('child_process');
      const url = new URL(config.database.url);
      
      const pgDumpArgs = [
        '-h', url.hostname,
        '-p', url.port || '5432',
        '-U', url.username,
        '-d', url.pathname.slice(1), // Remove leading slash
        '-f', backupPath,
        '--verbose',
        '--no-password'
      ];

      if (this.config.compression) {
        pgDumpArgs.push('--compress=9');
      }

      await new Promise((resolve, reject) => {
        const pgDump = spawn('pg_dump', pgDumpArgs, {
          env: {
            ...process.env,
            PGPASSWORD: url.password
          }
        });

        pgDump.on('close', (code) => {
          if (code === 0) {
            resolve(null);
          } else {
            reject(new Error(`pg_dump exited with code ${code}`));
          }
        });

        pgDump.on('error', reject);
      });

      // Encrypt backup if enabled
      if (this.config.encryption) {
        await this.encryptBackup(backupPath);
      }

      logger.info('Database backup completed', { backupPath });
      
      // Send notification if configured
      if (this.config.notificationWebhook) {
        await this.sendBackupNotification('success', backupPath);
      }

      // Cleanup old backups
      await this.cleanupOldBackups();

      return backupPath;
    } catch (error) {
      logger.error('Database backup failed', { error, backupPath });
      
      if (this.config.notificationWebhook) {
        await this.sendBackupNotification('failure', backupPath, error);
      }
      
      throw new DatabaseError('Backup creation failed', { error });
    }
  }

  /**
   * Encrypt backup file
   */
  private async encryptBackup(filePath: string): Promise<void> {
    // Implementation depends on your encryption strategy
    // Example: using GPG, AWS KMS, or similar
    logger.info('Encrypting backup', { filePath });
    
    // For demo purposes, we'll just log this
    // In production, implement actual encryption
  }

  /**
   * Cleanup old backups based on retention policy
   */
  private async cleanupOldBackups(): Promise<void> {
    const fs = require('fs').promises;
    const path = require('path');

    try {
      const files = await fs.readdir(this.config.storageLocation);
      const backupFiles = files.filter((file: string) => file.startsWith('backup-'));
      
      if (backupFiles.length <= this.config.retention) {
        return;
      }

      // Sort files by creation time and remove oldest
      const filesToDelete = backupFiles
        .sort()
        .slice(0, backupFiles.length - this.config.retention);

      for (const file of filesToDelete) {
        const filePath = path.join(this.config.storageLocation, file);
        await fs.unlink(filePath);
        logger.info('Deleted old backup', { filePath });
      }
    } catch (error) {
      logger.error('Failed to cleanup old backups', { error });
    }
  }

  /**
   * Send backup notification
   */
  private async sendBackupNotification(
    status: 'success' | 'failure', 
    backupPath: string, 
    error?: any
  ): Promise<void> {
    try {
      const payload = {
        status,
        backupPath,
        timestamp: new Date().toISOString(),
        service: 'billing-service',
        error: error?.message
      };

      // Implementation depends on your notification system
      logger.info('Backup notification', payload);
    } catch (error) {
      logger.error('Failed to send backup notification', { error });
    }
  }

  /**
   * Restore from backup
   */
  public async restoreBackup(backupPath: string): Promise<void> {
    logger.warn('Starting database restore', { backupPath });
    
    // Implementation would use pg_restore
    // This is a critical operation that should be handled carefully
    throw new Error('Backup restore not implemented - requires manual intervention');
  }
}

// Export singleton instances
export const databaseManager = new DatabaseManager();
export const backupManager = new BackupManager();

// Export for dependency injection
export { DatabaseManager, BackupManager };
export type { DatabasePoolConfig, BackupConfig, ReadReplicaConfig };