# Production Deployment Guide

This guide describes how to deploy the Collaborative Task Management application (frontend and backend) to the internet using **Neon** (Postgres), **Render** (Express backend), and **Vercel** (Vite + React frontend).

---

## 🔐 Environment Variables

### Backend (set on Render)

| Variable | Description | Example / Default |
| :--- | :--- | :--- |
| `PORT` | The port the backend listens on (Render sets this dynamically). | `5000` |
| `DATABASE_URL` | The PostgreSQL database connection string from Neon. | `postgresql://user:password@ep-host.region.aws.neon.tech/dbname?sslmode=require` |
| `JWT_SECRET` | Secret key used for signing JWT authentication tokens. | *(Use a long random string)* |
| `FRONTEND_URL` | The URL of your deployed frontend (used for CORS security configuration). | `https://your-app.vercel.app` |

### Frontend (set on Vercel)

| Variable | Description | Example |
| :--- | :--- | :--- |
| `VITE_API_URL` | The URL of the deployed backend API. Must end with `/api`. | `https://your-backend.onrender.com/api` |

---

## 🚀 Backend Build & Deployment (Render)

- **Source Directory:** `backend`
- **Build Command:** `npm install && npx prisma generate`
- **Start Command:** `npm start` (runs `node src/server.js` from `package.json` scripts)
- **Database Migrations:** Before starting the app on production, run `npx prisma migrate deploy` to apply all pending database migrations without losing data.

---

## 🎨 Frontend Build & Deployment (Vercel)

- **Source Directory:** Root directory (`./`)
- **Build Command:** `npm run build` (runs `tsc -b && vite build` from `package.json` scripts)
- **Output Directory:** `dist`

---

## 🗺️ Step-by-Step Deployment Instructions

### Step 1: Create a PostgreSQL Database on Neon
1. Go to [Neon.tech](https://neon.tech/) and sign up for a free account.
2. Create a new project and select **PostgreSQL** as the database version.
3. Once created, copy the **Connection String** (choose the `Prisma` or standard URI format).
4. Save this string; it will be your `DATABASE_URL`.

### Step 2: Deploy the Backend on Render
1. Sign in to [Render](https://render.com/).
2. Click **New +** and select **Web Service**.
3. Connect your Git repository.
4. Set the following details:
   - **Name:** `collab-task-backend`
   - **Root Directory:** `backend`
   - **Environment:** `Node`
   - **Build Command:** `npm install && npx prisma generate`
   - **Start Command:** `npm start`
5. Click **Advanced** and add the following Environment Variables:
   - `DATABASE_URL`: *(Your Neon Connection String)*
   - `JWT_SECRET`: *(A secure random string)*
   - `FRONTEND_URL`: `http://localhost:5173` *(We will update this after Vercel deployment)*
6. Click **Deploy Web Service**.
7. Once deployed, note your service URL (e.g., `https://collab-task-backend.onrender.com`).

### Step 3: Deploy the Frontend on Vercel
1. Sign in to [Vercel](https://vercel.com/).
2. Click **Add New** > **Project** and import your Git repository.
3. Set the following settings:
   - **Framework Preset:** `Vite`
   - **Root Directory:** `./` (Leave as default root)
4. Open the **Environment Variables** section and add:
   - `VITE_API_URL`: `https://your-backend.onrender.com/api` *(Replace with your actual Render backend URL)*
5. Click **Deploy**.
6. Once completed, Vercel will provide your live frontend URL (e.g., `https://your-app.vercel.app`).

### Step 4: Update Backend CORS Configuration
1. Go back to your Render Dashboard for `collab-task-backend`.
2. Go to **Environment** settings.
3. Edit the `FRONTEND_URL` environment variable and change it from `http://localhost:5173` to your actual Vercel frontend URL (e.g., `https://your-app.vercel.app`).
4. Save the changes. Render will automatically redeploy the service with the updated environment.

---

## ✅ How to Verify the Deployment Works
1. **Check Backend Status:**
   Open a browser or run a GET request to `https://your-backend.onrender.com/api/health`. It should return:
   ```json
   { "status": "ok", "timestamp": "..." }
   ```
2. **Test User Flow:**
   - Go to your live Vercel frontend URL.
   - Click to switch to **Register** and create a new account.
   - Log in with the newly created credentials.
   - Create a workspace and project.
   - Add a task, change its status, reload the page, and confirm that the task persists.
