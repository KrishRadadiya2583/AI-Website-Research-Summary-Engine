# Website Research & Summary Engine

A local-first website intelligence service. It extracts useful page content and returns summaries, keywords, entities, SEO/security signals, accessibility checks, technology hints, links, media, and company facts.

## Run locally

Requirements: Node.js 20+ and a Chromium-compatible environment for JavaScript-heavy sites.

```bash
npm install
npm start
```

Open `http://localhost:3000`. MongoDB is optional; without `MONGODB_URI`, analysis works normally but results are not cached.

```env
PORT=3000
MONGODB_URI=mongodb://127.0.0.1:27017/website_research
PUPPETEER_EXECUTABLE_PATH=/optional/path/to/chrome
```

## API

Analyze a public HTTP(S) page:

```http
POST /research
Content-Type: application/json

{"url":"https://example.com","refresh":false}
```

`refresh` bypasses the MongoDB cache. The legacy `urlinput` property remains supported. Local, private-network, credential-bearing, and unresolvable URLs are rejected.

Health check: `GET /health`

## Development

```bash
npm test
npm run dev
```

The fast Axios/Cheerio path handles static pages. Puppeteer is used as a fallback when too little content is extracted. Extractive summarization is always available; the larger local transformer is loaded lazily when available.
