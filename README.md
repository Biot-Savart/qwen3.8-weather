# Nimbus — Interactive Weather App

A feature-rich, interactive weather website built with vanilla JavaScript and the Open-Meteo API (no API key required).

## Features

- **Live Weather Data:** Current conditions, hourly forecasts (48h), daily forecasts (8 days)
- **Air Quality Index:** European AQI with detailed pollutant breakdowns
- **Interactive Charts:** Smooth temperature line charts with precipitation bars and tooltips
- **Visual Widgets:** Animated sun path, wind compass, AQI gauge
- **Rich Search:** Geocoding search with keyboard navigation and deep linking
- **Favorites System:** Save and quickly access favorite locations
- **Unit Toggle:** Metric (°C, km/h) or Imperial (°F, mph)
- **Theme Support:** Dark, light, or auto (system preference)
- **Animated Background:** Dynamic canvas scene reflecting current weather conditions
- **Keyboard Shortcuts:** `/` search · `U` units · `T` theme · `Esc` close
- **PWA Support:** Install as an app, works offline (with cached data)
- **No API Keys Required:** Uses free Open-Meteo services
- **Privacy Focused:** No tracking, all data stored locally

## Tech Stack

- **HTML5** — Semantic markup structure
- **CSS3** — Glassmorphism design, CSS custom properties for theming, fluid responsive layout
- **Vanilla JavaScript** — ES modules, canvas rendering, no dependencies
- **Open-Meteo API** — Weather forecast and geocoding (free, no authentication)
- **GitLab Pages** — Static hosting with CI/CD

## Project Structure

```
├── index.html          # Application shell
├── manifest.webmanifest # PWA manifest
├── sw.js               # Service worker
├── .gitlab-ci.yml      # GitLab Pages deployment config
├── README.md           # This file
├── LICENSE
├── assets/
│   └── icon.svg        # App icon / favicon
├── css/
│   └── styles.css      # All styles including animations
└── js/
    ├── app.js          # Main controller
    ├── api.js          # Open-Meteo API client
    ├── utils.js        # Utilities & formatters
    ├── icons.js        # Animated SVG weather icons
    ├── charts.js       # Canvas chart rendering
    ├── widgets.js      # Sun path, wind compass, AQI gauge
    └── background.js   # Ambient animated background
```

## Development

1. Clone the repository:

   ```bash
   git clone https://gitlab.com/<your-username>/qwen3.8-weather.git
   cd qwen3.8-weather
   ```

2. Serve locally (any static server):

   ```bash
   # Using Python 3
   python -m http.server 8080

   # Or using Node.js (if installed)
   npx serve .
   ```

3. Open http://localhost:8080 in your browser.

## Deployment

Push to the `main` branch of your GitLab repository. The `.gitlab-ci.yml` configuration will automatically deploy to GitLab Pages at:
`https://<your-username>.gitlab.io/qwen3.8-weather/`

## API Attribution

Weather data provided by [Open-Meteo](https://open-meteo.com/).
Geocoding by Open-Meteo Geocoding API.
Air quality by Open-Meteo Air Quality API.

## License

MIT License
