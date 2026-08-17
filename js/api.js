// ============================================================
// api.js — Open-Meteo API clients (no API key required)
// Docs: https://open-meteo.com/en/docs
// ============================================================

const GEO_URL = 'https://geocoding-api.open-meteo.com/v1/search';
const FORECAST_URL = 'https://api.open-meteo.com/v1/forecast';
const AQ_URL = 'https://air-quality-api.open-meteo.com/v1/air-quality';

const HOURLY_VARS = [
	'temperature_2m',
	'apparent_temperature',
	'precipitation_probability',
	'precipitation',
	'weather_code',
	'cloud_cover',
	'wind_speed_10m',
	'wind_direction_10m',
	'wind_gusts_10m',
	'relative_humidity_2m',
	'dew_point_2m',
	'pressure_msl',
	'visibility',
	'is_day',
	'uv_index',
];

const DAILY_VARS = [
	'weather_code',
	'temperature_2m_max',
	'temperature_2m_min',
	'apparent_temperature_max',
	'apparent_temperature_min',
	'sunrise',
	'sunset',
	'daylight_duration',
	'sunshine_duration',
	'uv_index_max',
	'precipitation_sum',
	'precipitation_probability_max',
	'wind_speed_10m_max',
	'wind_gusts_10m_max',
	'wind_direction_10m_dominant',
];

const CURRENT_VARS = [
	'temperature_2m',
	'apparent_temperature',
	'relative_humidity_2m',
	'is_day',
	'precipitation',
	'weather_code',
	'cloud_cover',
	'pressure_msl',
	'surface_pressure',
	'wind_speed_10m',
	'wind_direction_10m',
	'wind_gusts_10m',
	'visibility',
];

async function fetchJSON(url, params) {
	const qs = new URLSearchParams(params).toString();
	const res = await fetch(`${url}?${qs}`);
	if (!res.ok) throw new Error(`Open-Meteo request failed (${res.status})`);
	return res.json();
}

/** Geocoding search */
export function searchPlaces(query, count = 8, lang = 'en') {
	return fetchJSON(GEO_URL, {
		name: query,
		count,
		format: 'json',
		language: lang,
	});
}

/** Reverse geocode-ish label for a lat/lon (best-effort using nearest place search) */
export function reverseGeocode(lat, lon) {
	return fetchJSON(GEO_URL, {
		latitude: lat,
		longitude: lon,
		count: 1,
		format: 'json',
	}).catch(() => null);
}

/** Full forecast: current + hourly + daily + utc offset info */
export function fetchForecast(lat, lon, timezone = 'auto') {
	return fetchJSON(FORECAST_URL, {
		latitude: lat,
		longitude: lon,
		timezone,
		current: CURRENT_VARS.join(','),
		hourly: HOURLY_VARS.join(','),
		daily: DAILY_VARS.join(','),
		forecast_days: 8,
		past_days: 0,
		models: 'best_match',
	});
}

/** Air quality for location */
export function fetchAirQuality(lat, lon) {
	return fetchJSON(AQ_URL, {
		latitude: lat,
		longitude: lon,
		current:
			'european_aqi,us_aqi,pm10,pm2_5,carbon_monoxide,nitrogen_dioxide,sulphur_dioxide,ozone',
		timezone: 'auto',
	}).catch(() => null); // AQI is optional — never break the app
}
