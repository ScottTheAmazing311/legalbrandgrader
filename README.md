# Legal Brand Grader - Next.js App

A Next.js application that analyzes law firm websites and provides brand scores across 8 dimensions, benchmarked against elite exemplar firms.

## Features

- **Client-side UI**: React-based interface with smooth animations
- **Server-side API**: Secure Anthropic API integration via Next.js API routes
- **Brand Analysis**: Scores firms across 8 key brand dimensions
- **Exemplar Benchmarking**: Compares against top-performing law firm brands

## Getting Started

### Prerequisites

- Node.js 18+ installed
- Anthropic API key

### Installation

1. Install dependencies:
```bash
npm install
```

2. Configure environment variables:
```bash
cp .env.example .env.local
```

3. Edit `.env.local` and add your Anthropic API key:
```
ANTHROPIC_API_KEY=sk-ant-your-actual-key-here
```

### Development

Run the development server:

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

### Production Build

Build the application:

```bash
npm run build
npm start
```

## Deployment

### Vercel (Recommended)

1. **Install Vercel CLI** (optional):
```bash
npm i -g vercel
```

2. **Deploy via GitHub**:
   - Push code to GitHub repository
   - Connect repository to Vercel at [vercel.com](https://vercel.com)
   - Add `ANTHROPIC_API_KEY` environment variable in Vercel dashboard
   - Deploy automatically on push to main branch

3. **Deploy via CLI**:
```bash
# Login
vercel login

# Deploy (first time)
vercel

# Add environment variable
vercel env add ANTHROPIC_API_KEY

# Deploy to production
vercel --prod
```

### Environment Variables

In Vercel dashboard, add:
- **Key**: `ANTHROPIC_API_KEY`
- **Value**: Your Anthropic API key (starts with `sk-ant-`)
- **Environment**: Production, Preview, Development (select all)

## Project Structure

```
legal-brand-grader/
├── app/
│   ├── api/
│   │   └── analyze/
│   │       └── route.ts        # Server-side API endpoint
│   ├── page.tsx                # Main UI component
│   ├── layout.tsx              # Root layout
│   └── globals.css             # Global styles
├── .env.local                  # Local environment variables (gitignored)
├── .env.example                # Environment variable template
├── next.config.js              # Next.js configuration
├── package.json                # Dependencies and scripts
└── tsconfig.json               # TypeScript configuration
```

## Key Technologies

- **Next.js 16**: React framework with App Router
- **TypeScript**: Type-safe development
- **Anthropic SDK**: Claude AI integration
- **Custom CSS**: Preserved from original HTML design

## Configuration

### Exemplar Firms

Edit exemplar firms in `app/page.tsx`:

```typescript
const EXEMPLAR_FIRMS = [
  { name: "...", url: "...", specialty: "...", strength: "..." },
  // Add more firms here
];
```

### Scoring Weights

Adjust category weights in `app/page.tsx` (must sum to 100):

```typescript
const SCORING_WEIGHTS = {
  brandClarity: 15,
  languageDifferentiation: 15,
  // ... other categories
};
```

## Testing

1. Start the development server: `npm run dev`
2. Navigate to `http://localhost:3000`
3. Enter a test URL (e.g., "example.com")
4. Verify:
   - Loading animation displays
   - API call succeeds
   - Results render with animations
   - Score ring, category bars, and benchmark bar animate
   - "Grade Another Firm" button resets to input state

## Security

- API key is stored server-side only (never exposed to client)
- API route validates all inputs
- TypeScript provides type safety
- Environment variables are gitignored

## License

Proprietary - All rights reserved
