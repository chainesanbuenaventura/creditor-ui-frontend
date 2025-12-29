# Environment Variables Setup

## Local Development

Create a `.env.local` file in the `frontend` directory:

```bash
NEXT_PUBLIC_API_URL=http://localhost:8001
```

## Vercel Deployment

1. Go to your Vercel project → Settings → Environment Variables
2. Add the following:

| Variable | Value | Environment |
|----------|-------|-------------|
| `NEXT_PUBLIC_API_URL` | `https://your-backend-url.com` | Production, Preview, Development |

**Note**: `.env.local` is already in `.gitignore` and won't be committed to Git.

