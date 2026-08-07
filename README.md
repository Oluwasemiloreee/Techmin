# Techmin Blog — Vercel-ready edition

This folder is ready to open in VS Code, edit, test with Vercel locally, push to GitHub, and deploy to Vercel.

## What is included

- Responsive multi-page Techmin website
- Live RSS-powered technology news at `/api/news`
- Brevo newsletter subscription at `/api/subscribe`
- Brevo contact email delivery at `/api/contact`
- Search and filters on the News and Articles pages
- Shared navbar and footer components
- Dark mode, AOS reveal motion, and reduced-motion support
- `robots.txt`, `sitemap.xml`, `.env.example`, and `vercel.json`
- No Netlify configuration or Netlify Functions

## Project structure

```text
Techmin Blog/
├── api/
│   ├── news.js
│   ├── subscribe.js
│   └── contact.js
├── server/
│   └── news-service.js
├── Components/
├── Img/
├── index.html
├── news.html
├── contact.html
├── subscribe.html
├── script.js
├── news.js
├── style.css
├── package.json
├── vercel.json
├── .env.example
├── robots.txt
└── sitemap.xml
```

## Open and test in VS Code

1. Extract the ZIP.
2. Open the inner `Techmin Blog` folder in VS Code.
3. Open the VS Code terminal and run:

```bash
npm install
npm run dev
```

4. Open the URL shown by Vercel CLI, usually `http://localhost:3000`.

Do not use VS Code Live Server to test `/api/news`, `/api/subscribe`, or `/api/contact`. Live Server only serves frontend files and does not run Vercel Functions.

## Configure Brevo

Create a Brevo account, verify your sending domain or sender, and create a contact list. In Vercel, open **Project → Settings → Environment Variables** and add:

```text
BREVO_API_KEY=your Brevo API key
BREVO_LIST_ID=your numeric Brevo contact-list ID
BREVO_SENDER_EMAIL=hello@yourdomain.com
BREVO_SENDER_NAME=Techmin
CONTACT_TO_EMAIL=hello@yourdomain.com
```

For local testing, copy `.env.example` to `.env.local` and replace the sample values. Never commit your real API key to GitHub.

## Deploy to Vercel

Recommended workflow:

1. Create a GitHub repository.
2. Upload the contents of the inner `Techmin Blog` folder—not the outer ZIP folder.
3. Import that repository in Vercel.
4. Set the framework preset to **Other** if Vercel asks.
5. Add the Brevo environment variables.
6. Deploy.

The Vercel endpoints will be:

```text
/api/news
/api/subscribe
/api/contact
```

## Before connecting your domain

Search the project for these placeholders and replace them:

```text
techmin.example
www.techmin.example
hello@yourdomain.com
```

Update `robots.txt`, `sitemap.xml`, canonical links, social links, and any placeholder email address after you know the final domain.

## Content note

The News page displays summaries and links readers to the original publishers. Do not copy entire third-party articles into Techmin. Review each publisher's feed and attribution terms before commercial launch.
