# The Foolproof Jots Deployment Guide 🚀

Your codebase is exactly configured for a Vercel (Frontend) and Render (Backend + Database) architecture. Follow this guide step-by-step.

> **CRITICAL FIRST STEP:** 
> Before you begin anything below, make sure you have committed all of your files and pushed them to your GitHub repository!

---

## 🟢 PHASE 1: Deploy the Database (Render)

1. Sign into [Render.com](https://render.com).
2. In the top right, click **New +** and select **PostgreSQL**.
3. Fill out the details:
   - **Name:** `jots-db` (or anything you prefer).
   - **Region:** Choose whatever is closest to you.
   - **Instance Type:** Select **Free**.
4. Click **Create Database**.
5. Your database will begin provisioning. Once it's ready, scroll down to the **Connections** section and copy the **Internal Database URL** (it should look something like `postgres://user:password@hostname/dbname`). Save this somewhere temporarily.

---

## 🔵 PHASE 2: Deploy the Backend API (Render)

1. On Render, click **New +** and select **Web Service**.
2. Connect your GitHub account (if you haven't already) and select your Jots repository.
3. Configure the deployment settings exactly as follows:
   - **Name:** `jots-backend` (this determines your URL, e.g., `jots-backend.onrender.com`).
   - **Language:** `Python 3`.
   - **Branch:** `main`.
   - **Root Directory:** *(leave this completely blank!)*.
   - **Build Command:** `bash build.sh` *(Using 'bash' ensures it runs perfectly even if Windows Git stripped the executable permissions from the script)*.
   - **Start Command:** `gunicorn notes_project.wsgi:application --bind 0.0.0.0:$PORT`.
   - **Instance Type:** Select **Free**.

4. Scroll down to **Advanced** and click **Add Environment Variable**. Add the following exactly:
   - `PYTHON_VERSION` : `3.12.0` *(CRITICAL: Forces Render to use modern Python compatible with Django 5)*.
   - `DATABASE_URL` : *(Paste the Internal Database URL you copied in Phase 1)*.
   - `DEBUG` : `False`.
   - `SECRET_KEY` : *(Type a long, random string of letters/numbers. Do not use spaces)*.
   - `ALLOWED_HOSTS` : `jots-backend.onrender.com` *(Replace this with whatever your backend URL ends up being, no `https://` prefix)*.

> **DO NOT** add `CORS_ALLOWED_ORIGINS` or `CSRF_TRUSTED_ORIGINS` yet. We will do this later!

5. Click **Create Web Service**. 
6. Wait about 5-10 minutes. Watch the logs to ensure it successfully collects static files and runs database migrations. 
7. Once the service is live, **copy your backend URL** from the top left (e.g., `https://jots-backend.onrender.com`).

---

## 🟣 PHASE 3: Deploy the Frontend (Vercel)

1. Sign into [Vercel.com](https://vercel.com).
2. Click **Add New...** -> **Project**.
3. Import your GitHub repository.
4. On the configuration screen, Vercel will automatically detect `Vite`.
5. Under **Root Directory**, click **Edit** and select the `frontend` folder.
6. Open the **Environment Variables** section and add exactly one variable:
   - **Name:** `VITE_API_BASE_URL`
   - **Value:** *(Paste your backend URL from Phase 2, e.g., `https://jots-backend.onrender.com`. Ensure there is NO trailing slash at the end!)*
7. Click **Deploy**.
8. Once the build finishes (usually ~1 minute), **copy your shiny new frontend URL** (e.g., `https://jots.vercel.app`).

---

## 🟡 PHASE 4: Link Them Together (CORS)

Right now, if you visit your Vercel site, it will fail to log in. This is a security feature! Render is actively blocking Vercel from talking to it. We need to tell Render that Vercel is a trusted friend.

1. Go back to your [Render Dashboard](https://dashboard.render.com) and click on your **jots-backend** Web Service.
2. On the left sidebar, click **Environment**.
3. Add two new environment variables:
   - **Name:** `CORS_ALLOWED_ORIGINS` | **Value:** *(Paste your Vercel URL, e.g., `https://jots.vercel.app`)*
   - **Name:** `CSRF_TRUSTED_ORIGINS` | **Value:** *(Paste your Vercel URL, e.g., `https://jots.vercel.app`)*
   
> **WARNING:** Ensure there is **NO trailing slash** at the end of your Vercel URLs here. (It should be `https://jots.vercel.app`, NOT `https://jots.vercel.app/`).

4. Click **Save Changes**. Render will automatically begin restarting your backend to apply the new security rules.

---

## 🔐 PHASE 5: Create Your Admin Account

Because the Free tier of Render doesn't provide shell access, we've updated `build.sh` to automatically create your admin account for you using environment variables!

1. Go back to your Render backend dashboard and click **Environment**.
2. Add the following three variables:
   - `DJANGO_SUPERUSER_USERNAME` : `admin` (or whatever username you want)
   - `DJANGO_SUPERUSER_EMAIL` : `admin@example.com`
   - `DJANGO_SUPERUSER_PASSWORD` : `your-secure-password123`
3. Click **Save Changes**.
4. To trigger the creation, Render might automatically restart. If not, click **Manual Deploy** -> **Deploy latest commit** in the top right corner.
5. Once the deploy finishes, your superuser is successfully created!
6. Go to `https://jots-backend.onrender.com/admin` and log in.

> **TIP:** For security, after you've successfully logged in, you should go back to Render and remove those three `DJANGO_SUPERUSER_` environment variables so your password isn't sitting in plain text in the settings. The account will remain permanently saved in the database!

**Congratulations! Your application is now fully deployed, secure, and live on the internet! 🎉**
