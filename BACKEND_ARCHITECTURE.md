# Evenuefy Backend Architecture
> FastAPI + PostgreSQL + LangGraph AI Pipeline  
> Every file explained with purpose, contents, dependencies, and future use.

---

## How a Request Flows End to End

```
Browser / Frontend
      │
      ▼
main.py  (FastAPI app — entry point)
      │
      ├── CORS Middleware  (allows frontend domain)
      ├── Static Files     (/static/qr/ serves QR images)
      │
      ▼
api/router.py  (combines all route groups)
      │
      ├── /api/v1/auth/*        → api/v1/auth.py
      ├── /api/v1/events/*      → api/v1/events.py
      ├── /api/v1/ai-setup/*    → api/v1/ai_setup.py
      └── /api/v1/public/*      → api/v1/attendees.py
```

---

## Real Example: Organizer Creates an Event

```
1. POST /api/v1/auth/signup
   → auth.py creates Organization + User → returns JWT token

2. POST /api/v1/ai-setup
   → ai_setup.py calls orchestrate_ai_setup()
   → services/ai_setup_service.py runs LangGraph pipeline
   → ai/graph.py: parse_intent → generate_event → generate_tickets
                  → generate_form → generate_email → validate_output
   → Each step calls ai/llm.py which hits Groq API
   → Returns: { event, tickets, form, confirmation_email }

3. POST /api/v1/events
   → events.py saves everything to PostgreSQL:
     - events table
     - tickets table
     - registration_forms table
     - email_templates table
     - audit_logs table
   → Returns: { event_id, status: "draft" }

4. POST /api/v1/events/{event_id}/publish
   → events.py calls qr_service.py
   → Generates short_code (e.g. "ce8b7c17")
   → Saves to registration_links table
   → Returns: { url: "http://localhost:3000/r/ce8b7c17", qr_code_url }

5. Attendee opens http://localhost:3000/r/ce8b7c17
   → GET /api/v1/public/events/ce8b7c17
   → attendees.py looks up registration_links → finds event_id
   → Loads event + tickets + registration_forms.schema
   → Returns all form fields to frontend

6. Attendee submits form
   → POST /api/v1/public/register
   → attendees.py appends submission to registration_forms.submissions JSONB
```

---

## File by File

---

### `app/main.py`
**The entry point. The entire app starts here.**

```python
app = FastAPI(title="Evenuefy 2.0 API")
app.add_middleware(CORSMiddleware, allow_origins=origins)
app.mount("/static/qr", StaticFiles(directory=uploads_path))
app.include_router(api_router, prefix="/api/v1")
```

**What it holds:**
- Creates the FastAPI application instance
- Registers CORS middleware — reads `CORS_ORIGINS` from `.env` so frontend at `localhost:3000` or `evenuefy.com` can call it
- Mounts `/static/qr/` so QR code PNG images saved in `./uploads/` are publicly accessible
- Registers all routes under `/api/v1` via `api_router`

**Why it matters:**
Every HTTP request hits this file first. If you ever add rate limiting, request logging, or authentication middleware globally, it goes here.

**Future use:**
- Add `app.add_middleware(RateLimitMiddleware)` for production
- Add Sentry error tracking: `sentry_sdk.init(...)`

---

### `app/database.py`
**The database connection. Every route that touches data depends on this.**

```python
engine = create_async_engine(settings.DATABASE_URL, pool_pre_ping=True)
AsyncSessionLocal = sessionmaker(bind=engine, class_=AsyncSession)
Base = declarative_base()

async def get_db():
    async with AsyncSessionLocal() as session:
        yield session
```

**What it holds:**
- `engine` — the async PostgreSQL connection pool
- `AsyncSessionLocal` — factory that creates database sessions
- `Base` — all SQLAlchemy models inherit from this, which is how they register their tables
- `get_db()` — a FastAPI dependency. Every route that needs the DB writes `db: AsyncSession = Depends(get_db)` and gets a fresh session

**Why it matters:**
Without this, no model can save data. `Base` is particularly critical — if a model doesn't inherit from `Base`, its table will never be created or migrated.

**Future use:**
- Add connection pool settings (`pool_size`, `max_overflow`) for high traffic
- Add read replica routing for analytics queries

---

### `app/core/config.py`
**All environment variables in one place. Nothing is hardcoded.**

```python
class Settings(BaseSettings):
    DATABASE_URL: str = "postgresql+asyncpg://..."
    SECRET_KEY: str = "..."
    GROQ_API_KEY: str
    APP_BASE_URL: str = "http://localhost:3000"
    CORS_ORIGINS: str = '["http://localhost:3000"]'
    STORAGE_PATH: str = "./uploads"

settings = Settings()  # singleton — imported everywhere
```

**What it holds:**
- Database URL, JWT secret, Groq API key, base URL, CORS origins, storage path
- Reads from `app/.env` file automatically via `SettingsConfigDict`
- `settings` is a singleton imported by `database.py`, `security.py`, `qr_service.py`, `deps.py`

**Why it matters:**
Change one `.env` value and the entire app picks it up. Swap from dev (`localhost:3000`) to production (`evenuefy.com`) by changing only `APP_BASE_URL` in the `.env` file.

**Future use:**
- Add `REDIS_URL`, `S3_BUCKET`, `SMTP_HOST` as you build those features
- Add `ENV: str = "dev"` checks to enable/disable debug features

---

### `app/core/security.py`
**JWT token creation.**

```python
def create_access_token(data: dict) -> str:
    # Adds expiry, signs with SECRET_KEY, returns JWT string
```

**What it holds:**
- `create_access_token()` — takes `{"sub": user_id, "org_id": org_id}`, adds expiry timestamp, signs with `SECRET_KEY` using HS256, returns a JWT string

**Why it matters:**
This token is what keeps organizers logged in. It contains `org_id` which is used by `tenant.py` to set the RLS context on every protected request.

**Used by:** `api/v1/auth.py`  
**Future use:** Add refresh tokens, token revocation list

---

### `app/api/router.py`
**The central switchboard. Connects all route files.**

```python
api_router.include_router(auth.router,      prefix="/auth")
api_router.include_router(events.router,    prefix="/events")
api_router.include_router(ai_setup.router,  prefix="/ai-setup")
api_router.include_router(attendees.router, prefix="/public")
```

**What it holds:**
- One `APIRouter` that combines all v1 sub-routers
- Each sub-router gets a prefix that becomes part of the URL

**Why it matters:**
Without this file, `main.py` would need to import every single route file individually. This is the single place to add or remove route groups.

**Future use:**
- Add `api/v2/` by creating a new router for version 2 routes

---

### `app/api/deps.py`
**The JWT guard. Protects every organizer route.**

```python
class CurrentUser(BaseModel):
    id: UUID
    org_id: UUID

async def get_current_user(credentials) -> CurrentUser:
    payload = jwt.decode(token, settings.SECRET_KEY)
    return CurrentUser(id=payload["sub"], org_id=payload["org_id"])
```

**What it holds:**
- `CurrentUser` — a simple model with just `id` and `org_id` extracted from the JWT
- `get_current_user()` — decodes and validates the Bearer token from the `Authorization` header

**Why it matters:**
Any route that writes `current_user: CurrentUser = Depends(get_current_user)` is automatically protected. If the token is missing, expired, or invalid, FastAPI returns 401 automatically before the route function even runs.

**Used by:** `auth.py`, `events.py`, `tenant.py`

---

### `app/middleware/tenant.py`
**Sets the RLS context for each database session.**

```python
async def set_tenant_context(current_user, db) -> UUID:
    await db.execute(
        text("SELECT set_config('app.current_org_id', :org_id, false)"),
        {"org_id": str(current_user.org_id)}
    )
    return current_user.org_id
```

**What it holds:**
- `set_tenant_context()` — sets a PostgreSQL session variable `app.current_org_id` to the logged-in user's org_id

**Why it matters:**
This is the application-level half of Row Level Security. Every protected route uses `org_id: UUID = Depends(set_tenant_context)`. This ensures:
1. The org_id in queries always comes from the verified JWT, never from user input
2. The session variable is set for database-level RLS policies (when you add them)

**Used by:** `events.py` on all three routes

---

### `app/api/v1/auth.py`
**Signup, login, and token generation.**

**Endpoints:**
- `POST /api/v1/auth/signup` — creates Organization + User, returns JWT
- `POST /api/v1/auth/login` — verifies password with bcrypt, returns JWT
- `POST /api/v1/auth/developer-login` — no password, dev only

**What it holds:**
- `SignupRequest` / `LoginRequest` — Pydantic schemas for request bodies
- `make_slug()` — converts "TechFest Surat" → "techfest-surat-a1b2c3"
- `token_response()` — builds the standard token + user info response
- Password hashing via `passlib.CryptContext` with bcrypt

**Example signup flow:**
```
POST /auth/signup
Body: { "full_name": "Harsh", "email": "h@x.com", "password": "abc", "org_name": "TechFest" }

→ Creates: organizations row (id=UUID-A, name="TechFest", slug="techfest-a1b2c3")
→ Creates: users row (id=UUID-B, org_id=UUID-A, role="owner")
→ Returns: { "access_token": "eyJ...", "org_id": "UUID-A", "user": {...} }
```

**Future use:** Add email verification, Google OAuth, password reset

---

### `app/api/v1/ai_setup.py`
**The AI generation endpoint.**

```python
@router.post("")
async def create_ai_setup(request: AISetupRequest):
    result_data = await orchestrate_ai_setup(request.prompt, request.org_id)
    return AISetupResponse(success=True, data=result_data)
```

**What it holds:**
- One endpoint that accepts `{ prompt, org_id }` and returns a full event draft
- Delegates all logic to `services/ai_setup_service.py`

**Example:**
```
POST /api/v1/ai-setup
Body: { "prompt": "3-day medical conference in Ahmedabad, 2000 doctors", "org_id": "UUID-A" }

→ Returns: {
    "event": { "name": "Ahmedabad Medical Summit 2025", "start_date": "2025-06-01", ... },
    "tickets": [{ "name": "Delegate", "price": 5000, "currency": "INR" }, ...],
    "form": { "schema": { "pages": [{ "fields": [...] }] } },
    "confirmation_email": { "subject": "...", "body_html": "..." }
  }
```

---

### `app/api/v1/events.py`
**Saves, publishes, and retrieves events.**

**Endpoints:**
- `POST /api/v1/events` — saves the AI-reviewed draft to all tables
- `POST /api/v1/events/{id}/publish` — generates short link + QR, sets status=published
- `GET /api/v1/events/{id}` — fetches full event with all relations

**What it holds:**
- All three endpoints use `Depends(set_tenant_context)` — tenant-isolated
- On save: creates Event, Tickets, RegistrationForm, EmailTemplate, AuditLog in one transaction
- On publish: calls `qr_service.py` to generate short_code and QR image, saves RegistrationLink

**Data saved on `POST /events`:**
```
events table          → 1 row
tickets table         → 2-3 rows  
registration_forms    → 1 row (with AI-generated schema JSONB)
email_templates       → 1 row
audit_logs            → 1 row (action: "event.created")
```

---

### `app/api/v1/attendees.py`
**The public-facing API. No authentication required.**

**Endpoints:**
- `GET /api/v1/public/events/{short_code}` — looks up event by short code, returns event info + all form fields
- `POST /api/v1/public/register` — saves form submission into `registration_forms.submissions`

**What it holds:**
- `RegistrationRequest` — Pydantic schema: event_id, ticket_id, full_name, email, answers
- Field type normalizer: converts "phone" → "tel", "dropdown" → "select" for HTML compatibility
- Submission appended to JSONB array — no separate attendees table needed

**Example submission stored:**
```json
{
  "id": "uuid",
  "full_name": "Ravi Sharma",
  "email": "ravi@example.com",
  "ticket_id": "uuid",
  "answers": { "college": "IIT Bombay", "year": "2nd" },
  "submitted_at": "2025-06-01T10:30:00"
}
```

---

### `app/models/` — Database Tables

Each file = one PostgreSQL table. All inherit from `Base` in `database.py`.

| File | Table | Purpose | Key Columns |
|---|---|---|---|
| `organization.py` | `organizations` | One per organizer/company. The tenant root. | `id`, `name`, `slug` |
| `user.py` | `users` | Organizer accounts. Belongs to one org. | `id`, `org_id`, `email`, `password_hash`, `role` |
| `event.py` | `events` | The central entity. Everything hangs off this. | `id`, `org_id`, `name`, `status`, `ai_generated` |
| `ticket.py` | `tickets` | 2-3 per event. Price in INR. | `id`, `event_id`, `name`, `price`, `currency` |
| `registration_form.py` | `registration_forms` | Stores field schema + all submissions. | `id`, `event_id`, `schema` (JSONB), `submissions` (JSONB) |
| `email_template.py` | `email_templates` | Confirmation email per event. | `id`, `event_id`, `subject`, `body_html` |
| `registration_link.py` | `registration_links` | Short link + QR per event. | `id`, `event_id`, `short_code`, `full_url`, `qr_code_url` |
| `audit_log.py` | `audit_logs` | Tracks every important action. | `id`, `org_id`, `event_id`, `action`, `details` |

**How models relate:**
```
organizations
    └── users (org_id → organizations.id)
    └── events (org_id → organizations.id)
            └── tickets
            └── registration_forms
            │       └── submissions[] (JSONB — no separate table)
            └── email_templates
            └── registration_links
            └── audit_logs
```

---

### `app/ai/graph.py`
**The LangGraph AI pipeline. 6 steps, runs in sequence.**

```
START
  → parse_intent      (extract: city, dates, audience, pricing hints)
  → generate_event    (create: name, slug, venue, dates)
  → generate_tickets  (create: 2-3 ticket types with INR pricing)
  → generate_form     (create: 2-4 custom form fields)
  → generate_email    (create: confirmation email HTML)
  → validate_output   (check: name exists, dates exist, ≥1 ticket, ≥4 fields)
END
```

**What it holds:**
- `AISetupState` TypedDict — the shared state object passed between all nodes
- Each node is an async function that receives state, calls the LLM, updates state, returns state
- `build_ai_setup_graph()` — compiles the graph and returns a runnable

**Why LangGraph instead of simple function calls:**
Each step can be retried independently, the state is inspectable at each node, and you can add conditional branching later (e.g. "if confidence < 0.6, re-run generate_event").

---

### `app/ai/prompts.py`
**All system prompts for the LLM in one place.**

```python
TICKET_PROMPT = """Generate 2-3 ticket types for an Indian event.
CRITICAL: Always use currency "INR". Never use USD."""
```

**What it holds:**
- `INTENT_PROMPT` — tells EVA to extract structured info from raw text
- `EVENT_PROMPT` — generates event details from extracted intent
- `TICKET_PROMPT` — generates tickets, enforces INR currency
- `FORM_PROMPT` — generates additional form fields
- `EMAIL_PROMPT` — generates confirmation email HTML

**Why in one file:**
Prompts are the most-tuned part of an AI product. Keeping them here means you can improve them without touching any Python logic.

---

### `app/services/ai_setup_service.py`
**Bridges the LangGraph output to the API schema.**

```python
async def orchestrate_ai_setup(prompt, org_id) -> dict:
    final_state = await ai_graph.ainvoke(initial_state)
    # Normalizes messy AI output → clean schema-compliant dict
    return { "event": ..., "tickets": ..., "form": ..., "confirmation_email": ... }
```

**What it holds:**
- `map_ai_fields()` — handles AI inconsistencies: sometimes it returns `"name"` instead of `"label"`, `"id"` instead of `"field_id"`. This normalizer fixes all of that.
- `orchestrate_ai_setup()` — runs the graph, restructures output to match `AISetupData` Pydantic schema

**Why this layer exists:**
The AI graph and the API schema are kept separate. The graph can change its internal structure without breaking the API, and vice versa.

---

### `app/services/qr_service.py`
**Generates short codes and QR code images.**

```python
def generate_short_code() -> str:
    return uuid.uuid4().hex[:8]  # e.g. "ce8b7c17"

def generate_registration_url(short_code) -> str:
    return f"{settings.APP_BASE_URL}/r/{short_code}"
    # e.g. "http://localhost:3000/r/ce8b7c17"

def generate_qr_code(url, short_code) -> str:
    # Creates a navy blue QR code PNG, saves to ./uploads/ce8b7c17.png
    # Returns: "http://localhost:3000/static/qr/ce8b7c17.png"
```

**Why APP_BASE_URL matters:**
- Dev: `APP_BASE_URL=http://localhost:3000` → link opens on your local frontend
- Production: `APP_BASE_URL=https://evenuefy.com` → link works for real attendees

---

## Database: How Submissions Are Stored

No separate `attendees` table. Submissions are stored inside `registration_forms.submissions` as a JSONB array.

```sql
-- registration_forms row after 2 registrations:
{
  "schema": { "pages": [{ "fields": [...] }] },
  "submissions": [
    {
      "id": "uuid-1",
      "full_name": "Ravi Sharma",
      "email": "ravi@gmail.com",
      "ticket_id": "uuid-ticket",
      "answers": { "college": "IIT Bombay", "year": "2nd" },
      "submitted_at": "2025-06-01T10:30:00"
    },
    {
      "id": "uuid-2",
      "full_name": "Priya Mehta",
      ...
    }
  ]
}
```

**Future use:** When submissions grow large, migrate to a separate `form_submissions` table and keep `registration_forms` just for schema.

---

## Security Model

```
Request comes in with: Authorization: Bearer eyJ...

deps.py      → decodes JWT → extracts user_id + org_id
tenant.py    → sets PostgreSQL session var: app.current_org_id = org_id
events.py    → uses org_id from tenant context for all DB writes/reads

Result: Organizer A can never see or modify Organizer B's data.
```

**What's NOT done yet:**
PostgreSQL-level RLS policies. The session variable is set but no `CREATE POLICY` SQL has been run. Add these before production:
```sql
ALTER TABLE events ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON events
  USING (org_id = current_setting('app.current_org_id')::UUID);
```
