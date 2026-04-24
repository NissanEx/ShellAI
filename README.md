# AI Shell

Terminal-style AI chat interface powered by Claude.

## Features
- 💬 Chat with Claude AI (Bahasa Indonesia)
- 🖥️ Code generation with syntax highlighting (`code: ...`)
- 🎨 SVG illustration generation (`image: ...`)
- ▶️ Live HTML preview in split panel
- ↕️ Resizable output panel

## Project Structure

```
ai-shell/
├── index.html       # Main HTML
├── css/
│   └── style.css    # All styles
├── js/
│   └── app.js       # All JavaScript logic
├── vercel.json      # Vercel deploy config
└── .gitignore
```

## Deploy ke Vercel

### Option 1 — Via Vercel Dashboard (Recommended)
1. Push repo ini ke GitHub
2. Buka [vercel.com](https://vercel.com) → **Add New Project**
3. Import repo dari GitHub
4. Framework Preset: **Other**
5. Klik **Deploy** — selesai!

### Option 2 — Via Vercel CLI
```bash
npm i -g vercel
vercel
```

## Local Development

Cukup buka `index.html` di browser, atau gunakan live server:

```bash
npx serve .
```

## ⚠️ API Key

Proyek ini memanggil Anthropic API langsung dari browser.  
Untuk production, **sangat disarankan** membuat backend proxy agar API key tidak terekspos.

Contoh sederhana dengan Vercel Edge Function: lihat `/api/chat.js` (opsional, tambahkan sendiri).
