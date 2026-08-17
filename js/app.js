// ============================================================
// app.js — Nimbus controller: state, routing, rendering
// ============================================================

import { fetchAirQuality, fetchForecast, searchPlaces } from './api.js';
import { createBackground, sceneFromCode } from './background.js';
import { renderHourlyChart } from './charts.js';
import { STAT_ICONS, weatherIconSVG, wmoInfo } from './icons.js';
import {
	clamp,
	countryFlag,
	debounce,
	degToCompass,
	esc,
	fmtClock,
	fmtDate,
	fmtPrecip,
	fmtPressure,
	fmtTemp,
	fmtVisibility,
	fmtWind,
	hourLabel,
	loadLS,
	saveLS,
	weekdayName,
} from './utils.js';
import {
	buildOutlook,
	renderAqi,
	renderOutlook,
	renderSunPath,
	renderWindCompass,
} from './widgets.js';

/* ---------------- state ---------------- */
const state = {
	place: null, // { name, lat, lon, region, country, countryCode }
	forecast: null, // raw Open-Meteo forecast
	hourly: [], // normalized hourly rows
	daily: [], // normalized daily rows
	aqi: null,
	unit: loadLS('unit', 'metric'),
	theme: loadLS('theme', 'auto'),
	favorites: loadLS('favorites', []),
	chart: null,
};

const bg = createBackground(document.getElementById('bg-canvas'));

const $ = (sel) => document.querySelector(sel);
const els = {
	searchInput: $('#search-input'),
	searchResults: $('#search-results'),
	searchWrap: $('#search-wrap'),
	favorites: $('#favorites'),
	hero: $('#hero'),
	stats: $('#stats'),
	chartCanvas: $('#hourly-chart'),
	chartTooltip: $('#chart-tooltip'),
	hourStrip: $('#hour-strip'),
	dailyList: $('#daily-list'),
	sunWidget: $('#sun-widget'),
	windWidget: $('#wind-widget'),
	aqiWidget: $('#aqi-widget'),
	outlookWidget: $('#outlook-widget'),
	errorPanel: $('#error-panel'),
	errorMsg: $('#error-msg'),
	toast: $('#toast'),
};

/* ---------------- theme ---------------- */
function applyTheme() {
	const resolved =
		state.theme === 'auto'
			? window.matchMedia('(prefers-color-scheme: light)').matches
				? 'light'
				: 'dark'
			: state.theme;
	document.documentElement.dataset.theme = resolved;
	$('#theme-toggle').textContent =
		state.theme === 'auto' ? '◐' : resolved === 'light' ? '☀' : '☾';
	$('#theme-toggle').title = `Theme: ${state.theme} (T)`;
}

window
	.matchMedia('(prefers-color-scheme: light)')
	.addEventListener('change', () => {
		if (state.theme === 'auto') {
			applyTheme();
			if (state.forecast) renderAll();
		}
	});

/* ---------------- toast ---------------- */
let toastTimer;
function toast(msg) {
	els.toast.textContent = msg;
	els.toast.hidden = false;
	requestAnimationFrame(() => els.toast.classList.add('show'));
	clearTimeout(toastTimer);
	toastTimer = setTimeout(() => {
		els.toast.classList.remove('show');
		setTimeout(() => (els.toast.hidden = true), 350);
	}, 2600);
}

/* ---------------- favorites ---------------- */
function renderFavorites() {
	els.favorites.innerHTML = state.favorites
		.map(
			(f) => `
      <span class="chip ${state.place && state.place.lat === f.lat && state.place.lon === f.lon ? 'current' : ''}"
            data-lat="${f.lat}" data-lon="${f.lon}" data-name="${esc(f.name)}" data-region="${esc(f.region || '')}" data-country="${esc(f.countryCode || '')}" role="button" tabindex="0">
        ${countryFlag(f.countryCode)} ${esc(f.name)}
        <button class="chip-x" data-x="${f.lat},${f.lon}" title="Remove" aria-label="Remove ${esc(f.name)}">×</button>
      </span>`,
		)
		.join('');
}

function toggleFavorite() {
	if (!state.place) return;
	const idx = state.favorites.findIndex(
		(f) => f.lat === state.place.lat && f.lon === state.place.lon,
	);
	if (idx >= 0) {
		state.favorites.splice(idx, 1);
		toast('Removed from favorites');
	} else {
		state.favorites.push({ ...state.place });
		if (state.favorites.length > 6) state.favorites.shift();
		toast('Saved to favorites');
	}
	saveLS('favorites', state.favorites);
	renderFavorites();
	updateFavButton();
}

function updateFavButton() {
	const btn = $('#fav-btn');
	if (!btn || !state.place) return;
	const isFav = state.favorites.some(
		(f) => f.lat === state.place.lat && f.lon === state.place.lon,
	);
	btn.classList.toggle('active', isFav);
	btn.textContent = isFav ? '★' : '☆';
	btn.title = isFav ? 'Remove from favorites' : 'Save to favorites';
}

/* ---------------- data normalization ---------------- */
function normalize(forecast) {
	const h = forecast.hourly;
	const d = forecast.daily;
	const hourly = h.time.map((iso, i) => ({
		iso,
		temp: h.temperature_2m[i],
		feels: h.apparent_temperature[i],
		precipProb: h.precipitation_probability?.[i],
		precip: h.precipitation?.[i],
		code: h.weather_code[i],
		cloud: h.cloud_cover?.[i],
		wind: h.wind_speed_10m[i],
		windDir: h.wind_direction_10m?.[i],
		gust: h.wind_gusts_10m?.[i],
		humidity: h.relative_humidity_2m?.[i],
		dew: h.dew_point_2m?.[i],
		pressure: h.pressure_msl?.[i],
		visibility: h.visibility?.[i],
		isDay: h.is_day?.[i] === 1,
		uv: h.uv_index?.[i],
	}));

	const daily = d.time.map((date, i) => ({
		date,
		code: d.weather_code[i],
		tempMax: d.temperature_2m_max[i],
		tempMin: d.temperature_2m_min[i],
		feelsMax: d.apparent_temperature_max?.[i],
		feelsMin: d.apparent_temperature_min?.[i],
		sunrise: d.sunrise[i],
		sunset: d.sunset[i],
		daylight: d.daylight_duration?.[i],
		sunshine: d.sunshine_duration?.[i],
		uvMax: d.uv_index_max?.[i],
		precipSum: d.precipitation_sum?.[i],
		precipProb: d.precipitation_probability_max?.[i],
		windMax: d.wind_speed_10m_max?.[i],
		gustMax: d.wind_gusts_10m_max?.[i],
		windDir: d.wind_direction_10m_dominant?.[i],
	}));

	return { hourly, daily };
}

/** Current wall-clock in the location's timezone (using the API's utc_offset_seconds) */
function locationNow(forecast) {
	const offsetS = forecast.utc_offset_seconds || 0;
	return new Date(
		Date.now() + new Date().getTimezoneOffset() * 60000 + offsetS * 1000,
	);
}

/** Index of the current hour within the hourly arrays */
function currentHourIndex(forecast, hourly) {
	const nowIso = locationNow(forecast).toISOString(); // UTC-based but tz-shifted
	const nowStr = `${nowIso.slice(0, 13)}:00`;
	const idx = hourly.findIndex(
		(h) => h.iso.slice(0, 14) >= nowStr.slice(0, 14),
	);
	return clamp(idx < 0 ? 0 : idx, 0, hourly.length - 1);
}

/* ---------------- loading ---------------- */
async function loadPlace(place, { pushHash = true } = {}) {
	state.place = place;
	if (pushHash) setHash(place);
	renderFavorites();
	showError(false);
	showSkeletons();
	bg.setScene('partly', true);
	bg.start();

	try {
		const forecast = await fetchForecast(place.lat, place.lon);
		state.forecast = forecast;
		const { hourly, daily } = normalize(forecast);
		state.hourly = hourly;
		state.daily = daily;
		saveLS('last-place', place);
		document.title = `${place.name} — ${fmtTemp(forecast.current.temperature_2m, state.unit)} · Nimbus`;
		renderAll();
		fetchAirQuality(place.lat, place.lon).then((aq) => {
			state.aqi = aq?.current ?? null;
			renderAqiWidget();
		});
	} catch (err) {
		console.error(err);
		showError(err.message || 'Network error');
	}
}

function showSkeletons() {
	els.hero.innerHTML = `
    <div class="skeleton sk-line" style="width:38%"></div>
    <div class="skeleton sk-line" style="width:24%;margin-top:10px"></div>
    <div class="skeleton sk-hero" style="margin-top:22px"></div>
    <div class="skeleton sk-line" style="width:55%;margin-top:22px"></div>`;
}

function showError(msg) {
	if (!msg) {
		els.errorPanel.hidden = true;
		return;
	}
	els.errorPanel.hidden = false;
	els.errorMsg.textContent = msg;
}

/* ---------------- rendering ---------------- */
function renderAll() {
	const f = state.forecast;
	if (!f) return;
	renderHero();
	renderStats();
	renderChartAndStrip();
	renderDaily();
	renderSunWidget();
	renderWindWidget();
	renderAqiWidget();
	renderOutlookWidget();
	revealCards();
}

function revealCards() {
	document.querySelectorAll('.reveal').forEach((el, i) => {
		el.classList.remove('in');
		setTimeout(() => el.classList.add('in'), 40 + i * 70);
	});
}

function renderHero() {
	const f = state.forecast;
	const c = f.current;
	const info = wmoInfo(c.weather_code);
	const today = state.daily[0] || {};
	const place = state.place;
	const nowLocal = locationNow(f);
	const isFav = state.favorites.some(
		(x) => x.lat === place.lat && x.lon === place.lon,
	);

	const uvNow =
		c.uv_index ?? state.hourly[currentHourIndex(f, state.hourly)]?.uv;

	els.hero.innerHTML = `
    <div class="hero-updated">Local time ${fmtClock(nowLocal)}</div>
    <div class="hero-top">
      <span class="hero-loc">${esc(place.name)}</span>
      <span class="hero-region">${esc(place.region || '')}</span>
      <span class="hero-flag">${countryFlag(place.countryCode)}</span>
      <button id="fav-btn" class="hero-fav-btn ${isFav ? 'active' : ''}" title="${isFav ? 'Remove from favorites' : 'Save to favorites'}" aria-label="Toggle favorite">${isFav ? '★' : '☆'}</button>
    </div>
    <div class="hero-main">
      <div class="hero-icon">${weatherIconSVG(c.weather_code, c.is_day === 1, 130)}</div>
      <div>
        <div class="hero-temp">${fmtTemp(c.temperature_2m, state.unit)}</div>
        <div class="hero-desc">${info.label}</div>
        <div class="hero-feels">Feels like ${fmtTemp(c.apparent_temperature, state.unit)}</div>
      </div>
    </div>
    <div class="hero-hilo">
      <span>H: <b>${fmtTemp(today.tempMax, state.unit)}</b></span>
      <span>L: <b>${fmtTemp(today.tempMin, state.unit)}</b></span>
      <span>UV: <b>${uvNow == null ? '—' : Math.round(uvNow)}</b></span>
      <span>Humidity: <b>${c.relative_humidity_2m ?? '—'}%</b></span>
    </div>`;

	$('#fav-btn').addEventListener('click', toggleFavorite);

	bg.setScene(sceneFromCode(c.weather_code), c.is_day === 1);
	bg.start();
}

function renderStats() {
	const f = state.forecast;
	const c = f.current;
	const hi = currentHourIndex(f, state.hourly);
	const h = state.hourly[hi] || {};
	const u = state.unit;

	const items = [
		{
			icon: STAT_ICONS.feels,
			label: 'Feels like',
			value: fmtTemp(c.apparent_temperature, u),
			sub: humidityVerdict(c.relative_humidity_2m),
		},
		{
			icon: STAT_ICONS.wind,
			label: 'Wind',
			value: fmtWind(c.wind_speed_10m, u),
			sub: `${degToCompass(c.wind_direction_10m)} · gusts ${fmtWind(c.wind_gusts_10m, u)}`,
		},
		{
			icon: STAT_ICONS.humidity,
			label: 'Humidity',
			value: `${c.relative_humidity_2m ?? '—'}%`,
			sub: `Dew point ${fmtTemp(h.dew, u)}`,
		},
		{
			icon: STAT_ICONS.pressure,
			label: 'Pressure',
			value: fmtPressure(c.pressure_msl, u),
			sub: pressureVerdict(c.pressure_msl),
		},
		{
			icon: STAT_ICONS.visibility,
			label: 'Visibility',
			value: fmtVisibility(h.visibility ?? c.visibility, u),
			sub: (h.visibility ?? 10000) >= 10000 ? 'Excellent' : 'Reduced',
		},
		{
			icon: STAT_ICONS.uv,
			label: 'UV index',
			value: h.uv == null ? '—' : Math.round(h.uv),
			sub: uvVerdict(h.uv),
		},
		{
			icon: STAT_ICONS.precip,
			label: 'Precipitation',
			value: fmtPrecip(h.precip, u),
			sub: `${h.precipProb ?? 0}% chance this hour`,
		},
		{
			icon: STAT_ICONS.sunrise,
			label: 'Cloud cover',
			value: `${c.cloud_cover ?? h.cloud ?? '—'}%`,
			sub: `${h.cloud ?? c.cloud_cover ?? 0}% of sky covered`,
		},
	];

	els.stats.innerHTML = items
		.map(
			(it) => `
      <div class="card stat-card">
        <div class="stat-head">${it.icon} ${it.label}</div>
        <div class="stat-value">${it.value}</div>
        <div class="stat-sub">${it.sub}</div>
      </div>`,
		)
		.join('');
}

function humidityVerdict(h) {
	if (h == null) return '';
	if (h < 30) return 'Dry air';
	if (h < 60) return 'Comfortable';
	if (h < 80) return 'A bit muggy';
	return 'Very humid';
}

function pressureVerdict(p) {
	if (p == null) return '';
	if (p > 1022) return 'High — settled weather';
	if (p < 1008) return 'Low — changeable';
	return 'Normal';
}

function uvVerdict(uv) {
	if (uv == null) return '';
	if (uv < 3) return 'Low';
	if (uv < 6) return 'Moderate';
	if (uv < 8) return 'High';
	if (uv < 11) return 'Very high';
	return 'Extreme';
}

/* ---------------- chart + strip ---------------- */
function chartHours() {
	const f = state.forecast;
	const start = currentHourIndex(f, state.hourly);
	return state.hourly.slice(start, start + 48).map((h) => ({
		iso: h.iso,
		temp: h.temp,
		precipProb: h.precipProb,
		precip: h.precip,
		code: h.code,
		wind: h.wind,
	}));
}

function renderChartAndStrip() {
	const hours = chartHours();

	if (state.chart) state.chart.destroy();
	state.chart = renderHourlyChart(els.chartCanvas, {
		hours,
		unit: state.unit,
		locale: undefined,
		tooltipEl: els.chartTooltip,
		onHover: () => {},
	});

	// hour strip: next 24
	const f = state.forecast;
	const start = currentHourIndex(f, state.hourly);
	els.hourStrip.innerHTML = state.hourly
		.slice(start, start + 24)
		.map((h, i) => {
			const isNow = i === 0;
			return `
      <button class="hour-cell ${isNow ? 'now' : ''}" title="${wmoInfo(h.code).label} · ${h.precipProb ?? 0}% precip · wind ${fmtWind(h.wind, state.unit)}" aria-label="${hourLabel(h.iso)}: ${fmtTemp(h.temp, state.unit)}, ${wmoInfo(h.code).label}">
        <span class="hc-time">${isNow ? 'Now' : hourLabel(h.iso)}</span>
        <span class="hc-icon">${weatherIconSVG(h.code, h.isDay, 34)}</span>
        <span class="hc-temp">${fmtTemp(h.temp, state.unit)}</span>
        <span class="hc-precip">${h.precipProb >= 20 ? `${h.precipProb}%` : ''}</span>
      </button>`;
		})
		.join('');
}

/* ---------------- daily ---------------- */
function renderDaily() {
	const f = state.forecast;
	const nowIdx = currentHourIndex(f, state.hourly);
	const nowTemp = state.hourly[nowIdx]?.temp;

	const weekMin = Math.min(...state.daily.map((d) => d.tempMin));
	const weekMax = Math.max(...state.daily.map((d) => d.tempMax));
	const span = Math.max(1, weekMax - weekMin);

	const today = state.daily[0];

	els.dailyList.innerHTML = state.daily
		.map((d, i) => {
			const name = i === 0 ? 'Today' : weekdayName(d.date);
			const dateLabel = fmtDate(d.date);
			const leftPct = ((d.tempMin - weekMin) / span) * 100;
			const widthPct = Math.max(4, ((d.tempMax - d.tempMin) / span) * 100);

			let nowDot = '';
			if (i === 0 && nowTemp != null) {
				const pos = clamp(
					((nowTemp - d.tempMin) / Math.max(0.1, d.tempMax - d.tempMin)) * 100,
					0,
					100,
				);
				nowDot = `<span class="now-dot" style="left:${pos}%"></span>`;
			}

			return `
      <button class="day-row" data-day="${i}" aria-label="${name}: high ${fmtTemp(d.tempMax, state.unit)}, low ${fmtTemp(d.tempMin, state.unit)}">
        <span class="dr-name">${name}<small>${dateLabel}</small></span>
        <span class="dr-icon">${weatherIconSVG(d.code, true, 38)}</span>
        <span class="dr-pop">${d.precipProb >= 20 ? `${d.precipProb}%` : ''}</span>
        <span class="dr-bar"><span class="dr-bar-fill" style="left:${leftPct}%;width:${widthPct}%"></span>${nowDot}</span>
        <span class="dr-temps"><span class="lo">${fmtTemp(d.tempMin, state.unit)}</span><span class="hi">${fmtTemp(d.tempMax, state.unit)}</span></span>
      </button>`;
		})
		.join('');

	// Day detail on click → toast with extra info
	els.dailyList.querySelectorAll('.day-row').forEach((row) => {
		row.addEventListener('click', () => {
			const d = state.daily[+row.dataset.day];
			const info = wmoInfo(d.code);
			toast(
				`${info.label} · feels ${fmtTemp(d.feelsMax, state.unit)} · wind ${fmtWind(d.windMax, state.unit)} · rain ${fmtPrecip(d.precipSum, state.unit)} · UV ${d.uvMax == null ? '—' : Math.round(d.uvMax)}`,
			);
		});
	});
}

/* ---------------- widgets ---------------- */
function renderSunWidget() {
	const today = state.daily[0];
	if (!today) return;
	renderSunPath(els.sunWidget, {
		sunrise: today.sunrise,
		sunset: today.sunset,
		now: locationNow(state.forecast),
	});
}

function renderWindWidget() {
	const c = state.forecast.current;
	renderWindCompass(els.windWidget, {
		speedKmh: c.wind_speed_10m,
		gustKmh: c.wind_gusts_10m,
		direction: c.wind_direction_10m,
		unit: state.unit,
	});
}

function renderAqiWidget() {
	if (!state.aqi) {
		renderAqi(els.aqiWidget, { aqi: null });
		return;
	}
	renderAqi(els.aqiWidget, {
		aqi: state.aqi.european_aqi ?? state.aqi.us_aqi,
		pm25: state.aqi.pm2_5,
		pm10: state.aqi.pm10,
		o3: state.aqi.ozone,
		no2: state.aqi.nitrogen_dioxide,
		so2: state.aqi.sulphur_dioxide,
		co: state.aqi.carbon_monoxide,
	});
}

function renderOutlookWidget() {
	const f = state.forecast;
	const start = currentHourIndex(f, state.hourly);
	const items = buildOutlook({
		current: f.current,
		hourly: state.hourly.slice(start),
		daily: state.daily,
		unit: state.unit,
	});
	renderOutlook(els.outlookWidget, items);
}

/* ---------------- search ---------------- */
const doSearch = debounce(async () => {
	const q = els.searchInput.value.trim();
	if (q.length < 2) {
		els.searchResults.hidden = true;
		return;
	}
	try {
		const res = await searchPlaces(q);
		const results = res.results || [];
		if (!results.length) {
			els.searchResults.innerHTML = `<div class="search-noresults">No places found for “${esc(q)}”</div>`;
		} else {
			els.searchResults.innerHTML = results
				.map(
					(r) => `
        <button class="search-result" data-name="${esc(r.name)}" data-region="${esc(r.admin1 || '')}"
                data-lat="${r.latitude}" data-lon="${r.longitude}" data-cc="${esc(r.country_code || '')}" role="option">
          <span><span class="sr-name">${esc(r.name)}</span> <span class="sr-region">${esc([r.admin1, r.country].filter(Boolean).join(', '))}</span></span>
          <span class="sr-flag">${countryFlag(r.country_code)}</span>
        </button>`,
				)
				.join('');
		}
		els.searchResults.hidden = false;
	} catch {
		els.searchResults.hidden = true;
	}
}, 300);

let activeResult = -1;

function selectResult(btn) {
	const place = {
		name: btn.dataset.name,
		region: btn.dataset.region,
		lat: +btn.dataset.lat,
		lon: +btn.dataset.lon,
		countryCode: btn.dataset.cc,
	};
	els.searchResults.hidden = true;
	els.searchInput.value = '';
	els.searchInput.blur();
	loadPlace(place);
}

els.searchInput.addEventListener('input', doSearch);
els.searchInput.addEventListener('focus', () => {
	if (els.searchResults.innerHTML.trim()) els.searchResults.hidden = false;
});

els.searchResults.addEventListener('click', (e) => {
	const btn = e.target.closest('.search-result');
	if (btn) selectResult(btn);
});

document.addEventListener('click', (e) => {
	if (!els.searchWrap.contains(e.target)) els.searchResults.hidden = true;
});

els.searchInput.addEventListener('keydown', (e) => {
	const items = [...els.searchResults.querySelectorAll('.search-result')];
	if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
		e.preventDefault();
		activeResult =
			e.key === 'ArrowDown'
				? (activeResult + 1) % items.length
				: (activeResult - 1 + items.length) % items.length;
		items.forEach((el, i) => el.classList.toggle('active', i === activeResult));
		items[activeResult]?.scrollIntoView({ block: 'nearest' });
	} else if (e.key === 'Enter' && activeResult >= 0 && items[activeResult]) {
		selectResult(items[activeResult]);
	} else if (e.key === 'Escape') {
		els.searchResults.hidden = true;
		els.searchInput.blur();
	}
});

/* favorites chip clicks (event delegation) */
els.favorites.addEventListener('click', (e) => {
	const x = e.target.closest('.chip-x');
	if (x) {
		const [lat, lon] = x.dataset.x.split(',').map(Number);
		state.favorites = state.favorites.filter(
			(f) => !(f.lat === lat && f.lon === lon),
		);
		saveLS('favorites', state.favorites);
		renderFavorites();
		updateFavButton();
		return;
	}
	const chip = e.target.closest('.chip');
	if (chip) {
		loadPlace({
			name: chip.dataset.name,
			region: chip.dataset.region,
			lat: +chip.dataset.lat,
			lon: +chip.dataset.lon,
			countryCode: chip.dataset.country,
		});
	}
});

/* ---------------- controls ---------------- */
$('#unit-toggle').addEventListener('click', () => {
	state.unit = state.unit === 'metric' ? 'imperial' : 'metric';
	saveLS('unit', state.unit);
	$('#unit-toggle').textContent = state.unit === 'metric' ? '°C' : '°F';
	if (state.forecast) renderAll();
});

$('#theme-toggle').addEventListener('click', () => {
	const cycle = { dark: 'light', light: 'auto', auto: 'dark' };
	state.theme = cycle[state.theme] || 'auto';
	saveLS('theme', state.theme);
	applyTheme();
	if (state.forecast) {
		renderChartAndStrip();
	} // refresh chart colors
});

$('#locate-btn').addEventListener('click', () => {
	if (!navigator.geolocation)
		return toast('Geolocation is not supported by this browser');
	toast('Locating you…');
	navigator.geolocation.getCurrentPosition(
		async (pos) => {
			const { latitude, longitude } = pos.coords;
			loadPlace({
				name: 'My location',
				region: `${latitude.toFixed(2)}, ${longitude.toFixed(2)}`,
				lat: latitude,
				lon: longitude,
				countryCode: '',
			});
		},
		(err) =>
			toast(
				err.code === 1
					? 'Location permission denied'
					: 'Could not determine your location',
			),
	);
});

$('#share-btn').addEventListener('click', async () => {
	if (!state.place) return;
	const url = location.href.split('#')[0] + buildHash(state.place);
	try {
		await navigator.clipboard.writeText(url);
		toast('Link copied to clipboard');
	} catch {
		toast(url);
	}
});

$('#retry-btn').addEventListener(
	'click',
	() => state.place && loadPlace(state.place, { pushHash: false }),
);

$('#brand')?.addEventListener?.('click', () =>
	scrollTo({ top: 0, behavior: 'smooth' }),
);
document
	.querySelector('.brand')
	?.addEventListener('click', () => scrollTo({ top: 0, behavior: 'smooth' }));

/* keyboard shortcuts */
document.addEventListener('keydown', (e) => {
	const tag = document.activeElement?.tagName;
	const typing = tag === 'INPUT' || tag === 'TEXTAREA';
	if (e.key === '/' && !typing) {
		e.preventDefault();
		els.searchInput.focus();
	} else if ((e.key === 'u' || e.key === 'U') && !typing) {
		$('#unit-toggle').click();
	} else if ((e.key === 't' || e.key === 'T') && !typing) {
		$('#theme-toggle').click();
	} else if (e.key === 'Escape' && !typing) {
		els.searchResults.hidden = true;
	}
});

/* ---------------- hash routing (deep links) ---------------- */
function buildHash(place) {
	return `#${place.lat.toFixed(4)},${place.lon.toFixed(4)}/${encodeURIComponent(place.name)}${place.countryCode ? '/' + place.countryCode : ''}${place.region ? '/' + encodeURIComponent(place.region) : ''}`;
}

function setHash(place) {
	history.replaceState(null, '', buildHash(place));
}

function parseHash() {
	const m = location.hash.match(
		/^#(-?[\d.]+),(-?[\d.]+)\/([^/]+)(?:\/([A-Za-z]{2}))?(?:\/(.+))?$/,
	);
	if (!m) return null;
	return {
		lat: +m[1],
		lon: +m[2],
		name: decodeURIComponent(m[3]),
		countryCode: m[4] || '',
		region: m[5] ? decodeURIComponent(m[5]) : '',
	};
}

window.addEventListener('hashchange', () => {
	const p = parseHash();
	if (
		p &&
		(!state.place || p.lat !== state.place.lat || p.lon !== state.place.lon)
	) {
		loadPlace(p, { pushHash: false });
	}
});

/* ---------------- init ---------------- */
function init() {
	applyTheme();
	$('#unit-toggle').textContent = state.unit === 'metric' ? '°C' : '°F';
	renderFavorites();

	const fromHash = parseHash();
	if (fromHash) {
		loadPlace(fromHash, { pushHash: false });
		return;
	}

	const last = loadLS('last-place', null);
	if (last) {
		loadPlace(last);
		return;
	}

	// Default showcase city
	loadPlace({
		name: 'Cape Town',
		region: 'Western Cape',
		lat: -33.9249,
		lon: 18.4241,
		countryCode: 'ZA',
	});
}

/* Register service worker */
if ('serviceWorker' in navigator) {
	navigator.serviceWorker.register('./sw.js', { scope: './' }).catch(() => {});
}

init();
