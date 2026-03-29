import { Router } from 'express';
import {
  register,
  login,
  refresh,
  logout,
  githubCallback,
  getMe,
  getUsers,
  updateUserRole,
} from '../controllers/authController';

const router = Router();

// ─── Auth Routes ─────────────────────────────────────────────────────────────
router.post('/register', register);
router.post('/login', login);
router.post('/refresh', refresh);
router.post('/logout', logout);
router.get('/me', getMe);

// ─── GitHub OAuth ─────────────────────────────────────────────────────────────
router.get('/github', (req, res) => {
  const url = `https://github.com/login/oauth/authorize?client_id=${process.env.GITHUB_CLIENT_ID}&scope=user:email`;
  res.redirect(url);
});
router.get('/github/callback', githubCallback);

// ─── User Management ──────────────────────────────────────────────────────────
router.get('/users', getUsers);
router.patch('/users/:id/role', updateUserRole);

export default router;