// ============================================================
// icons.js — animated SVG weather icons for WMO weather codes
// ============================================================

/**
 * WMO weather interpretation codes → metadata
 * https://open-meteo.com/en/docs (WMO Weather interpretation codes)
 */
export const WMO = {
	0: { label: 'Clear sky', group: 'clear' },
	1: { label: 'Mainly clear', group: 'clear' },
	2: { label: 'Partly cloudy', group: 'partly' },
	3: { label: 'Overcast', group: 'cloudy' },
	45: { label: 'Fog', group: 'fog' },
	48: { label: 'Depositing rime fog', group: 'fog' },
	51: { label: 'Light drizzle', group: 'drizzle' },
	53: { label: 'Moderate drizzle', group: 'drizzle' },
	55: { label: 'Dense drizzle', group: 'drizzle' },
	56: { label: 'Freezing drizzle', group: 'drizzle' },
	57: { label: 'Dense freezing drizzle', group: 'drizzle' },
	61: { label: 'Slight rain', group: 'rain' },
	63: { label: 'Moderate rain', group: 'rain' },
	65: { label: 'Heavy rain', group: 'rain' },
	66: { label: 'Freezing rain', group: 'rain' },
	67: { label: 'Heavy freezing rain', group: 'rain' },
	71: { label: 'Slight snowfall', group: 'snow' },
	73: { label: 'Moderate snowfall', group: 'snow' },
	75: { label: 'Heavy snowfall', group: 'snow' },
	77: { label: 'Snow grains', group: 'snow' },
	80: { label: 'Slight rain showers', group: 'rain' },
	81: { label: 'Moderate rain showers', group: 'rain' },
	82: { label: 'Violent rain showers', group: 'rain' },
	85: { label: 'Slight snow showers', group: 'snow' },
	86: { label: 'Heavy snow showers', group: 'snow' },
	95: { label: 'Thunderstorm', group: 'thunder' },
	96: { label: 'Thunderstorm with hail', group: 'thunder' },
	99: { label: 'Thunderstorm with heavy hail', group: 'thunder' },
};

export function wmoInfo(code) {
	return WMO[code] || { label: 'Unknown', group: 'cloudy' };
}

let uid = 0;
const nid = (p) => `${p}${++uid}`;

/** Build the <defs> gradients shared by icons */
function defs(ids) {
	return `
  <defs>
    <linearGradient id="${ids.sun}" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#ffd66b"/><stop offset="100%" stop-color="#ff9f43"/>
    </linearGradient>
    <linearGradient id="${ids.cloud}" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="#ffffff"/><stop offset="100%" stop-color="#cfd8e6"/>
    </linearGradient>
    <linearGradient id="${ids.dark}" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="#b6c2d4"/><stop offset="100%" stop-color="#7d8ba1"/>
    </linearGradient>
    <radialGradient id="${ids.moon}" cx="35%" cy="35%" r="80%">
      <stop offset="0%" stop-color="#fff7d6"/><stop offset="100%" stop-color="#f2cf6b"/>
    </radialGradient>
  </defs>`;
}

function sun(cx = 32, cy = 32, r = 13, id) {
	let rays = '';
	for (let i = 0; i < 8; i++) {
		const a = (i * Math.PI) / 4;
		const x1 = cx + Math.cos(a) * (r + 5);
		const y1 = cy + Math.sin(a) * (r + 5);
		const x2 = cx + Math.cos(a) * (r + 11);
		const y2 = cy + Math.sin(a) * (r + 11);
		rays += `<line x1="${x1.toFixed(1)}" y1="${y1.toFixed(1)}" x2="${x2.toFixed(1)}" y2="${y2.toFixed(1)}"/>`;
	}
	return `
  <g class="sun" style="transform-origin:${cx}px ${cy}px">
    <circle cx="${cx}" cy="${cy}" r="${r}" fill="url(#${id})"/>
    <g stroke="#ffb54d" stroke-width="3" stroke-linecap="round">${rays}</g>
  </g>`;
}

function moon(cx = 32, cy = 30, r = 13, id) {
	return `
  <g class="sun" style="transform-origin:${cx}px ${cy}px">
    <path d="M ${cx + r * 0.5} ${cy - r}
             A ${r} ${r} 0 1 0 ${cx + r} ${cy + r * 0.7}
             A ${r * 0.85} ${r * 0.85} 0 1 1 ${cx + r * 0.5} ${cy - r} Z"
          fill="url(#${id})"/>
  </g>`;
}

function cloud(x = 0, y = 0, fill, scale = 1, cls = 'cloud') {
	return `
  <g class="${cls}" transform="translate(${x} ${y}) scale(${scale})" fill="${fill}">
    <path d="M20 44
             a9 9 0 0 1 1.8-17.8 13 13 0 0 1 25-3.6A8.5 8.5 0 0 1 47 44 Z"/>
  </g>`;
}

function rainDrops(n = 3, cls = 'drops') {
	let out = '';
	const xs = n === 3 ? [22, 32, 42] : [26, 38];
	for (let i = 0; i < n; i++) {
		out += `<line class="drop" style="animation-delay:${i * 0.35}s"
      x1="${xs[i]}" y1="50" x2="${xs[i] - 2}" y2="58"
      stroke="#57b1ff" stroke-width="3" stroke-linecap="round"/>`;
	}
	return `<g class="${cls}">${out}</g>`;
}

function snowFlakes(n = 3) {
	let out = '';
	const xs = n === 3 ? [22, 32, 42] : [26, 38];
	for (let i = 0; i < n; i++) {
		out += `<circle class="flake" style="animation-delay:${i * 0.5}s"
      cx="${xs[i]}" cy="52" r="2.6" fill="#dff1ff"/>`;
	}
	return `<g>${out}</g>`;
}

function lightning() {
	return `<path class="bolt" d="M33 44 L26 56 h6 L28 66 L40 52 h-6 L38 44 Z" fill="#ffd93b"/>`;
}

function fogLines() {
	return `
  <g stroke="#c3cedd" stroke-width="3.4" stroke-linecap="round">
    <line class="fog f1" x1="16" y1="48" x2="46" y2="48"/>
    <line class="fog f2" x1="20" y1="55" x2="50" y2="55"/>
    <line class="fog f3" x1="16" y1="62" x2="44" y2="62"/>
  </g>`;
}

/**
 * Returns an animated SVG string for a weather icon.
 * @param {number} code WMO weather code
 * @param {boolean} isDay daytime variant
 * @param {string} size CSS size (px)
 */
export function weatherIconSVG(code, isDay = true, size = 64) {
	const ids = {
		sun: nid('su'),
		cloud: nid('cl'),
		dark: nid('dk'),
		moon: nid('mo'),
	};
	const g = wmoInfo(code).group;
	let body = '';

	switch (g) {
		case 'clear':
			body = isDay ? sun() : moon(32, 32, 14, ids.moon);
			break;
		case 'partly':
			body =
				(isDay ? sun(24, 24, 10, ids.sun) : moon(22, 22, 9, ids.moon)) +
				cloud(10, 16, `url(#${ids.cloud})`, 0.9);
			break;
		case 'cloudy':
			body =
				cloud(2, 6, `url(#${ids.dark})`, 0.72, 'cloud c2') +
				cloud(8, 12, `url(#${ids.cloud})`, 1);
			break;
		case 'fog':
			body = cloud(8, 4, `url(#${ids.dark})`, 0.85) + fogLines();
			break;
		case 'drizzle':
			body = cloud(8, 8, `url(#${ids.cloud})`, 1) + rainDrops(3);
			break;
		case 'rain':
			body =
				cloud(8, 8, `url(#${ids.dark})`, 1) + rainDrops(code >= 80 ? 3 : 3);
			break;
		case 'snow':
			body = cloud(8, 8, `url(#${ids.cloud})`, 1) + snowFlakes(3);
			break;
		case 'thunder':
			body =
				cloud(8, 6, `url(#${ids.dark})`, 1) +
				lightning() +
				(code >= 96 ? snowFlakes(2) : rainDrops(2));
			break;
		default:
			body = cloud(8, 12, `url(#${ids.cloud})`, 1);
	}

	return `<svg class="wicon" viewBox="0 0 64 64" width="${size}" height="${size}" role="img" aria-hidden="true">
    ${defs(ids)}${body}
  </svg>`;
}

/** Small inline stat icons (stroke-based, currentColor) */
export const STAT_ICONS = {
	humidity:
		'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><path d="M12 3s6 6.5 6 11a6 6 0 0 1-12 0c0-4.5 6-11 6-11Z"/></svg>',
	wind: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><path d="M3 8h9a3 3 0 1 0-3-3M3 12h13a3 3 0 1 1-3 3M3 16h7a2.5 2.5 0 1 1-2.5 2.5"/></svg>',
	pressure:
		'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><circle cx="12" cy="12" r="9"/><path d="M12 12l4-4M12 7v1M17 12h-1M12 17v-1M7 12h1"/></svg>',
	visibility:
		'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M2 12s3.5-6.5 10-6.5S22 12 22 12s-3.5 6.5-10 6.5S2 12 2 12Z"/><circle cx="12" cy="12" r="2.8"/></svg>',
	uv: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><circle cx="12" cy="12" r="4.2"/><path d="M12 2.5v2.4M12 19.1v2.4M2.5 12h2.4M19.1 12h2.4M5 5l1.7 1.7M17.3 17.3 19 19M19 5l-1.7 1.7M6.7 17.3 5 19"/></svg>',
	sunrise:
		'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><path d="M4 18h16M7 18a5 5 0 0 1 10 0M12 4v5M9.5 6.5 12 9l2.5-2.5"/></svg>',
	sunset:
		'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><path d="M4 18h16M7 18a5 5 0 0 1 10 0M12 9V4M9.5 6.5 12 4l2.5 2.5"/></svg>',
	feels:
		'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><path d="M10 13.5V5a2 2 0 1 1 4 0v8.5a4 4 0 1 1-4 0Z"/></svg>',
	precip:
		'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><path d="M12 3s6 6.5 6 11a6 6 0 0 1-12 0c0-4.5 6-11 6-11Z"/><path d="M9 14l-1.5 4M13.5 14 12 18"/></svg>',
	dew: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><path d="M12 3s6 6.5 6 11a6 6 0 0 1-12 0c0-4.5 6-11 6-11Z"/><circle cx="12" cy="14" r="2.4"/></svg>',
};
