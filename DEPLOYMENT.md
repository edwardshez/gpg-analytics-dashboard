# Deploying the GPG Analytics Dashboard

Follow these steps to get your dashboard live on the internet using **Vercel** (Frontend) and **Render** (Backend).

## Phase 1: Backend Deployment (Render)
1. Sign up/Log in to [Render](https://render.com).
2. Click **New +** > **Web Service**.
3. Connect your GitHub repository.
4. Set the following:
   - **Name**: `gpg-analytics-backend`
   - **Root Directory**: `backend`
   - **Environment**: `Python 3`
   - **Build Command**: `pip install -r requirements.txt`
   - **Start Command**: `uvicorn main:app --host 0.0.0.0 --port $PORT`
5. Click **Deploy Web Service**.
6. **Copy the URL**: Once deployed, copy your backend URL (e.g., `https://gpg-backend.onrender.com`).

## Phase 2: Frontend Configuration
1. Open `frontend/vercel.json` in your code.
2. Replace `YOUR-RENDER-BACKEND-URL.onrender.com` with the actual URL you copied from Render.
3. Save the file and push the changes to GitHub.

## Phase 3: Frontend Deployment (Vercel)
1. Sign up/Log in to [Vercel](https://vercel.com).
2. Click **Add New** > **Project**.
3. Import your GitHub repository.
4. Set the following:
   - **Root Directory**: `frontend`
   - **Framework Preset**: `Vite`
5. Click **Deploy**.

---

### Why this setup?
- **Cost**: Both platforms have generous free tiers.
- **Speed**: Vercel provides a global CDN for a fast UI experience.
- **Ease**: Both platforms auto-deploy whenever you push code to GitHub.

> [!TIP]
> Make sure your `backend/main.py` has the database file in the expected path relative to the app. I have already configured the paths to be robust for deployment.
