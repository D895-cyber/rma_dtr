# CRM Backend API

Backend API for the Full-Stack CRM Application built with Node.js, Express, TypeScript, Prisma, and PostgreSQL.

## 🚀 Quick Start

### Prerequisites

- Node.js 18+ and npm
- PostgreSQL 14+ installed and running
- Git

### Installation

```bash
# 1. Install dependencies
npm install

# 2. Setup environment variables
cp .env.example .env
# Edit .env with your database credentials

# 3. Generate Prisma Client
npm run prisma:generate

# 4. Run database migrations
npm run prisma:migrate

# 5. Start development server
npm run dev
```

The API will be available at `http://localhost:5000`

## 📋 Available Scripts

- `npm run dev` - Start development server with hot reload
- `npm run build` - Build for production
- `npm start` - Start production server
- `npm run prisma:generate` - Generate Prisma Client
- `npm run prisma:migrate` - Run database migrations
- `npm run prisma:studio` - Open Prisma Studio (database GUI)
- `npm run import:excel` - Import data from Excel files

## 🗄️ Database Setup

### Option 1: Local PostgreSQL

```bash
# Install PostgreSQL (macOS)
brew install postgresql@14
brew services start postgresql@14

# Create database
createdb crm_db

# Update .env
DATABASE_URL="postgresql://username:password@localhost:5432/crm_db"
```

### Option 2: Railway (Free Hosting)

1. Go to [railway.app](https://railway.app)
2. Create new project → Add PostgreSQL
3. Copy connection string to `.env`

### Option 3: Supabase (Free Tier)

1. Go to [supabase.com](https://supabase.com)
2. Create new project
3. Go to Settings → Database → Connection String
4. Copy to `.env`

## 🔌 API Endpoints

### Authentication

- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - Login
- `GET /api/auth/me` - Get current user

### Users

- `GET /api/users` - Get all users
- `GET /api/users/engineers` - Get engineers list
- `GET /api/users/:id` - Get user by ID
- `POST /api/users` - Create user (admin only)
- `PUT /api/users/:id` - Update user
- `DELETE /api/users/:id` - Delete user (admin only)

### Master Data

#### Sites
- `GET /api/master-data/sites` - Get all sites
- `GET /api/master-data/sites/:id` - Get site by ID
- `POST /api/master-data/sites` - Create site
- `PUT /api/master-data/sites/:id` - Update site
- `DELETE /api/master-data/sites/:id` - Delete site

#### Audis
- `GET /api/master-data/audis` - Get all audis
- `GET /api/master-data/audis/:id` - Get audi by ID
- `POST /api/master-data/audis` - Create audi
- `PUT /api/master-data/audis/:id` - Update audi
- `DELETE /api/master-data/audis/:id` - Delete audi

#### Projectors
- `GET /api/master-data/projectors` - Get all projectors
- `GET /api/master-data/projectors/:id` - Get projector by ID
- `POST /api/master-data/projectors` - Create projector
- `PUT /api/master-data/projectors/:id` - Update projector
- `DELETE /api/master-data/projectors/:id` - Delete projector

## 🔒 Authentication

All API requests (except `/auth/register` and `/auth/login`) require authentication using JWT.

Include the token in the Authorization header:

```
Authorization: Bearer <your-jwt-token>
```

## 📊 Database Schema

See `prisma/schema.prisma` for complete database schema.

### Key Entities

- **User** - System users (staff, engineer, manager, admin)
- **Site** - Client locations
- **Projector** - Projector devices
- **Audi** - Connects Site → Projector
- **DtrCase** - Daily Trouble Report cases
- **RmaCase** - Return Merchandise Authorization cases
- **AuditLog** - Case activity history
- **Notification** - User notifications

## 🔧 Environment Variables

```env
DATABASE_URL="postgresql://..."
JWT_SECRET="your-secret-key-min-32-chars"
JWT_EXPIRES_IN="7d"
PORT=5000
NODE_ENV="development"
FRONTEND_URL="http://localhost:3000"
```

## 📦 Tech Stack

- **Runtime:** Node.js 20+
- **Framework:** Express.js
- **Language:** TypeScript
- **Database:** PostgreSQL
- **ORM:** Prisma
- **Authentication:** JWT
- **Security:** Helmet, CORS, Rate Limiting
- **Logging:** Morgan

## 🎯 Implementation Status

1. ✅ Backend structure created
2. ✅ DTR and RMA controllers implemented
3. ✅ Notification controller implemented
4. ✅ Analytics controller implemented
5. ⏳ Import Excel data
6. ⏳ Connect frontend to backend

## 📝 License

MIT

