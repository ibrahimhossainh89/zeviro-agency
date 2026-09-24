# Free test deployment (Render + MongoDB Atlas)

One free Render web service runs everything: website, client portal, team/admin dashboards, API and live chat.

| What | URL |
|---|---|
| Website + client portal | `https://<your-service>.onrender.com` |
| Super admin | `https://<your-service>.onrender.com/login?portal=admin` |
| Team | `https://<your-service>.onrender.com/login?portal=team` |
| Back to the website from a portal tab | add `?portal=client` |

## 1. Database — MongoDB Atlas (free M0)
1. Create an account at https://www.mongodb.com/cloud/atlas → create a **free (M0)** cluster.
2. Database Access → add a user (username + password).
3. Network Access → Add IP Address → **Allow access from anywhere** (`0.0.0.0/0`) — Render has no fixed IP.
4. Connect → Drivers → copy the connection string, put your password in it and add the database name before `?`:
   `mongodb+srv://USER:PASSWORD@cluster0.xxxxx.mongodb.net/zeviro?retryWrites=true&w=majority`

## 2. Code — GitHub
Push the `zeviro-agency` folder to a GitHub repository (GitHub Desktop is the easiest on Windows).
`.gitignore` already keeps out `node_modules`, `.env`, `dist` and uploads — never upload `.env`.

## 3. Render
1. https://render.com → sign in with GitHub → **New → Blueprint** → pick the repository.
   Render reads `render.yaml` and creates the `zeviro` service.
2. When asked, fill in:
   - `MONGO_URI` — the Atlas connection string
   - `SEED_ADMIN_PASSWORD` — the super admin password you want
3. Deploy. The first start fills the empty database with the website content and creates the super admin.

Optional environment variables (Service → Environment): `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`, `MAIL_FROM`, `ADMIN_NOTIFY_EMAIL`, `ANTHROPIC_API_KEY`, `SITE_URL`.
Do **not** add `NODE_ENV` — `npm start` sets it, and adding it would skip the build tools.

## Good to know (free tier)
- The service sleeps after 15 minutes without visitors; the next visit takes about a minute.
- Uploads are stored in MongoDB (`UPLOADS_IN_DB=true`), so they survive restarts.
- Without SMTP, login/sign-up codes are not emailed — they appear in Render → Logs as
  `[otp:dev] login code for …: 123456`.
- Updating: push new code to GitHub → Render redeploys automatically.
