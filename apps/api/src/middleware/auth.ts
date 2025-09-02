import { Request, Response, NextFunction } from 'express';
import { getAuth } from '@clerk/express';

export interface AuthenticatedRequest extends Request {
    userId?: string;
    sessionId?: string;
}

export const requireAuth = (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const { userId, sessionId } = getAuth(req);
    
    if (!userId) {
      return res.status(401).json({
        success: false,
        error: 'Authentication required'
      });
    }
    
    req.userId = userId;
    req.sessionId = sessionId;
    next();
  } catch (error) {
    return res.status(401).json({
      success: false,
      error: 'Invalid session'
    });
  }
};

