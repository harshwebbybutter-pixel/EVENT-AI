# Evenuefy 2.0

AI-powered event management SaaS platform.

---

## Prerequisites

Install these on the new machine before anything else:

- Python 3.10+
- Node.js 18+
- PostgreSQL 14+
- Git

---

## Setup on a New Machine

### 1. Clone the repo

```bash
git clone https://github.com/YOUR_USERNAME/event_ai.git
cd event_ai
```

### 2. Backend setup

```bash
cd backend

# Create virtual environment
python -m venv venv

# Activate it
# Windows:
venv\Scripts\activate
# Mac/Linux:
source venv/bin/activate

# Install dependencies
pip install -r ../requirements.txt

# Copy env file and fill in your values
cp .env.example .env
# Edit .env with your DB password, Groq API key, etc.
```

### 3. Create the PostgreSQL database

Open pgAdmin or psql and run:

```sql
CREATE DATABASE evenuefy;
```

Then run migrations from inside `backend/app/`:

```bash
cd app
python -m alembic upgrade head
```

Also run this to add the submissions column:

```sql
ALTER TABLE registration_forms ADD COLUMN IF NOT EXISTS submissions JSONB DEFAULT '[]';
```

### 4. Frontend setup

```bash
cd frontend

# Install dependencies
npm install

# Copy env file
cp .env.example .env.local
# Edit .env.local — set NEXT_PUBLIC_API_URL=http://localhost:8000/api/v1
```

### 5. Run both servers

**Backend** (from `backend/` folder):
```bash
python -m uvicorn app.main:app --reload
# Runs at http://localhost:8000
```

**Frontend** (from `frontend/` folder):
```bash
npm run dev
# Runs at http://localhost:3000
```

---

## Seed the database

After running migrations, seed a test user in pgAdmin:

```sql
INSERT INTO organizations (id, name, slug, email)
VALUES (
    gen_random_uuid(),
    'Test Org',
    'test-org-001',
    'admin@test.com'
);

-- Then sign up normally via http://localhost:3000/signup
```

Or just go to `http://localhost:3000/signup` and create an account directly.

---

## Environment Variables

| File | Purpose |
|---|---|
| `backend/.env` | DB URL, API keys, secrets |
| `frontend/.env.local` | Backend API URL |

Never commit either of these files. They are in `.gitignore`.

---

## Project Structure

See `BACKEND_ARCHITECTURE.md` and `FRONTEND_ARCHITECTURE.md` for full documentation.
