# Evenuefy Frontend Architecture
> Next.js 14 App Router + TypeScript  
> Every file explained with purpose, contents, dependencies, and future use.

---

## How a Page Renders End to End

```
Browser hits URL
      │
      ▼
app/layout.tsx  (root layout — runs on every page)
      │
      ├── Checks pathname
      ├── /login, /signup, /r/*  → no sidebar, full screen
      └── everything else        → Sidebar + main content area
                                          │
                                          ▼
                                    page.tsx  (the actual page)
                                          │
                                          ▼
                                    components/  (UI pieces)
                                          │
                                          ▼
                                    lib/api.ts  (calls backend)
```

---

## Real Example: Organizer Creates and Publishes an Event

```
1. User visits localhost:3000
   → app/page.tsx shows dashboard
   → reads localStorage for token
   → if no token: shows Sign Up / Log In buttons

2. User visits /signup
   → app/signup/page.tsx
   → fills form → calls api.signup()
   → api.ts POSTs to /api/v1/auth/signup
   → saves token + user to localStorage
   → redirects to /

3. User clicks "Launch Wizard"
   → app/events/new/page.tsx (AIEventsWizard)
   → shows PromptInput component

4. User types: "Medical conference Ahmedabad 3 days"
   → PromptInput calls onGenerate(prompt)
   → page calls api.generateEventSetup(prompt)
   → api.ts POSTs to /api/v1/ai-setup with Bearer token
   → returns { event, tickets, form, confirmation_email }

5. Page renders AI draft:
   → EventPreview  shows event name, dates, city
   → TicketPreview shows 2-3 tickets with ₹ prices
   → FormPreview   shows AI form fields
   → EmailPreview  shows confirmation email

6. User clicks "Save & Publish"
   → api.saveEvent(aiData)   → POST /api/v1/events
   → api.publishEvent(id)    → POST /api/v1/events/{id}/publish
   → QRDisplay shows: link + QR code

7. Attendee opens http://localhost:3000/r/ce8b7c17
   → app/r/[short_code]/page.tsx
   → calls api.getPublicEvent("ce8b7c17")
   → shows ticket selection → form fields → submit
   → calls api.registerAttendee(data)
   → shows success screen
```

---

## File by File

---

### `src/app/layout.tsx`
**Root layout. Wraps every single page in the app.**

```tsx
"use client";
const PUBLIC_PATHS = ["/login", "/signup", "/r/"];

export default function RootLayout({ children }) {
  const pathname = usePathname();
  const isPublicPage = PUBLIC_PATHS.some(p => pathname.startsWith(p));

  return (
    <html>
      <body>
        {isPublicPage
          ? <div>{children}</div>                        // no sidebar
          : <div className="flex"><Sidebar />{children}</div>  // with sidebar
        }
      </body>
    </html>
  );
}
```

**What it holds:**
- Checks the current URL pathname
- Routes `/login`, `/signup`, `/r/*` get a clean full-screen layout (no sidebar) — these are for attendees or unauthenticated users
- All other routes (`/`, `/events/*`) get the organizer layout with `Sidebar` on the left

**Why it matters:**
Without this split, the Sidebar would appear on the attendee registration page — wrong audience. Attendees don't need navigation; they just need the form.

**Future use:**
- Add a loading spinner wrapper here
- Add a global toast/notification provider here

---

### `src/app/page.tsx`
**The organizer dashboard. The first page after login.**

**What it holds:**
- Reads `token`, `org_id`, `user` from localStorage on mount
- If not logged in: shows "Sign Up Free" and "Log In" buttons
- If logged in: shows Tenant ID, "AI Event Designer" card, and a "Coming Soon" stats placeholder

**Key behaviour:**
```tsx
useEffect(() => {
  const token = localStorage.getItem("token");
  if (token) setUser(JSON.parse(localStorage.getItem("user")));
}, []);
```
No API call on load — just reads localStorage. Fast, no flash.

**Future use:**
- Replace "Coming Soon" card with real stats: total events, total registrations
- Add a list of recent events with status badges

---

### `src/app/login/page.tsx`
**Login form for returning organizers.**

```tsx
const handleSubmit = async (e) => {
  await api.login(form.email, form.password);
  router.push("/");  // → dashboard
};
```

**What it holds:**
- Email + password form
- Calls `api.login()` → saves token/user to localStorage → redirects to dashboard
- Shows inline error if credentials are wrong

**Future use:** Add "Forgot Password" link

---

### `src/app/signup/page.tsx`
**Signup form for new organizers.**

```tsx
await api.signup({ full_name, email, password, org_name });
router.push("/");
```

**What it holds:**
- 4-field form: Your Name, Organisation Name, Email, Password
- `org_name` becomes the tenant name in the database
- One signup = one isolated organization = one private data silo

**Example:**
- Harsh signs up with org_name="TechFest Surat" → org created in DB → all his events are private to that org
- Priya signs up with org_name="MedConf India" → completely separate org → she can never see Harsh's events

---

### `src/app/events/new/page.tsx`
**The AI Event Wizard. The main feature of the product.**

**State machine:**
```
No aiData → shows PromptInput
    ↓ (after generate)
Has aiData → shows EventPreview + TicketPreview + FormPreview + EmailPreview
    ↓ (after publish)
Has publishedLink → shows QRDisplay
```

**What it holds:**
- `handleGenerate(prompt)` — calls `api.generateEventSetup()`, stores result in `aiData`
- `handleSaveAndPublish()` — calls `api.saveEvent()` then `api.publishEvent()`, stores link
- Each preview component receives its slice of `aiData` and an `onUpdate` callback
- When user edits a field in `EventPreview`, `onUpdate` fires and updates `aiData` in this parent

**Why state is held here (not in components):**
All 4 preview components edit the same object. If each held their own state, saving would require collecting data from 4 places. By holding `aiData` here, the "Save & Publish" button always has the latest edited version of everything.

---

### `src/app/events/[eventId]/page.tsx`
**Event detail page for a specific saved event.**

**What it holds:**
- Fetches `GET /api/v1/events/{eventId}` with Bearer token
- Shows event info, tickets, form fields, email template
- Status badge: yellow (draft), green (published), red (cancelled)
- If draft: shows "Publish Event" button → links to `/events/{id}/publish`
- If published: shows "View Published Details" button

**Dynamic route:**
`[eventId]` in the folder name means Next.js captures the URL segment. `/events/abc-123` → `params.eventId = "abc-123"`.

---

### `src/app/events/[eventId]/publish/page.tsx`
**Publish confirmation screen.**

**What it holds:**
- Loads on mount: fetches event to get its name and check if already published
- If already published: immediately shows `QRDisplay` with existing link
- If draft: shows confirmation screen with "Confirm & Publish" button
- On confirm: calls `api.publishEvent()` → shows `QRDisplay` with new link

**Why a separate page (not just a button):**
Publishing is irreversible — status goes from "draft" to "published". A dedicated confirmation screen prevents accidental publishes.

---

### `src/app/r/[short_code]/page.tsx`
**The public attendee registration page. No login required.**

**This is what attendees see when they open the shared link.**

**State machine:**
```
loading → (fetch event) → ticket → (select ticket) → form → (submit) → success
                                                               ↓ (error)
                                                             error screen
```

**What it holds:**
- Reads `short_code` from URL params (folder name `[short_code]` → `params.short_code`)
- Fetches event data including all form fields via `api.getPublicEvent()`
- Step 1 — Ticket selection: shows all tickets with ₹ prices
- Step 2 — Form: shows Full Name + Email (always) + all AI-generated dynamic fields
- `renderField()` — handles all field types: text, email, tel, select, textarea, checkbox, date, number
- On submit: calls `api.registerAttendee()` → shows success screen

**Critical detail — folder name:**
The folder is named `[short_code]` (with underscore). `useParams()` returns `params.short_code`. If the folder were named `[shortCode]` or `[shortcode]`, the param would be `undefined` and every registration page would show "Event not found".

**Who uses this:**
Only attendees. No JWT token, no login, no sidebar. Completely public.

---

## Components

---

### `src/components/layout/Sidebar.tsx`
**The left navigation bar shown to logged-in organizers.**

**What it holds:**
- Logo link → `/`
- Dashboard link → `/`
- AI Event Setup link → `/events/new` (highlighted in yellow when active)
- My Events link (disabled, "Soon")
- Organisation settings link (disabled)
- User avatar with initials generated from `full_name`
- Logout button → calls `api.logout()` → clears localStorage → redirects to `/login`

**How it gets user data:**
```tsx
useEffect(() => {
  const stored = localStorage.getItem("user");
  if (stored) setUser(JSON.parse(stored));
}, []);
```
Reads from localStorage — same token storage set during login/signup.

**Active link highlighting:**
```tsx
const isActive = (path) => pathname === path;
// Active: bg-[#F5A623] (yellow)  Inactive: text-gray-300
```

---

### `src/components/ai-setup/PromptInput.tsx`
**The text input where organizers describe their event.**

**What it holds:**
- A `<textarea>` for the prompt
- "Generate with EVA ✨" button — disabled until text is typed
- Loading state: shows spinner + "EVA is thinking..."
- 3 example prompts as clickable chips to quick-fill the textarea

**Props:**
```tsx
onGenerate: (prompt: string) => void  // called when button clicked
isLoading: boolean                     // disables button during API call
```

**Future use:** Add a character counter, prompt history dropdown

---

### `src/components/ai-setup/EventPreview.tsx`
**Shows and edits the AI-generated event details.**

**What it holds:**
- View mode: shows name, dates, city
- Edit mode: inputs for name, start date, city
- "✏️ Edit" / "💾 Save" toggle buttons
- On save: calls `onUpdate(editedEvent)` → parent (`new/page.tsx`) updates `aiData`

**Props:**
```tsx
event: Event
onUpdate: (e: Event) => void
```

---

### `src/components/ai-setup/TicketPreview.tsx`
**Shows and edits AI-generated ticket types.**

**What it holds:**
- View mode: ticket name, user_type, price with ₹ symbol
- Edit mode: name input + price number input with ₹ prefix
- `formatPrice()` — `0 → "FREE"`, `5000 → "₹5,000"` (Indian number format)
- Forces ₹ display regardless of what `ticket.currency` says

**Props:**
```tsx
tickets: Ticket[]
onUpdate: (t: Ticket[]) => void
```

---

### `src/components/ai-setup/FormPreview.tsx`
**Shows the AI-generated registration form fields.**

**What it holds:**
- Read-only list of all form fields
- Shows ✨ icon for AI-generated fields, • for standard fields
- Field type shown as a badge (text, email, select, etc.)

**Note:** This is display-only. Form field editing is a future feature.

---

### `src/components/ai-setup/EmailPreview.tsx`
**Shows and edits the AI-generated confirmation email.**

**What it holds:**
- View mode: subject line + HTML body preview (rendered with `dangerouslySetInnerHTML`)
- Edit mode: subject text input + body HTML textarea
- On save: calls `onUpdate(editedEmail)`

**Security note:** `dangerouslySetInnerHTML` is safe here because the HTML comes from your own AI (Groq), not from user input.

---

### `src/components/ai-setup/PublishButton.tsx`
**The big publish button at the bottom of the wizard.**

```tsx
<button onClick={onClick} disabled={isPublishing}>
  {isPublishing ? "Saving to Database..." : "Looks Good, Save & Publish 🚀"}
</button>
```

Simple component — just a styled button with loading state. Kept separate so the wizard page stays clean.

---

### `src/components/ai-setup/QRDisplay.tsx`
**Shows the published event's QR code and registration link.**

**What it holds:**
- QR code image (loaded from backend `/static/qr/{short_code}.png`)
- Short code display
- Clickable registration URL
- "Create Another Event" button → calls `onReset()` → clears wizard state

**Props:**
```tsx
link: { url: string, short_code: string, qr_code_url: string }
onReset: () => void
```

---

## Library Files

---

### `src/lib/api.ts`
**The single API client. All backend calls go through here.**

```typescript
const BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api/v1";
```

**Methods:**

| Method | HTTP | Endpoint | Auth |
|---|---|---|---|
| `signup(data)` | POST | `/auth/signup` | None |
| `login(email, pw)` | POST | `/auth/login` | None |
| `logout()` | — | clears localStorage | None |
| `generateEventSetup(prompt)` | POST | `/ai-setup` | Bearer |
| `saveEvent(data)` | POST | `/events` | Bearer |
| `publishEvent(id)` | POST | `/events/{id}/publish` | Bearer |
| `getPublicEvent(code)` | GET | `/public/events/{code}` | None |
| `registerAttendee(data)` | POST | `/public/register` | None |

**Token handling:**
- After login/signup: stores `token`, `org_id`, `user` in localStorage
- Protected calls: reads `token` from localStorage, adds `Authorization: Bearer {token}` header
- `logout()`: removes all three from localStorage

**Environment switching:**
- Dev: `.env.local` has `NEXT_PUBLIC_API_URL=http://localhost:8000/api/v1`
- Production: deployment platform (Vercel) has `NEXT_PUBLIC_API_URL=https://your-api.com/api/v1`
- Zero code changes needed between environments

**Future use:** Add request interceptors for token refresh, add error logging

---

### `src/lib/types.ts`
**TypeScript interfaces matching the backend Pydantic schemas.**

**What it holds:**

```typescript
interface Event { name, slug, start_date, end_date, city, ... }
interface Ticket { name, price, currency, user_type, ... }
interface FormField { field_id, label, type, required, options, ... }
interface FormPage { page_number, fields: FormField[] }
interface RegistrationForm { schema: { pages: FormPage[] } }
interface ConfirmationEmail { subject, body_html }
interface AISetupResponse {
  success: boolean
  data: { event, tickets, form, confirmation_email }
}
```

**Why it matters:**
TypeScript catches mismatches at compile time. If the backend changes a field name and you update `types.ts`, every component that uses the old name shows a red error immediately — before you even run the app.

**Future use:** Add `EventRead`, `TicketRead` types for the event detail page API responses

---

## Environment Variables

### `.env.local` (frontend — never committed to git)
```
NEXT_PUBLIC_API_URL=http://localhost:8000/api/v1
```

**Rule:** Only variables prefixed with `NEXT_PUBLIC_` are accessible in browser-side code. Without the prefix, the variable is undefined on the client.

---

## Route Map

| URL | File | Who uses it | Auth |
|---|---|---|---|
| `/` | `app/page.tsx` | Organizer dashboard | Optional |
| `/login` | `app/login/page.tsx` | Organizers | None |
| `/signup` | `app/signup/page.tsx` | New organizers | None |
| `/events/new` | `app/events/new/page.tsx` | Organizers | Required |
| `/events/[id]` | `app/events/[eventId]/page.tsx` | Organizers | Required |
| `/events/[id]/publish` | `app/events/[eventId]/publish/page.tsx` | Organizers | Required |
| `/r/[short_code]` | `app/r/[short_code]/page.tsx` | Attendees | None |

---

## Data Flow: Token and Tenant ID

```
User logs in → api.login()
    → backend returns { access_token, org_id, user }
    → localStorage.setItem("token", access_token)
    → localStorage.setItem("org_id", org_id)
    → localStorage.setItem("user", JSON.stringify(user))

Sidebar reads localStorage → shows user name and initials
Dashboard reads localStorage → shows tenant ID
api.ts reads localStorage → adds Bearer token to every protected request
api.ts reads localStorage → sends org_id in AI setup request body

User logs out → api.logout()
    → localStorage.removeItem("token")
    → localStorage.removeItem("org_id")
    → localStorage.removeItem("user")
    → router.push("/login")
```

---

## What's "Coming Soon" in the UI

| Feature | Where it appears | What needs building |
|---|---|---|
| My Events | Sidebar link (disabled) | `app/events/page.tsx` + `GET /events` list endpoint |
| Registration Stats | Dashboard card (placeholder) | `app/events/[id]/stats/page.tsx` + stats API |
| Organisation Settings | Sidebar link (disabled) | `app/settings/page.tsx` + org update API |
