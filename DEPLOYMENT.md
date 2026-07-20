# Vercel Deployment Guide

This repository is pre-configured for seamless deployment to **Vercel** as a Node.js / Express Serverless Function API.

---

## 1. Environment Variables Required on Vercel

Before deploying, configure the following Environment Variables in your Vercel Project Dashboard (**Project Settings -> Environment Variables**):

| Variable | Description | Example Value |
| :--- | :--- | :--- |
| `MONGO_URI` | MongoDB Atlas Connection String | `mongodb+srv://user:password@cluster.mongodb.net/personal_finance_tracker` |
| `JWT_SECRET` | Secret key used to sign JWT authentication tokens | `your_super_secret_jwt_key_here` |
| `NODE_ENV` | Environment mode | `production` |

---

## 2. Deploying via Vercel CLI (Command Line)

### Deploying the Root Repository
1. Install Vercel CLI globally (if not already installed):
   ```bash
   npm install -g vercel
   ```
2. Run the deployment command from the project root:
   ```bash
   vercel
   ```
3. For Production release:
   ```bash
   vercel --prod
   ```

### Deploying Backend Directory Separately
If you wish to deploy only the backend service:
```bash
cd backend
vercel --prod
```

---

## 3. Deploying via GitHub Integration on Vercel Dashboard

1. Push your repository to GitHub (`main` branch).
2. Go to [Vercel Dashboard](https://vercel.com/new).
3. Select **Import Repository** and select `personal-finance-tracker`.
4. Configure Project:
   * **Framework Preset**: Other
   * **Root Directory**: `./` (or `backend` if deploying API separately)
   * **Environment Variables**: Add `MONGO_URI`, `JWT_SECRET`, and `NODE_ENV`.
5. Click **Deploy**.

---

## 4. Connecting Expo Client to Production Vercel API

Once your Vercel deployment completes, copy your live API domain URL (e.g. `https://personal-finance-tracker-api.vercel.app`).

Update your client `.env` or set `EXPO_PUBLIC_API_URL` in [client/services/api.ts](file:///Users/maegbug/ai_project/personal_finance_tracker/client/services/api.ts):
```text
EXPO_PUBLIC_API_URL=https://personal-finance-tracker-api.vercel.app
```
