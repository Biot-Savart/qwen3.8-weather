# Nimbus — Interactive Weather Website

![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)
![JavaScript: Vanilla](https://img.shields.io/badge/JavaScript-Vanilla-blue.svg)
![Open-Meteo API](https://img.shields.io/badge/API-Open--Meteo-green.svg)

A feature-rich, interactive weather website built with vanilla JavaScript and the Open-Meteo API (no API key required). Deployed on GitLab Pages.

**Live Site:** https://biot-savart.github.io/qwen3.8-weather/

---

## 🌟 Features

### Weather Data

- **Current Conditions**: Real-time temperature, feels-like, humidity, wind, pressure, visibility, UV index
- **48-Hour Hourly Forecast**: Temperature line chart with precipitation probability bars
- **8-Day Daily Forecast**: Temperature ranges with daily weather icons and precipitation chances

### Air Quality

- **European AQI Scale**: Color-coded from Good to Extremely Poor
- **Detailed Pollutants**: PM2.5, PM10, Ozone (O3), Nitrogen Dioxide (NO2), Sulfur Dioxide (SO2), Carbon Monoxide (CO)
- **Health Advice**: Contextual recommendations based on air quality levels

### Interactive Visualizations

- **Canvas Chart**: Smooth Bezier temperature curve with hover tooltips showing hourly details
- **Sun Path Widget**: Animated arc showing sun position throughout the day
- **Wind Compass**: Directional indicator with speed and gust information
- **Animated Icons**: SVG weather icons with CSS animations for sun rays, cloud drift, rain drops, snow flakes, lightning flashes, and fog layers

### Background Animation

- Dynamic ambient canvas scene that changes with current weather conditions
- Day/night modes with appropriate sky colors
- Animated clouds, rain, snow, stars, and occasional lightning
- Respects user's `prefers-reduced-motion` system setting

### User Experience

- **Location Search**: Geocoding search with keyboard navigation (Arrow keys, Enter, Escape)
- **Deep Linking**: Shareable URLs via hash routing (`#lat,lon/name/country`)
- **Favorites System**: Save up to 6 locations locally
- **Theme Toggle**: Dark, light, or auto (system preference)
- **Unit Toggle**: Metric (°C, km/h, mm) ↔ Imperial (°F, mph, inches)
- **Keyboard Shortcuts**: `/` search · `U` units · `T` theme · `Esc` close search
- **Toast Notifications**: User feedback for actions
- **Responsive Design**: Desktop, tablet, and mobile layouts

### PWA Support

- Installable as a standalone app
- Service worker caching for offline functionality
- App manifest with custom icon

---

## ️ Tech Stack

| Technology                          | Purpose                                                          |
| ----------------------------------- | ---------------------------------------------------------------- |
| **HTML5**                           | Semantic markup structure                                        |
| **CSS3**                            | Glassmorphism design, CSS custom properties, responsive layout   |
| **Vanilla JavaScript (ES Modules)** | No dependencies, modern code organization                        |
| **Open-Meteo API**                  | Free weather forecast and geocoding (no authentication required) |
| **GitLab Pages**                    | Static hosting with CI/CD automation                             |

---

## 📁 Project Structure

```
qwen3.8-weather/
── index.html              # App shell with glassmorphism UI
├── css/
│   └── styles.css          # All styles (~1100 lines) including animations
├── js/
│   ├── app.js              # Main controller (routing, state, rendering)
│   ├── api.js              # Open-Meteo API client functions
│   ├── utils.js            # Formatters, conversion, storage utilities
│   ├── icons.js            # Animated SVG weather icons (WMO codes)
│   ├── charts.js           # Canvas chart renderer with tooltips
│   ├── widgets.js          # Sun path, wind compass, AQI gauge, outlook
│   └── background.js       # Ambient animated canvas background
├── assets/
│   └── icon.svg            # App icon / favicon
├── manifest.webmanifest    # PWA manifest
── sw.js                   # Service worker for caching
├── .gitlab-ci.yml          # GitLab Pages deployment config
├── package.json            # Dev scripts
└── README.md               # This file
```

---

## Getting Started

### Prerequisites

- Modern web browser (Chrome, Firefox, Safari, Edge)
- Internet connection (for live weather data)

### Running Locally

**Option 1: Using npm**

```bash
npm start
# Opens http://localhost:8080
```

**Option 2: Using Python**

```bash
python -m http.server 8080
# Opens http://localhost:8080
```

**Option 3: Any static server**
Simply open `index.html` directly in your browser or serve with any static file server.

---

## 📦 Deployment to GitLab Pages

1. Push your code to a GitLab repository
2. Navigate to **Settings → CI/CD** in your GitLab project
3. The `.gitlab-ci.yml` file automatically deploys to GitLab Pages when you push to `main`
4. Your site will be available at: `https://<your-username>.gitlab.io/<repository-name>/`

For this project, the deployed URL is:  
**https://biot-savart.github.io/qwen3.8-weather/**

---

## About the AI Model Used

This entire weather application was generated by **Qwen3.8**, a large language model developed by Alibaba Cloud's Tongyi Lab. Qwen3.8 demonstrated capabilities in:

- Full-stack web development (HTML/CSS/JavaScript)
- Creating interactive visualizations with Canvas API
- Implementing service workers and PWA features
- Writing clean, modular, and well-documented code
- Following best practices for accessibility and responsive design

The model successfully coordinated multiple files across different domains (UI, API, animations, state management) without external dependencies.

---

## 📄 License

MIT License — Feel free to use, modify, and deploy this project.

---

## 🙏 Acknowledgments

- **Open-Meteo** for providing free, no-API-key weather data services
- **GitLab** for Pages hosting and CI/CD infrastructure

---

_Built with ❤️ using vanilla JavaScript and Open-Meteo API_
