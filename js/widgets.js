// ============================================================
// widgets.js — sun path, wind compass, AQI gauge, outlook
// ============================================================

import {
	degToCompass,
	fmtClock,
	fmtPrecip,
	fmtTemp,
	fmtVisibility,
	fmtWind,
	parseLocal,
} from './utils.js';

import { weatherIconSVG, wmoInfo } from './icons.js';

/* ----------------------------------------------------------------
   Sun path widget — arc with animated sun position
   ---------------------------------------------------------------- */
export function renderSunPath(container, { sunrise, sunset, now, locale }) {
	const rise = parseLocal(sunrise);
	const set = parseLocal(sunset);
	const nowD = now instanceof Date ? now : new Date();

	const dayLen = set - rise;
	let frac = dayLen > 0 ? (nowD - rise) / dayLen : 0;
	frac = Math.min(1, Math.max(0, frac));
	const isDay = frac > 0 && frac < 1;

	const W = 300;
	const H = 130;
	const cx = W / 2;
	const cy = 112;
	const R = 96;

	const angle = Math.PI * (1 - frac); // PI → 0 across the arc
	const sx = cx + R * Math.cos(angle);
	const sy = cy - R * Math.sin(angle);

	const daySeconds = dayLen / 1000;
	const dh = Math.floor(daySeconds / 3600);
	const dm = Math.floor((daySeconds % 3600) / 60);

	const sunColor = isDay ? '#ffce54' : '#aab6c8';

	container.innerHTML = `
    <svg class="widget-svg" viewBox="0 0 ${W} ${H}">
      <path d="M ${cx - R} ${cy} A ${R} ${R} 0 0 1 ${cx + R} ${cy}"
        fill="none" stroke="currentColor" stroke-opacity=".18" stroke-width="2.5" stroke-dasharray="3 6" stroke-linecap="round"/>
      ${
				isDay
					? `<path d="M ${cx - R} ${cy} A ${R} ${R} 0 0 1 ${sx} ${sy}"
              fill="none" stroke="#ffce54" stroke-width="3" stroke-linecap="round" opacity=".9"/>`
					: ''
			}
      <circle cx="${sx}" cy="${sy}" r="9" fill="${sunColor}">
        ${isDay ? '<animate attributeName="opacity" values="1;.75;1" dur="2.6s" repeatCount="indefinite"/>' : ''}
      </circle>
      <circle cx="${sx}" cy="${sy}" r="15" fill="${sunColor}" opacity=".22"/>
      <line x1="14" y1="${cy}" x2="${W - 14}" y2="${cy}" stroke="currentColor" stroke-opacity=".22" stroke-width="1.5"/>
      <text x="20" y="${cy + 16}" font-size="10" fill="currentColor" opacity=".65">sunrise ${fmtClock(rise, locale)}</text>
      <text x="${W - 20}" y="${cy + 16}" font-size="10" fill="currentColor" opacity=".65" text-anchor="end">sunset ${fmtClock(set, locale)}</text>
    </svg>
    <div class="sun-times">
      <div>Sunrise<b>${fmtClock(rise, locale)}</b></div>
      <div>Daylight<b>${dh}h ${String(dm).padStart(2, '0')}m</b></div>
      <div>Sunset<b>${fmtClock(set, locale)}</b></div>
    </div>`;
}

/* ----------------------------------------------------------------
   Wind compass widget
   ---------------------------------------------------------------- */
export function renderWindCompass(
	container,
	{ speedKmh, gustKmh, direction, unit },
) {
	const dir = direction ?? 0;
	const compassDir = degToCompass(dir);

	container.innerHTML = `
    <svg class="widget-svg" viewBox="0 0 200 200">
      <circle cx="100" cy="100" r="86" fill="none" stroke="currentColor" stroke-opacity=".15" stroke-width="2"/>
      <circle cx="100" cy="100" r="64" fill="none" stroke="currentColor" stroke-opacity=".08" stroke-width="1"/>
      ${['N', 'E', 'S', 'W']
				.map((c, i) => {
					const a = (i * Math.PI) / 2 - Math.PI / 2;
					const x = 100 + Math.cos(a) * 74;
					const y = 100 + Math.sin(a) * 74 + 4;
					return `<text x="${x}" y="${y}" text-anchor="middle" font-size="13" font-weight="700" fill="currentColor" opacity="${c === 'N' ? '.9' : '.45'}">${c}</text>`;
				})
				.join('')}
      ${Array.from({ length: 12 }, (_, i) => {
				const a = (i * Math.PI) / 6;
				const x1 = 100 + Math.cos(a) * 82;
				const y1 = 100 + Math.sin(a) * 82;
				const x2 = 100 + Math.cos(a) * 86;
				const y2 = 100 + Math.sin(a) * 86;
				return `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="currentColor" stroke-opacity=".3" stroke-width="2"/>`;
			}).join('')}
      <g style="transform-origin:100px 100px; transform: rotate(${dir}deg); transition: transform .8s cubic-bezier(.2,.8,.3,1)">
        <path d="M100 30 L92 104 L100 96 L108 104 Z" fill="#5aa7ff"/>
        <path d="M100 170 L94 108 L100 114 L106 108 Z" fill="currentColor" opacity=".3"/>
      </g>
      <circle cx="100" cy="100" r="26" fill="var(--card-bg, rgba(255,255,255,.06))" stroke="currentColor" stroke-opacity=".15"/>
      <text x="100" y="97" text-anchor="middle" font-size="15" font-weight="700" fill="currentColor">${fmtWind(speedKmh, unit, false)}</text>
      <text x="100" y="112" text-anchor="middle" font-size="9" fill="currentColor" opacity=".6">${unit === 'imperial' ? 'mph' : 'km/h'} · ${compassDir}</text>
    </svg>
    <div class="wind-meta">
      <div>Direction <b>${dir.toFixed(0)}° ${compassDir}</b></div>
      <div>Gusts <b>${fmtWind(gustKmh, unit)}</b></div>
    </div>`;
}

/* ----------------------------------------------------------------
   AQI gauge (European AQI: 0-20+ / 0-100+)
   Bands: Good 0-20, Fair 20-40, Moderate 40-60, Poor 60-80, Very Poor 80-100, Extremely Poor >100
   ---------------------------------------------------------------- */
const AQI_BANDS = [
	{
		max: 20,
		label: 'Good',
		color: '#4ade80',
		advice: 'Air quality is excellent — enjoy the outdoors.',
	},
	{
		max: 40,
		label: 'Fair',
		color: '#a3e635',
		advice: 'Air quality is acceptable for most people.',
	},
	{
		max: 60,
		label: 'Moderate',
		color: '#facc15',
		advice:
			'Unusually sensitive people should consider limiting prolonged outdoor exertion.',
	},
	{
		max: 80,
		label: 'Poor',
		color: '#fb923c',
		advice: 'Sensitive groups should reduce outdoor exertion.',
	},
	{
		max: 100,
		label: 'Very poor',
		color: '#f87171',
		advice: 'Everyone should limit prolonged outdoor exertion.',
	},
	{
		max: Infinity,
		label: 'Extremely poor',
		color: '#c084fc',
		advice: 'Avoid outdoor activity; keep windows closed.',
	},
];

export function aqiBand(value) {
	return (
		AQI_BANDS.find((b) => value < b.max) || AQI_BANDS[AQI_BANDS.length - 1]
	);
}

export function renderAqi(container, { aqi, pm25, pm10, o3, no2, so2, co }) {
	if (aqi === null || aqi === undefined) {
		container.innerHTML = `<p style="color:var(--text-dim);font-size:.9rem">Air quality data is unavailable for this location.</p>`;
		return;
	}

	const band = aqiBand(aqi);
	const pos = Math.min(100, (aqi / 120) * 100);

	const pollutant = (name, v, unit) => `
    <div>${name}<b>${v === null || v === undefined ? '—' : v.toFixed(1)}</b>${unit}</div>`;

	container.innerHTML = `
    <div style="display:flex;align-items:center;gap:16px;flex-wrap:wrap">
      <div style="font-size:2.6rem;font-weight:200;line-height:1">${aqi.toFixed(0)}</div>
      <div>
        <div style="font-weight:700;color:${band.color}">${band.label}</div>
        <div style="font-size:.82rem;color:var(--text-dim)">European AQI</div>
      </div>
    </div>
    <div class="aqi-scale">
      ${AQI_BANDS.slice(0, 6)
				.map((b) => `<span style="background:${b.color}"></span>`)
				.join('')}
    </div>
    <div class="aqi-marker" style="--pos:${pos}%"></div>
    <div class="aqi-labels"><span>0</span><span>20</span><span>40</span><span>60</span><span>80</span><span>100+</span></div>
    <p style="margin-top:12px;font-size:.88rem;color:var(--text-dim)">${band.advice}</p>
    <div class="aqi-pollutants">
      ${pollutant('PM2.5', pm25, ' µg/m³')}
      ${pollutant('PM10', pm10, ' µg/m³')}
      ${pollutant('Ozone', o3, ' µg/m³')}
      ${pollutant('NO₂', no2, ' µg/m³')}
      ${pollutant('SO₂', so2, ' µg/m³')}
      ${pollutant('CO', co, ' µg/m³')}
    </div>`;
}

/* ----------------------------------------------------------------
   Outlook — a human-readable narrative built from the forecast
   ---------------------------------------------------------------- */
export function buildOutlook({ current, hourly, daily, unit, locale }) {
	const items = [];
	if (!current || !hourly?.length) return items;

	const icon = (code, isDay) =>
		`<span class="outlook-ico">${weatherIconSVG(code, isDay, 38)}</span>`;

	// 1. Rain in the next 12h
	const next12 = hourly.slice(0, 12);
	const wet = next12.filter((h) => h.precipProb >= 40 || h.precip > 0.1);
	if (wet.length) {
		const first = wet[0];
		const totalMm = wet.reduce((a, h) => a + (h.precip || 0), 0);
		items.push({
			icon: icon(61, true),
			title: `Rain likely within ${wet.length} of the next 12 hours`,
			text: `First chance around ${parseLocal(first.iso).toLocaleTimeString(locale || undefined, { hour: 'numeric' })} — about ${fmtPrecip(totalMm, unit)} total. Keep an umbrella handy.`,
		});
	} else {
		items.push({
			icon: icon(current.weather_code, current.is_day),
			title: 'No significant rain expected in the next 12 hours',
			text: `Conditions look mostly ${wmoInfo(current.weather_code).label.toLowerCase()} with a max ${Math.max(...next12.map((h) => h.precipProb || 0))}% chance of precipitation.`,
		});
	}

	// 2. Temperature trend vs yesterday-ish (first vs last of window)
	const nowT = current.temperature_2m;
	const maxToday = daily?.[0]?.tempMax;
	const minToday = daily?.[0]?.tempMin;
	if (maxToday !== undefined && minToday !== undefined) {
		items.push({
			icon: icon(0, true),
			title: `Today spans ${fmtTemp(minToday, unit)} → ${fmtTemp(maxToday, unit)}`,
			text: `Currently ${fmtTemp(nowT, unit)}. ${
				nowT < (maxToday + minToday) / 2
					? 'The warmest part of the day is still ahead.'
					: "You're past today's warmest stretch — it cools from here."
			}`,
		});
	}

	// 3. Wind highlight
	const gustMax = Math.max(...hourly.slice(0, 24).map((h) => h.gust || 0));
	if (gustMax > 40) {
		items.push({
			icon: icon(3, true),
			title: `Gusty winds up to ${fmtWind(gustMax, unit)}`,
			text: 'Secure loose outdoor items; expect blustery conditions at times over the next day.',
		});
	} else if ((current.wind_gusts_10m || 0) > 28) {
		items.push({
			icon: icon(3, true),
			title: `Breezy right now — gusts ${fmtWind(current.wind_gusts_10m, unit)}`,
			text: 'Winds ease off later; nothing severe expected.',
		});
	}

	// 4. Best day in the week (max temp + low precip)
	if (daily?.length) {
		const scored = daily
			.map((d, i) => ({ d, i, score: d.tempMax - (d.precipProb || 0) / 4 }))
			.sort((a, b) => b.score - a.score);
		const best = scored[0];
		if (best.i > 0) {
			const name = parseLocal(best.d.date + 'T12:00').toLocaleDateString(
				locale || undefined,
				{ weekday: 'long' },
			);
			items.push({
				icon: icon(best.d.code, true),
				title: `${name} looks like the best day this week`,
				text: `High of ${fmtTemp(best.d.tempMax, unit)} with only ${best.d.precipProb || 0}% chance of rain — ideal for plans outdoors.`,
			});
		}
	}

	// 5. Visibility note
	if ((current.visibility || 10000) < 4000) {
		items.push({
			icon: icon(45, current.is_day),
			title: `Reduced visibility (${fmtVisibility(current.visibility, unit)})`,
			text: 'Take extra care when driving; visibility may stay limited for a while.',
		});
	}

	return items.slice(0, 5);
}

export function renderOutlook(container, items) {
	if (!items.length) {
		container.innerHTML = `<p style="color:var(--text-dim)">Not enough data to build an outlook.</p>`;
		return;
	}
	container.innerHTML = items
		.map(
			(it) => `
      <div class="outlook-item">
        ${it.icon}
        <div class="outlook-txt"><b>${it.title}</b><span>${it.text}</span></div>
      </div>`,
		)
		.join('');
}
