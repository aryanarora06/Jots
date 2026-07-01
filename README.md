<div align="center">
  <img src="frontend/public/favicon.svg" alt="Jots Logo" width="80" />
  <h1 align="center">Jots</h1>
  <p align="center">
    <strong>A premium, lightning-fast, and secure note-taking application.</strong>
  </p>
</div>

<br />

Jots is a modern, full-stack web application designed for seamless note management. With a stunning user interface, powerful organization tools, and enterprise-grade security, it provides everything you need to capture your thoughts without friction.

## Features

- **Knowledge Graph and Wikilinks:** Connect your ideas using bidirectional wikilinks ([[Note Title]]) and visualize your knowledge base with an interactive 2D graph view.
- **Offline-First PWA:** Built as a Progressive Web App (PWA) with full offline support. It caches data using IndexedDB and queues actions (create, update, delete) to sync seamlessly when you are back online.
- **Rich Note Management:** Create and edit notes using a powerful Markdown editor (MDXEditor) with support for image uploads and inline formatting.
- **Bulletproof Authentication:** Secure JWT-based authentication with automatic token refreshing. It features Google OAuth integration and brute-force protection via django-axes.
- **Premium Aesthetics:** Built with TailwindCSS and Framer Motion, featuring dynamic micro-animations, glassmorphism, and seamless Light/Dark mode transitions.
- **Tagging System:** Organize notes effortlessly with dynamic tagging, instant filtering, and full-text search capabilities using fuzzysort.
- **Secure Sharing:** Share notes with colleagues using shareable links and optional password protection. Shared note passwords are mathematically hashed.
- **Trash and Recovery:** Accidentally deleted something? Recover it from the Trash bin before it gets permanently purged (30-day retention).
- **Fully Responsive:** A beautiful and consistent experience on desktop, tablet, and mobile browsers.

## Tech Stack

**Frontend**
- React 19
- Vite and Vite PWA Plugin
- TailwindCSS v4
- Framer Motion
- React Router DOM
- MDXEditor and React Markdown
- React Force Graph 2D
- Axios and IDB (IndexedDB)

**Backend**
- Python 3.12+
- Django 5.0
- Django REST Framework (DRF)
- SimpleJWT (JSON Web Tokens)
- Google Auth (OAuth2)
- PostgreSQL (Production) / SQLite (Development)

**Infrastructure**
- **Vercel** (Frontend Hosting)
- **Render** (Native Python Web Service & Managed PostgreSQL Database)

## Local Development

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

## Production Deployment

Jots is fully configured for zero-downtime deployments via Vercel and Render. The project completely avoids heavy Docker containers in favor of blazing-fast native deployments.

## Security Features
- **CORS Protection:** Strictly locked down to the frontend origin.
- **Brute Force Defense:** django-axes permanently locks out IPs/accounts after 5 failed login attempts to prevent dictionary attacks.
- **Password Policies:** Django's native robust password validators enforce minimum complexity on all user accounts.
- **Encrypted Sharing:** Shared note passwords are mathematically hashed before entering the database.

---
*Built for elegant note-taking.*
