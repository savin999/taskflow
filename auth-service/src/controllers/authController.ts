import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import axios from 'axios';
import User from '../models/User';

// ─── Helpers ────────────────────────────────────────────────────────────────

const generateAccessToken = (user: {
  _id: string;
  email: string;
  username: string;
  role: string;
}) => {
  return jwt.sign(
    {
      userId: user._id,
      email: user.email,
      username: user.username,
      role: user.role,
    },
    process.env.JWT_SECRET as string,
    { expiresIn: '7d' }
  );
};

const generateRefreshToken = (userId: string) => {
  return jwt.sign(
    { userId },
    process.env.JWT_REFRESH_SECRET as string,
    { expiresIn: '7d' }
  );
};

const setRefreshCookie = (res: Response, token: string) => {
  res.cookie('refreshToken', token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 7 * 24 * 60 * 60 * 1000,
  });
};

// ─── Register ────────────────────────────────────────────────────────────────

export const register = async (req: Request, res: Response): Promise<void> => {
  try {
    const { email, username, password } = req.body;

    if (!email || !username || !password) {
      res.status(400).json({ message: 'All fields are required' });
      return;
    }

    const existingUser = await User.findOne({ email });
    if (existingUser) {
      res.status(409).json({ message: 'Email already in use' });
      return;
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const user = await User.create({
      email,
      username,
      password: hashedPassword,
      role: 'member',
    });

    const accessToken = generateAccessToken({
      _id: user._id.toString(),
      email: user.email,
      username: user.username,
      role: user.role,
    });

    const refreshToken = generateRefreshToken(user._id.toString());
    user.refreshToken = refreshToken;
    await user.save();

    setRefreshCookie(res, refreshToken);

    res.status(201).json({
      accessToken,
      user: {
        id: user._id.toString(),
        email: user.email,
        username: user.username,
        role: user.role,
      },
    });
  } catch (error) {
    console.error('Register error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

// ─── Login ───────────────────────────────────────────────────────────────────

export const login = async (req: Request, res: Response): Promise<void> => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      res.status(400).json({ message: 'Email and password are required' });
      return;
    }

    const user = await User.findOne({ email });
    if (!user || !user.password) {
      res.status(401).json({ message: 'Invalid credentials' });
      return;
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      res.status(401).json({ message: 'Invalid credentials' });
      return;
    }

    const accessToken = generateAccessToken({
      _id: user._id.toString(),
      email: user.email,
      username: user.username,
      role: user.role,
    });

    const refreshToken = generateRefreshToken(user._id.toString());
    user.refreshToken = refreshToken;
    await user.save();

    setRefreshCookie(res, refreshToken);

    res.status(200).json({
      accessToken,
      user: {
        id: user._id.toString(),
        email: user.email,
        username: user.username,
        role: user.role,
      },
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

// ─── Refresh Token ───────────────────────────────────────────────────────────

export const refresh = async (req: Request, res: Response): Promise<void> => {
  try {
    const token = req.cookies?.refreshToken;

    if (!token) {
      res.status(401).json({ message: 'No refresh token' });
      return;
    }

    const decoded = jwt.verify(
      token,
      process.env.JWT_REFRESH_SECRET as string
    ) as { userId: string };

    const user = await User.findById(decoded.userId);

    if (!user || user.refreshToken !== token) {
      res.status(403).json({ message: 'Invalid refresh token' });
      return;
    }

    const accessToken = generateAccessToken({
      _id: user._id.toString(),
      email: user.email,
      username: user.username,
      role: user.role,
    });

    res.status(200).json({ accessToken });
  } catch (error) {
    res.status(403).json({ message: 'Invalid or expired refresh token' });
  }
};

// ─── Logout ──────────────────────────────────────────────────────────────────

export const logout = async (req: Request, res: Response): Promise<void> => {
  try {
    const token = req.cookies?.refreshToken;

    if (token) {
      const user = await User.findOne({ refreshToken: token });
      if (user) {
        user.refreshToken = undefined;
        await user.save();
      }
    }

    res.clearCookie('refreshToken');
    res.status(200).json({ message: 'Logged out successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Internal server error' });
  }
};

// ─── GitHub OAuth ─────────────────────────────────────────────────────────────

export const githubCallback = async (req: Request, res: Response): Promise<void> => {
  try {
    const { code } = req.query;

    if (!code) {
      res.redirect(`${process.env.FRONTEND_URL}/login?error=no_code`);
      return;
    }

    const tokenResponse = await axios.post(
      'https://github.com/login/oauth/access_token',
      {
        client_id: process.env.GITHUB_CLIENT_ID,
        client_secret: process.env.GITHUB_CLIENT_SECRET,
        code,
      },
      { headers: { Accept: 'application/json' } }
    );

    const githubAccessToken = tokenResponse.data.access_token;

    const userResponse = await axios.get('https://api.github.com/user', {
      headers: { Authorization: `Bearer ${githubAccessToken}` },
    });

    const githubUser = userResponse.data;

    let email = githubUser.email;
    if (!email) {
      const emailResponse = await axios.get(
        'https://api.github.com/user/emails',
        { headers: { Authorization: `Bearer ${githubAccessToken}` } }
      );
      const primaryEmail = emailResponse.data.find(
        (e: { primary: boolean; email: string }) => e.primary
      );
      email = primaryEmail?.email;
    }

    if (!email) {
      res.redirect(`${process.env.FRONTEND_URL}/login?error=no_email`);
      return;
    }

    let user = await User.findOne({ githubId: githubUser.id.toString() });
    if (!user) user = await User.findOne({ email });
    if (!user) {
      user = await User.create({
        email,
        username: githubUser.login,
        githubId: githubUser.id.toString(),
        role: 'member',
      });
    } else {
      if (!user.githubId) {
        user.githubId = githubUser.id.toString();
        await user.save();
      }
    }

    const accessToken = generateAccessToken({
      _id: user._id.toString(),
      email: user.email,
      username: user.username,
      role: user.role,
    });

    const refreshToken = generateRefreshToken(user._id.toString());
    user.refreshToken = refreshToken;
    await user.save();

    setRefreshCookie(res, refreshToken);

    res.redirect(
      `${process.env.FRONTEND_URL}/auth/callback?token=${accessToken}`
    );
  } catch (error) {
    console.error('GitHub OAuth error:', error);
    res.redirect(`${process.env.FRONTEND_URL}/login?error=oauth_failed`);
  }
};

// ─── Get current user ─────────────────────────────────────────────────────────

export const getMe = async (req: Request, res: Response): Promise<void> => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith('Bearer ')) {
      res.status(401).json({ message: 'Unauthorized' });
      return;
    }

    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(
      token,
      process.env.JWT_SECRET as string
    ) as { userId: string };

    const user = await User.findById(decoded.userId).select('-password -refreshToken');
    if (!user) {
      res.status(404).json({ message: 'User not found' });
      return;
    }

    res.status(200).json({
      user: {
        id: user._id.toString(),
        email: user.email,
        username: user.username,
        role: user.role,
      },
    });
  } catch (error) {
    res.status(401).json({ message: 'Invalid token' });
  }
};

// ─── Get all users ────────────────────────────────────────────────────────────

export const getUsers = async (req: Request, res: Response): Promise<void> => {
  try {
    const users = await User.find().select('-password -refreshToken');
    const mappedUsers = users.map((u) => ({
      id: u._id.toString(),
      email: u.email,
      username: u.username,
      role: u.role,
    }));
    res.status(200).json({ users: mappedUsers });
  } catch (error) {
    res.status(500).json({ message: 'Internal server error' });
  }
};

// ─── Update user role ─────────────────────────────────────────────────────────

export const updateUserRole = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { role } = req.body;

    if (!['manager', 'member', 'viewer'].includes(role)) {
      res.status(400).json({ message: 'Invalid role' });
      return;
    }

    const authHeader = req.headers.authorization;
    const token = authHeader?.split(' ')[1];
    const decoded = jwt.verify(
      token as string,
      process.env.JWT_SECRET as string
    ) as { userId: string; role: string };

    if (decoded.userId === id) {
      res.status(403).json({ message: 'Cannot change your own role' });
      return;
    }

    const user = await User.findByIdAndUpdate(
      id,
      { role },
      { new: true }
    ).select('-password -refreshToken');

    if (!user) {
      res.status(404).json({ message: 'User not found' });
      return;
    }

    res.status(200).json({
      user: {
        id: user._id.toString(),
        email: user.email,
        username: user.username,
        role: user.role,
      },
    });
  } catch (error) {
    res.status(500).json({ message: 'Internal server error' });
  }
};