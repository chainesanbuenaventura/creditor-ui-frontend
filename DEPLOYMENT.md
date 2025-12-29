# Frontend Deployment Guide for Vercel

## Quick Start

1. **Deploy backend first** (see `creditor-ui-backend/DEPLOYMENT.md`)
2. **Get your backend URL** (e.g., `https://your-backend.railway.app`)
3. **Deploy frontend to Vercel** with the backend URL configured

## Environment Variables

### Required: `NEXT_PUBLIC_API_URL`
- **Description**: Backend API URL
- **Local Development**: `http://localhost:8001`
- **Production**: Your deployed backend URL (e.g., `https://your-backend.railway.app`)

## Local Development Setup

1. **Create `.env.local`** in `creditor-ui-frontend/`:
```bash
NEXT_PUBLIC_API_URL=http://localhost:8001
```

2. **Install dependencies**:
```bash
cd creditor-ui-frontend
npm install
```

3. **Run development server**:
```bash
npm run dev
```

4. **Start backend** (in another terminal):
```bash
cd creditor-ui-backend
python main.py
```

## Vercel Deployment

### Step 1: Push to GitHub

Make sure your code is pushed to a GitHub repository.

### Step 2: Import to Vercel

1. Go to [vercel.com](https://vercel.com)
2. Click **"New Project"**
3. Import your GitHub repository
4. **Important**: Set **Root Directory** to `creditor-ui-frontend`
   - Click "Edit" next to Root Directory
   - Select `creditor-ui-frontend` folder

### Step 3: Configure Environment Variables

1. In Vercel project settings → **Environment Variables**
2. Add: `NEXT_PUBLIC_API_URL` = `https://your-backend-url.com`
3. **Set for all environments**: Production, Preview, and Development
4. Click **"Save"**

### Step 4: Deploy

1. Click **"Deploy"**
2. Vercel will automatically build and deploy your Next.js app
3. Wait for deployment to complete

### Step 5: Update Backend CORS

After getting your Vercel URL (e.g., `your-app.vercel.app`):

1. Go to your backend hosting platform (Railway, Render, etc.)
2. Add environment variable: `VERCEL_URL=your-app.vercel.app`
3. Or set `CORS_ORIGINS=https://your-app.vercel.app`
4. Restart backend service

## Using the Application

Once deployed:

1. **Upload PDFs**: Click "Upload PDFs" button in the sidebar
2. **Select folder**: Click on a folder from the list
3. **Run extraction**: Click "Run Extraction" button
4. **View results**: Navigate through the pipeline steps (OCR, Segments, Extract, Compare)

### Uploading Ground Truth

To compare with ground truth:
1. Upload all your PDFs first
2. Upload a file named `creditors_list.pdf` to the same folder
3. The system will automatically detect it as ground truth

## Troubleshooting

### "Failed to fetch folders" Error

- **Check**: `NEXT_PUBLIC_API_URL` is set correctly in Vercel
- **Verify**: Backend is running and accessible
- **Test**: Visit `https://your-backend-url.com/` in browser (should show `{"status":"ok"}`)

### CORS Errors

- **Check**: Backend has `VERCEL_URL` or `CORS_ORIGINS` set with your Vercel domain
- **Verify**: Backend CORS middleware is configured correctly
- **Note**: Backend automatically adds Vercel domain if `VERCEL_URL` is set

### Build Errors

- **Check**: All dependencies are in `package.json`
- **Verify**: Node version is compatible (Vercel uses Node 18+ by default)
- **Review**: Build logs in Vercel dashboard for specific errors

### Upload Not Working

- **Check**: Backend `/upload` endpoint is accessible
- **Verify**: Backend has write permissions for `uploads/` directory
- **Test**: Try uploading via curl: `curl -X POST -F "files=@test.pdf" https://your-backend-url.com/upload`

## File Structure

```
creditor-ui/
├── creditor-ui-frontend/     # Next.js frontend (deploy to Vercel)
│   ├── src/
│   ├── public/
│   └── package.json
└── creditor-ui-backend/      # FastAPI backend (deploy separately)
    ├── main.py
    ├── extractor.py
    └── requirements.txt
```

## Next Steps

- See `creditor-ui-backend/DEPLOYMENT.md` for backend deployment details
- Check `ENV_SETUP.md` for environment variable reference

