# Google Maps Scraper

A sleek and efficient web tool that scrapes **business names, phone numbers, addresses, and websites** directly from **Google Maps** using **Puppeteer** and **Node.js**.  
It includes a beautiful frontend interface with WebSocket-based real-time logs and progress updates.

---

## Features

- Scrape **any Google Maps search or URL**
- Extract:
  - Business Name  
  - Phone Number  
  - Address  
  - Website URL  
- Live log updates via WebSocket  
- Auto CSV file download  
- One-click cancel functionality  
- Works locally or on Render/any Node host

---

## Setup

```bash
# Clone repository
git clone https://github.com/FluxMessenger/google-maps-scraper.git
cd google-maps-scraper

# Install dependencies
npm install
```

---

## Local Development

Run the scraper locally:

```bash
npm start
```

Then open your browser at:

```
http://localhost:3000
```

### Important:
- Always run through the Node server — **do not open `index.html` directly** in your browser.  
- The backend uses WebSockets to communicate; direct file access will not work.

---

## Output

Scraped data is saved as a CSV file inside `/exports/` with the format:

```
maps_<query>_YYYY-MM-DD.csv
```

Example:

```
maps_travel_agencies_2025-10-20.csv
```

| Name | Phone | Address | Website |
|------|--------|----------|----------|
| ABC Travels | +91 9876543210 | MG Road, Bengaluru | abctravels.in |

---

## Tech Stack

- **Node.js** — server & WebSocket handling  
- **Express.js** — backend API & static serving  
- **Puppeteer** — headless browser automation  
- **WebSocket** — real-time logs and status  
- **Vanilla JS + CSS** — responsive UI


---

## License

MIT License © 2025 FluxMessenger
