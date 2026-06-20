# paddock

This is redline's user-facing control plane. It's a Next.js app.

## Getting Started


First, install the dependencies:

```bash
pnpm i
```

Add a `.env` file:
```env
BETTER_AUTH_SECRET=
BETTER_AUTH_URL=http://localhost:3000 # Base URL of your app

DATABASE_URL=postgresql://postgres:password@localhost:5432/redline

GITHUB_CLIENT_ID=
GITHUB_CLIENT_SECRET=

GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
```

Then, run the development server:

```bash
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the website.
