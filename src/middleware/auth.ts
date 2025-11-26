import { Request, Response, NextFunction } from 'express';
import logger from '../utils/logger';

interface AuthenticatedRequest extends Request {
  user?: {
    id: string;
    email: string;
    organizationId: string;
  };
}

const auth = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const token = req.header('Authorization')?.replace('Bearer ', '');

    if (!token) {
      return res.status(401).json({
        success: false,
        error: 'No token, authorization denied'
      });
    }

    // For now, we'll create a mock implementation
    // In production, this would validate JWT tokens with Clerk
    const mockUser = {
      id: 'user_123',
      email: 'test@example.com',
      organizationId: 'org_123'
    };

    req.user = mockUser;
    next();
  } catch (error) {
    logger.error('Auth middleware error:', error);
    res.status(401).json({
      success: false,
      error: 'Token is not valid'
    });
  }
};

export default auth;