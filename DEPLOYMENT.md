# Deployment Guide

## Quick Start

Your Legal Brand Grader Next.js app is ready to deploy! Follow these steps:

## 1. Set Up Environment Variable

Before deploying, you need an Anthropic API key:

1. Get your API key from [Anthropic Console](https://console.anthropic.com/)
2. Update `.env.local`:
```bash
ANTHROPIC_API_KEY=sk-ant-your-actual-key-here
```

## 2. Test Locally

```bash
# Start development server
npm run dev

# Open http://localhost:3000
# Test with a sample URL like "example.com"
```

## 3. Deploy to Vercel (Recommended)

### Option A: GitHub Integration (Easiest)

1. **Push to GitHub**:
```bash
git init
git add .
git commit -m "Initial commit: Legal Brand Grader Next.js app"
git branch -M main
git remote add origin https://github.com/yourusername/legal-brand-grader.git
git push -u origin main
```

2. **Connect to Vercel**:
   - Go to [vercel.com](https://vercel.com)
   - Click "New Project"
   - Import your GitHub repository
   - Vercel will auto-detect Next.js settings

3. **Add Environment Variable**:
   - In Vercel dashboard → Project Settings → Environment Variables
   - Add: `ANTHROPIC_API_KEY` = `sk-ant-your-key`
   - Select all environments (Production, Preview, Development)
   - Click "Save"

4. **Deploy**:
   - Vercel deploys automatically on push to main branch
   - Your app will be live at `https://your-project.vercel.app`

### Option B: Vercel CLI

```bash
# Install Vercel CLI
npm i -g vercel

# Login
vercel login

# Deploy
vercel

# Add environment variable
vercel env add ANTHROPIC_API_KEY

# Deploy to production
vercel --prod
```

## 4. Verify Deployment

1. Visit your deployed URL
2. Enter a test law firm URL (e.g., "example.com")
3. Verify:
   - ✅ Loading animation appears
   - ✅ API successfully analyzes the URL
   - ✅ Results display with animations
   - ✅ All scores and charts render correctly
   - ✅ CTA buttons have correct mailto links

## Common Issues

### "API configuration error"
- Check that `ANTHROPIC_API_KEY` is set in Vercel environment variables
- Redeploy after adding environment variables

### Build fails
- Run `npm run build` locally to test
- Check for TypeScript errors
- Ensure all dependencies are installed

### API timeout
- Anthropic API calls can take 5-10 seconds
- This is normal for AI analysis
- Loading steps provide user feedback

## Post-Deployment

### Custom Domain (Optional)
1. In Vercel dashboard → Settings → Domains
2. Add your custom domain (e.g., `grader.yourdomain.com`)
3. Follow DNS configuration instructions

### Monitoring
- Vercel provides built-in analytics
- Monitor API usage in Anthropic Console
- Check error logs in Vercel dashboard

### Updates
```bash
# Make changes locally
git add .
git commit -m "Update: description"
git push

# Vercel auto-deploys on push to main
```

## Security Checklist

- ✅ API key stored in environment variables (never in code)
- ✅ `.env.local` is gitignored
- ✅ API route validates inputs
- ✅ No API key exposed to client-side code

## Cost Considerations

- **Vercel**: Free tier supports this app (100GB bandwidth/month)
- **Anthropic API**: Pay-per-use (Claude Sonnet 4)
  - ~$0.003 per analysis
  - 1000 analyses ≈ $3
  - Set usage limits in Anthropic Console

## Support

For issues:
1. Check Vercel deployment logs
2. Verify environment variables are set
3. Test locally with `npm run dev`
4. Check Anthropic API status

## Next Steps

- ✅ Deploy to Vercel
- ✅ Test with real law firm URLs
- ✅ Share with stakeholders
- Consider adding analytics (Google Analytics, Plausible, etc.)
- Monitor API usage and costs
