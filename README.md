<div align="center">
  <img src="frontend/public/favicon.svg" alt="Jots Logo" width="80" />
  <h1 align="center">Jots</h1>
  <p align="center">
    <strong>A premium, lightning-fast, and secure note-taking application.</strong>
  </p>
</div>

<br />

Jots is a modern, full-stack web application designed for seamless note management. With a stunning user interface, powerful organization tools, and enterprise-grade security, it provides everything you need to capture your thoughts without friction.

## ✨ Features

- 🔐 **Bulletproof Authentication:** Secure JWT-based authentication with automatic token refreshing and brute-force protection (`django-axes`).
- 📝 **Rich Note Management:** Create, read, update, and delete notes instantly.
- 🎨 **Premium Aesthetics:** Built with TailwindCSS featuring dynamic micro-animations, glassmorphism, and seamless Light/Dark mode transitions.
- 🏷️ **Tagging System:** Organize notes effortlessly with dynamic tagging and instant filtering.
- 🤝 **Secure Sharing:** Share notes with colleagues using password-protected links and fine-grained access controls.
- 🗑️ **Trash & Recovery:** Accidentally deleted something? Recover it from the Trash bin before it gets permanently purged.
- 📱 **Fully Responsive:** A beautiful experience on desktop, tablet, and mobile browsers.

## 🛠️ Tech Stack

**Frontend**
- React 18
- Vite
- TailwindCSS
- React Router DOM
- Axios

**Backend**
- Python 3.12+
- Django 5.0
- Django REST Framework (DRF)
- SimpleJWT (JSON Web Tokens)
- PostgreSQL (Production) / SQLite (Development)

**Infrastructure**
- **Vercel** (Frontend Hosting)
- **Render** (Native Python Web Service & Managed PostgreSQL Database)

## 🚀 Local Development

Follow these steps to run Jots locally on your machine.

### 1. Clone the Repository
```bash
git clone https://github.com/yourusername/jots.git
cd jots
```

### 2. Backend Setup
```bash
# Create and activate a virtual environment
python -m venv venv
source venv/Scripts/activate  # On Windows

# Install dependencies
pip install -r requirements.txt

# Run database migrations
python manage.py migrate

# Start the development server
python manage.py runserver
```
*The backend will be available at `http://localhost:8000`.*

### 3. Frontend Setup
Open a new terminal window:
```bash
cd frontend

# Install dependencies
npm install

# Start the development server
npm run dev
```
*The frontend will be available at `http://localhost:5173`.*

## 🌍 Production Deployment

Jots is fully configured for zero-downtime deployments via Vercel and Render. The project completely avoids heavy Docker containers in favor of blazing-fast native deployments.

For detailed deployment instructions, please refer to the included [DEPLOYMENT_GUIDE.md](./DEPLOYMENT_GUIDE.md).

## 🛡️ Security Features
- **CORS Protection:** Strictly locked down to the frontend origin.
- **Brute Force Defense:** `django-axes` permanently locks out IPs/accounts after 5 failed login attempts to prevent dictionary attacks.
- **Password Policies:** Django's native robust password validators enforce minimum complexity on all user accounts.
- **Encrypted Sharing:** Shared note passwords are mathematically hashed before entering the database.

---
*Built with ❤️ for elegant note-taking.*
