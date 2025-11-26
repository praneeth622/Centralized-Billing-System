import 'dotenv/config';
import { createServer } from 'http';
import app from './app';
import config from './config';
import logger from './utils/logger';

const port = config.port;

const server = createServer(app);

server.listen(port, () => {
  logger.info(`Billing service listening on port ${port}`);
});

process.on('unhandledRejection', (reason) => {
  logger.error('Unhandled Rejection:', reason as any);
});

process.on('uncaughtException', (err) => {
  logger.error('Uncaught Exception:', err as any);
  process.exit(1);
});
