// ============================================================
// utils.js — formatting, conversion, time helpers, storage
// ============================================================

export const UNITS = {
	metric: {
		temp: '°C',
		wind: 'km/h',
		precip: 'mm',
		vis: 'km',
		pressure: 'hPa',
	},
	imperial: {
		temp: '°F',
		wind: 'mph',
		precip: 'in',
		vis: 'mi',
		pressure: 'inHg',
	},
};

/** Convert Celsius → display unit */
export function tempFromC(c, unit) {
	if (c === null || c === undefined || Number.isNaN(c)) return null;
	return unit === 'imperial' ? (c * 9) / 5 + 32 : c;
}

export function fmtTemp(c, unit, decimals = 0) {
	const v = tempFromC(c, unit);
	if (v === null) return '—';
	return `${v.toFixed(decimals)}${UNITS[unit].temp}`;
}

export function fmtTempDelta(c, unit) {
	const v = tempFromC(c, unit);
	if (v === null) return '';
	return `${v.toFixed(0)}${UNITS[unit].temp}`;
}

/** Convert km/h → display unit */
export function windFromKmh(kmh, unit) {
	if (kmh === null || kmh === undefined) return null;
	return unit === 'imperial' ? kmh * 0.621371 : kmh;
}

export function fmtWind(kmh, unit, withUnit = true) {
	const v = windFromKmh(kmh, unit);
	if (v === null) return '—';
	return withUnit ? `${v.toFixed(0)} ${UNITS[unit].wind}` : v.toFixed(0);
}

/** mm → display unit */
export function fmtPrecip(mm, unit) {
	if (mm === null || mm === undefined) return '—';
	if (unit === 'imperial') return `${(mm / 25.4).toFixed(2)} in`;
	return `${mm.toFixed(1)} mm`;
}

export function fmtVisibility(m, unit) {
	if (m === null || m === undefined) return '—';
	if (unit === 'imperial') return `${(m / 1609.344).toFixed(1)} mi`;
	return `${(m / 1000).toFixed(1)} km`;
}

export function fmtPressure(hpa, unit) {
	if (hpa === null || hpa === undefined) return '—';
	if (unit === 'imperial') return `${(hpa * 0.02953).toFixed(2)} inHg`;
	return `${hpa.toFixed(0)} hPa`;
}

/** Wind direction degrees → compass point */
const COMPASS = [
	'N',
	'NNE',
	'NE',
	'ENE',
	'E',
	'ESE',
	'SE',
	'SSE',
	'S',
	'SSW',
	'SW',
	'WSW',
	'W',
	'WNW',
	'NW',
	'NNW',
];

export function degToCompass(deg) {
	if (deg === null || deg === undefined) return '—';
	return COMPASS[Math.round((((deg % 360) + 360) % 360) / 22.5) % 16];
}

/** ISO 2-letter country code → flag emoji */
export function countryFlag(code) {
	if (!code || code.length !== 2) return '';
	const cc = code.toUpperCase();
	if (cc === 'XK') return '🇽🇰';
	return String.fromCodePoint(...[...cc].map((c) => 0x1f1a5 + c.charCodeAt(0)));
}

/** Parse an Open-Meteo local-time ISO string into a Date (treated as local) */
export function parseLocal(iso) {
	if (!iso) return null;
	// Open-Meteo returns "2026-08-17T14:00" (no tz) in the location's local time
	const m = iso.match(/^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})/);
	if (!m) return new Date(iso);
	return new Date(+m[1], +m[2] - 1, +m[3], +m[4], +m[5]);
}

export function hourLabel(iso, locale) {
	const d = parseLocal(iso);
	return d.toLocaleTimeString(locale || undefined, { hour: 'numeric' });
}

export function weekdayName(dateStr, opts = { weekday: 'long' }) {
	const d = parseLocal(dateStr + 'T12:00');
	return d.toLocaleDateString(undefined, opts);
}

export function fmtClock(d, locale) {
	return d.toLocaleTimeString(locale || undefined, {
		hour: '2-digit',
		minute: '2-digit',
	});
}

export function fmtDate(dateStr, locale) {
	const d = parseLocal(dateStr + 'T12:00');
	return d.toLocaleDateString(locale || undefined, {
		month: 'short',
		day: 'numeric',
	});
}

/** "now", "in 2 h", "in 3 d" style relative labels (approximate) */
export function relativeLabel(ms) {
	const abs = Math.abs(ms);
	const min = Math.round(abs / 60000);
	if (min < 1) return 'now';
	if (min < 60) return ms > 0 ? `in ${min} min` : `${min} min ago`;
	const h = Math.round(min / 60);
	if (h < 24) return ms > 0 ? `in ${h} h` : `${h} h ago`;
	const d = Math.round(h / 24);
	return ms > 0 ? `in ${d} d` : `${d} d ago`;
}

// ---------- localStorage ----------
const LS_PREFIX = 'nimbus:';

export function loadLS(key, fallback) {
	try {
		const raw = localStorage.getItem(LS_PREFIX + key);
		return raw === null ? fallback : JSON.parse(raw);
	} catch {
		return fallback;
	}
}

export function saveLS(key, value) {
	try {
		localStorage.setItem(LS_PREFIX + key, JSON.stringify(value));
	} catch {
		/* storage unavailable */
	}
}

export function debounce(fn, ms) {
	let t;
	return (...args) => {
		clearTimeout(t);
		t = setTimeout(() => fn(...args), ms);
	};
}

export function clamp(v, lo, hi) {
	return Math.min(hi, Math.max(lo, v));
}

/** Escape text for safe HTML interpolation */
const AMP = String.fromCharCode(38);

export function esc(s) {
	return String(s ?? '').replace(/[&<>"']/g, (c) => {
		switch (c) {
			case AMP:
				return AMP + 'amp;';
			case '<':
				return AMP + 'lt;';
			case '>':
				return AMP + 'gt;';
			case '"':
				return AMP + 'quot;';
			case "'":
				return AMP + '#39;';
			default:
				return c;
		}
	});
}
