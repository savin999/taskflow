import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

// Extend Express Request to carry user info
export interface AuthRequest extends Request {
  user?: {
    userId: string;
    email: string;
    username: string;
    role: 'manager' | 'member' | 'viewer';
  };
}

export const verifyJWT = (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): void => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader?.startsWith('Bearer ')) {
      res.status(401).json({ message: 'No token provided' });
      return;
    }

    const token = authHeader.split(' ')[1];

    const decoded = jwt.verify(
      token,
      process.env.JWT_SECRET as string
    ) as {
      userId: string;
      email: string;
      username: string;
      role: 'manager' | 'member' | 'viewer';
    };

    // Attach user to request object for use in authorize() and controllers
    req.user = decoded;
    next();
  } catch (error) {
    res.status(401).json({ message: 'Invalid or expired token' });
  }
};