# 3D Tech-Menu Marketing Site

A beautiful, static marketing website for 3D Tech-Menu - built with pure HTML, TailwindCSS, and minimal JavaScript.

## 🚀 Quick Start

**⚠️ Important:** Due to CORS restrictions, you **must** run a local server to view the 3D models. Opening `index.html` directly won't work.

### Option 1: Use the provided server script (Recommended)

```bash
# Using Python server (includes CORS headers)
python3 server.py
```

Or use the shell script:

```bash
./serve.sh
```

### Option 2: Use built-in server commands

```bash
# Using Python
python3 -m http.server 8000

# Using Node.js (http-server)
npx http-server

# Using PHP
php -S localhost:8000
```

Then visit `http://localhost:8000` in your browser.

### Why a server is needed

Browsers block loading local files (like `demo-model.glb`) when opening HTML files directly due to CORS (Cross-Origin Resource Sharing) security policies. Running a local server solves this issue.

## 📁 File Structure

```
marketing-site/
├── index.html          # Main HTML file with all sections
├── script.js           # JavaScript for interactivity
├── styles.css          # Custom CSS styles
├── assets/
│   ├── logo.png       # Placeholder logo (replace with your logo)
│   ├── demo-model.glb # Placeholder 3D model (replace with your model)
│   ├── images/        # Additional images folder
│   └── README.md      # Assets documentation
└── README.md          # This file
```

## 🎨 Features

- ✅ Fully responsive design
- ✅ Smooth scrolling navigation
- ✅ Mobile-friendly menu
- ✅ Form handling (with alert for now)
- ✅ Apple-style clean design
- ✅ Gradient backgrounds
- ✅ Hover animations
- ✅ Ready for model-viewer integration

## 🔧 Customization

### Adding Your Logo

Replace `assets/logo.png` with your logo file, then update the navigation in `index.html`:

```html
<img src="assets/logo.png" alt="3D Tech-Menu Logo" class="h-10">
```

### Adding 3D Models

1. Place your GLB file in `assets/demo-model.glb`
2. Update the demo section in `index.html`:

```html
<model-viewer 
    src="assets/demo-model.glb" 
    auto-rotate 
    camera-controls
    style="width: 100%; height: 100%;">
</model-viewer>
```

### Connecting the Form

Currently, the early access form shows an alert. To connect it to a backend:

1. Update the form action in `index.html`:
```html
<form id="early-access-form" action="https://your-api-endpoint.com/submit" method="POST">
```

2. Or update `script.js` to send an AJAX request instead of showing an alert.

## 🌐 Deployment

This site is ready to deploy on:

- **Vercel**: Just drag and drop the `marketing-site` folder
- **Netlify**: Drag and drop or connect via Git
- **Cloudflare Pages**: Connect your Git repository
- **GitHub Pages**: Push to a `gh-pages` branch
- **Any static hosting**: Upload all files to your web server

## 📝 Notes

- Uses TailwindCSS via CDN (no build step required)
- Uses Font Awesome for icons
- Uses Google's model-viewer for 3D previews
- All dependencies are loaded via CDN
- No build process needed - just static files!

## 🎯 Sections

1. **Hero Section** - Main headline with CTA buttons
2. **Features** - 6 feature cards with icons
3. **How It Works** - 3-step process
4. **Demo** - Interactive 3D model viewer placeholder
5. **Pricing** - 3 pricing tiers (Coming Soon)
6. **Early Access CTA** - Sign-up form
7. **Footer** - Links and contact info

---

Built with ❤️ for 3D Tech-Menu
