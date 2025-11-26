import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import morgan from 'morgan';
import bodyParser from 'body-parser';
import 'express-async-errors';
import routes from './routes';
import stripeWebhookRouter from './webhooks/stripeWebhook';
import errorHandler from './middleware/errorHandler';
import config from './config';
import logger from './utils/logger';
import { setupSwagger } from './infrastructure/swagger/setup';

const app = express();

app.use(helmet());
app.use(cors());
app.use(morgan('combined'));

// Stripe webhook must receive raw body: mount BEFORE the global JSON parser
app.use('/api/webhooks/stripe', stripeWebhookRouter);

// General JSON body parser
app.use(bodyParser.json());

// Setup Swagger documentation
if (config.nodeEnv !== 'production') {
  setupSwagger(app);
}

// API routes
app.use('/api', routes);

// Error handler (should be last)
app.use(errorHandler);

export default app;
