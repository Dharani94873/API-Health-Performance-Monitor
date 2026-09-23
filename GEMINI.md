# Project Instructions & Automation Rules

## Autonomous Execution
- Always proceed with tasks directly without asking for confirmation or approval.
- Keep responses concise and focused on output and results alone.

## Automatic Git Push & Vercel Deployment
- Whenever any code modifications, new features, or bug fixes are completed:
  1. Automatically stage all modified/new files: `git add .`
  2. Create a descriptive commit: `git commit -m "<concise conventional commit message>"`
  3. Push immediately to GitHub: `git push origin main`
- Pushing to `origin/main` automatically triggers Vercel to build and deploy to:
  `https://api-health-performance-monitor-omega.vercel.app/`
- Verify that the push succeeded and report the commit SHA and deployment status directly in the response.
