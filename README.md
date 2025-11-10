# Self-Mastery Vault Landing Page

Modern opt-in page and Beehiiv proxy so visitors can join the Self-Mastery Vault without exposing your API key. The repo is ready to drop into GitHub: secrets are ignored, the form posts through a local Node server, and a success page hands people the Drive link immediately.

## Features
- Responsive hero/opt-in page (`new.html`) with instant status feedback.
- Secure Beehiiv subscription proxy (`api/subscribe.js`) that keeps the API key server-side.
- Success page (`success.html`) that redirects subscribers straight to the vault.
- Zero external dependencies—just Node 18+.

## Project Structure
```
.
├── api/
│   └── subscribe.js       # Beehiiv proxy
├── new.html               # Landing page
├── success.html           # Post-opt-in page
├── subscribe.js           # Front-end form logic
├── server.js              # Tiny static/API server
├── package.json
└── .gitignore
```

## Prerequisites
- Node.js 18+
- A Beehiiv API key with access to publication `pub_c9b8177c-2f58-4851-aef6-6cceae9f3743` (or your own publication ID).

## Configuration
You can supply your Beehiiv credentials in two ways:

1. **Environment variables (preferred for GitHub deployments)**
   ```bash
   # PowerShell
   $env:BEEHIIV_API_KEY="your-secret"
   $env:BEEHIIV_PUBLICATION_ID="pub_xxx"

   # macOS/Linux
   export BEEHIIV_API_KEY="your-secret"
   export BEEHIIV_PUBLICATION_ID="pub_xxx"
   ```

2. **Local key file (convenient for development)**  
   Create `api_key_beehiv` in the project root and paste the API key.  
   This file is ignored by git via `.gitignore` so it will never reach GitHub.

If you are using a different Beehiiv publication ID, update the `BEEHIIV_PUBLICATION_ID` env var; the default stays pointed at Kaan’s publication for convenience.

## Running Locally
```bash
cd /path/to/project
npm install   # no deps, but creates package-lock for consistency
npm start     # runs node server.js
```

Visit `http://localhost:3000/` to view the landing page. Submit the form with a test email; on success, you’ll be redirected to `success.html` where the Drive link lives.

## Deployment Notes
- Any Node-compatible host (Render, Railway, Fly, Vercel, etc.) works. Expose `server.js` as the entry point and set the Beehiiv env vars in the host dashboard.
- GitHub Pages can only serve static files, so deploy to a platform that allows Node functions; alternately, drop `api/subscribe.js` into your existing backend and keep the static assets on Pages.
- Do **not** commit `api_key_beehiv` or actual API keys. `.gitignore` is already set up to protect them.

## Customization
- Update copy or styling directly in `new.html` and `success.html`.
- Add more fields (custom Beehiiv attributes) by extending the payload in `subscribe.js` and `api/subscribe.js`.
- Replace the Drive link inside `success.html` with any URL you want to hand to new subscribers.

Happy shipping!
