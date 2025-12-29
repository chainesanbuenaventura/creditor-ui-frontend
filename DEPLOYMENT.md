# Deployment Guide for Vercel

## Environment Variables

The frontend requires the following environment variable:

### `NEXT_PUBLIC_API_URL`
- **Description**: Backend API URL
- **Local Development**: `http://localhost:8001`
- **Production**: Your deployed backend URL (e.g., `https://your-backend.railway.app` or `https://api.yourdomain.com`)

## Local Development Setup

1. Create a `.env.local` file in the `frontend` directory:
```bash
NEXT_PUBLIC_API_URL=http://localhost:8001
```

2. Install dependencies:
```bash
npm install
```

3. Run the development server:
```bash
npm run dev
```

## Vercel Deployment

1. **Push your code to GitHub**

2. **Import project to Vercel**:
   - Go to [vercel.com](https://vercel.com)
   - Click "New Project"
   - Import your GitHub repository
   - Select the `creditor-ui/frontend` directory as the root

3. **Set Environment Variables**:
   - In Vercel project settings → Environment Variables
   - Add: `NEXT_PUBLIC_API_URL` = `https://your-backend-url.com`
   - Make sure to set it for Production, Preview, and Development environments

4. **Deploy**:
   - Click "Deploy"
   - Vercel will automatically build and deploy your Next.js app

## Backend Deployment

The backend needs to be deployed separately (not on Vercel, as Vercel is for frontend/Next.js).

**Recommended platforms for backend:**
- **Railway**: https://railway.app
- **Render**: https://render.com
- **Fly.io**: https://fly.io
- **AWS/GCP/Azure**: Traditional cloud providers

**Backend Environment Variables** (set on your backend hosting platform):
- `OPENAI_API_KEY`: Your OpenAI API key
- `DOCUMENT_ANALYSIS_ENDPOINT_URL`: Azure Document Intelligence endpoint
- `DOCUMENT_ANALYSIS_API_KEY`: Azure Document Intelligence API key

**Important**: Never commit API keys to Git! Use environment variables on your hosting platform.

## CORS Configuration

Make sure your backend allows requests from your Vercel domain. Update the backend CORS settings:

```python
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "http://localhost:3001",
        "https://your-vercel-app.vercel.app",  # Add your Vercel URL
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
```

## Troubleshooting

- **CORS errors**: Make sure your backend CORS includes your Vercel domain
- **API connection errors**: Verify `NEXT_PUBLIC_API_URL` is set correctly in Vercel
- **Build errors**: Check that all dependencies are in `package.json`

