# Full-Stack CRM Application (RMA & DTR)

A comprehensive CRM application for managing Return Merchandise Authorization (RMA) and Daily Trouble Report (DTR) cases. The original project design is available at https://www.figma.com/design/WnYcbfGnztrhHcacyBBWSg/Full-Stack-CRM-Application.

## Features

- **RMA Case Management**: Track and manage RMA cases with full workflow support
- **DTR Case Management**: Handle Daily Trouble Reports with assignment and tracking
- **Master Data Management**: Manage sites, projectors, audis, and parts
- **User Management**: Role-based access control (Staff, Engineer, Manager, Admin)
- **Analytics Dashboard**: Real-time statistics and insights
- **Notifications**: Real-time notifications for case assignments and updates

## Quick Start

### Installation

```bash
# Install dependencies
npm install

# Install backend dependencies
cd backend && npm install
```

### Development

```bash
# Start frontend development server
npm run dev

# Start backend server (in another terminal)
cd backend && npm run dev
```

## Production Deployment

This application is configured for deployment on Vercel. See [VERCEL_DEPLOYMENT.md](./VERCEL_DEPLOYMENT.md) for detailed deployment instructions.

### Quick Deployment Checklist

1. Set up PostgreSQL database (Railway, Neon, or Supabase)
2. Configure environment variables in Vercel
3. Deploy to Vercel
4. Run database migrations
5. Verify deployment

For more details, see [DEPLOYMENT_CHECKLIST.md](./DEPLOYMENT_CHECKLIST.md).

## Documentation

- [Deployment Guide](./VERCEL_DEPLOYMENT.md) - Complete Vercel deployment guide
- [Deployment Checklist](./DEPLOYMENT_CHECKLIST.md) - Pre-deployment verification
- [Backend README](./backend/README.md) - Backend API documentation
- [Quick Start Guide](./START_HERE.md) - Getting started guide

## Tech Stack

- **Frontend**: React, TypeScript, Vite, Tailwind CSS, Radix UI
- **Backend**: Node.js, Express, TypeScript, Prisma
- **Database**: PostgreSQL
- **Deployment**: Vercel (Serverless Functions)
# Force Vercel redeploy - Tue Jan  6 23:56:59 IST 2026
