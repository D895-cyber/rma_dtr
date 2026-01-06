# 🚀 Start Backend Server

## Quick Start

The backend server is **not currently running**. Here's how to start it:

### Option 1: Using npm (Recommended)

```bash
cd backend
npm run dev
```

### Option 2: Using nodemon directly

```bash
cd backend
npx nodemon src/server.ts
```

### Option 3: Using ts-node

```bash
cd backend
npx ts-node src/server.ts
```

---

## Expected Output

When the server starts successfully, you should see:

```
✅ Enhanced DATABASE_URL with connection pool parameters (limit: 50, timeout: 20)

🚀 CRM API Server is running!
📍 URL: http://localhost:5002
🌍 Environment: development
📊 Health check: http://localhost:5002/health

✅ Ready to accept requests!
```

---

## Port Configuration

The server will run on:
- **Port 5002** if `PORT=5002` is set in `backend/.env`
- **Port 5000** if no PORT is set (default)

To check/change the port:
1. Open `backend/.env`
2. Add or update: `PORT=5002`
3. Restart the server

---

## Troubleshooting

### Server won't start?

1. **Check Node.js version:**
   ```bash
   node --version  # Should be v16+ or v18+
   ```

2. **Install dependencies:**
   ```bash
   cd backend
   npm install
   ```

3. **Check database connection:**
   - Verify `DATABASE_URL` in `backend/.env`
   - Make sure database is accessible

4. **Check for port conflicts:**
   ```bash
   lsof -ti:5002  # Should return nothing if port is free
   ```

5. **Check Cloudinary credentials:**
   - Make sure `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET` are set in `backend/.env`

---

## Keep Server Running

The server will automatically restart when you make code changes (thanks to nodemon).

To stop the server, press `Ctrl+C` in the terminal.

---

## Verify Server is Running

Once started, test the health endpoint:

```bash
curl http://localhost:5002/health
```

Or open in browser: http://localhost:5002/health

You should see a JSON response with server status.

