import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import dotenv from 'dotenv';

dotenv.config();

const MONGODB_URI = process.env.MONGODB_URI as string;

// ─── User Schema ──────────────────────────────────────────────────────────────
const UserSchema = new mongoose.Schema({
  email: String,
  username: String,
  password: String,
  role: String,
  githubId: String,
  refreshToken: String,
}, { timestamps: true });

const User = mongoose.model('User', UserSchema);

// ─── Task Schema ──────────────────────────────────────────────────────────────
const TaskSchema = new mongoose.Schema({
  title: String,
  description: String,
  status: String,
  priority: String,
  assignee: String,
  dueDate: Date,
  createdBy: String,
}, { timestamps: true });

const Task = mongoose.model('Task', TaskSchema);

// ─── Seed ─────────────────────────────────────────────────────────────────────
const seed = async () => {
  await mongoose.connect(MONGODB_URI);
  console.log('Connected to MongoDB');

  // Clear existing data
  await User.deleteMany({});
  await Task.deleteMany({});
  console.log('Cleared existing data');

  // Create users
  const managerPassword = await bcrypt.hash('Manager@2025!', 10);
  const memberPassword  = await bcrypt.hash('Member@2025!', 10);
  const viewerPassword  = await bcrypt.hash('Viewer@2025!', 10);

  const manager = await User.create({
    email: 'manager@taskflow.dev',
    username: 'manager',
    password: managerPassword,
    role: 'manager',
  });

  const member = await User.create({
    email: 'member@taskflow.dev',
    username: 'member',
    password: memberPassword,
    role: 'member',
  });

  const viewer = await User.create({
    email: 'viewer@taskflow.dev',
    username: 'viewer',
    password: viewerPassword,
    role: 'viewer',
  });

  console.log('✅ Users created');

  // Create 8 tasks
  await Task.create([
    {
      title: 'Set up project repository',
      description: 'Initialize the GitHub repo and set up branch protection rules.',
      status: 'Done',
      priority: 'High',
      assignee: member._id.toString(),
      createdBy: manager._id.toString(),
      dueDate: new Date('2025-01-10'),
    },
    {
      title: 'Design database schema',
      description: 'Plan out the MongoDB collections and relationships.',
      status: 'Done',
      priority: 'High',
      assignee: member._id.toString(),
      createdBy: manager._id.toString(),
      dueDate: new Date('2025-01-15'),
    },
    {
      title: 'Build authentication service',
      description: 'Implement JWT-based auth with refresh tokens and GitHub OAuth.',
      status: 'Done',
      priority: 'High',
      assignee: member._id.toString(),
      createdBy: member._id.toString(),
      dueDate: new Date('2025-01-20'),
    },
    {
      title: 'Implement RBAC middleware',
      description: 'Write the authorize() middleware for role-based access control.',
      status: 'In Progress',
      priority: 'High',
      assignee: member._id.toString(),
      createdBy: member._id.toString(),
      dueDate: new Date('2025-02-01'),
    },
    {
      title: 'Build task management API',
      description: 'CRUD endpoints for tasks with proper validation.',
      status: 'In Progress',
      priority: 'Medium',
      assignee: member._id.toString(),
      createdBy: manager._id.toString(),
      dueDate: new Date('2025-02-05'),
    },
    {
      title: 'Design frontend UI',
      description: 'Create wireframes and implement the Next.js frontend with Tailwind.',
      status: 'In Progress',
      priority: 'Medium',
      assignee: viewer._id.toString(),
      createdBy: manager._id.toString(),
      dueDate: new Date('2025-02-10'),
    },
    {
      title: 'Write unit tests',
      description: 'Add tests for all API endpoints and middleware.',
      status: 'Todo',
      priority: 'Medium',
      assignee: member._id.toString(),
      createdBy: manager._id.toString(),
      dueDate: new Date('2025-02-15'),
    },
    {
      title: 'Deploy to production',
      description: 'Set up CI/CD pipeline and deploy all services.',
      status: 'Todo',
      priority: 'Low',
      assignee: manager._id.toString(),
      createdBy: manager._id.toString(),
      dueDate: new Date('2025-03-01'),
    },
  ]);

  console.log('Tasks created');
  console.log('');
  console.log('─────────────────────────────────────');
  console.log('Test Accounts:');
  console.log('─────────────────────────────────────');
  console.log('Manager: manager@taskflow.dev / Manager@2025!');
  console.log('Member:  member@taskflow.dev  / Member@2025!');
  console.log('Viewer:  viewer@taskflow.dev  / Viewer@2025!');
  console.log('─────────────────────────────────────');

  await mongoose.disconnect();
  console.log('Done! ');
};

seed().catch(console.error);