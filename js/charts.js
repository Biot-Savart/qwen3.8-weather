// ============================================================
// charts.js — interactive canvas hourly chart (temp + precip)
// ============================================================

import { fmtTemp, hourLabel } from './utils.js';

/**
 * Render an interactive dual-axis chart: temperature line + precipitation bars.
 *
 * @param {HTMLCanvasElement} canvas
 * @param {object} opts
 *   hours: [{ iso, temp, precipProb, precip, code, wind }]
 *   unit: "metric" | "imperial"
 *   locale: string | undefined
 *   tooltipEl: HTMLElement — positioned tooltip
 *   onHover: (hour | null) => void
 */
export function renderHourlyChart(canvas, opts) {
	const { hours, unit, locale, tooltipEl, onHover } = opts;
	const ctx = canvas.getContext('2d');
	const dpr = Math.min(window.devicePixelRatio || 1, 2);

	let W = 0;
	let H = 0;
	let hoverIndex = -1;
	let raf = null;

	const PAD = { top: 22, right: 44, bottom: 28, left: 44 };

	function cssVar(name) {
		return getComputedStyle(document.documentElement)
			.getPropertyValue(name)
			.trim();
	}

	function resize() {
		const rect = canvas.getBoundingClientRect();
		W = rect.width;
		H = rect.height;
		canvas.width = Math.round(W * dpr);
		canvas.height = Math.round(H * dpr);
		ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
		draw();
	}

	function scales() {
		const temps = hours
			.map((h) => h.temp)
			.filter((v) => v !== null && v !== undefined);
		const minT = Math.min(...temps) - 1.5;
		const maxT = Math.max(...temps) + 1.5;
		const innerW = W - PAD.left - PAD.right;
		const innerH = H - PAD.top - PAD.bottom;
		const x = (i) =>
			PAD.left +
			(hours.length <= 1 ? innerW / 2 : (i / (hours.length - 1)) * innerW);
		const yT = (t) => PAD.top + (1 - (t - minT) / (maxT - minT)) * innerH;
		return { minT, maxT, innerW, innerH, x, yT };
	}

	function draw() {
		ctx.clearRect(0, 0, W, H);
		const s = scales();
		const gridColor = cssVar('--chart-grid') || 'rgba(128,128,128,.2)';
		const dimColor = cssVar('--text-faint') || '#888';
		const accent = cssVar('--accent') || '#5aa7ff';
		const cool = cssVar('--cool') || '#6fd3ff';
		const text = cssVar('--text') || '#fff';

		// --- horizontal grid + temp axis labels ---
		ctx.font = '11px system-ui, sans-serif';
		const steps = 4;
		for (let i = 0; i <= steps; i++) {
			const t = s.minT + ((s.maxT - s.minT) * i) / steps;
			const y = s.yT(t);
			ctx.strokeStyle = gridColor;
			ctx.lineWidth = 1;
			ctx.beginPath();
			ctx.moveTo(PAD.left, y);
			ctx.lineTo(W - PAD.right, y);
			ctx.stroke();

			ctx.fillStyle = dimColor;
			ctx.textAlign = 'right';
			ctx.textBaseline = 'middle';
			ctx.fillText(Math.round(t) + '°', PAD.left - 8, y);
		}

		// --- precipitation bars (right axis 0–100%) ---
		const barW = Math.max(3, Math.min(14, (s.innerW / hours.length) * 0.55));
		hours.forEach((h, i) => {
			const prob = h.precipProb || 0;
			const bh = (prob / 100) * s.innerH * 0.92;
			if (bh < 1) return;
			const bx = s.x(i) - barW / 2;
			const by = PAD.top + s.innerH - bh;
			ctx.fillStyle = cool + (i === hoverIndex ? 'cc' : '55');
			roundRect(ctx, bx, by, barW, bh, Math.min(3, barW / 2));
			ctx.fill();
		});

		// right axis labels (%)
		ctx.textAlign = 'left';
		ctx.fillStyle = dimColor;
		ctx.fillText('100%', W - PAD.right + 6, PAD.top + s.innerH * 0.08);
		ctx.fillText('0%', W - PAD.right + 6, PAD.top + s.innerH);

		// --- temperature line (smooth) ---
		const pts = hours.map((h, i) => ({ x: s.x(i), y: s.yT(h.temp) }));
		const grad = ctx.createLinearGradient(PAD.left, 0, W - PAD.right, 0);
		grad.addColorStop(0, cool);
		grad.addColorStop(1, cssVar('--warm') || '#ffb45e');

		// area fill
		ctx.beginPath();
		smoothPath(ctx, pts);
		ctx.lineTo(pts[pts.length - 1].x, PAD.top + s.innerH);
		ctx.lineTo(pts[0].x, PAD.top + s.innerH);
		ctx.closePath();
		const areaGrad = ctx.createLinearGradient(
			0,
			PAD.top,
			0,
			PAD.top + s.innerH,
		);
		areaGrad.addColorStop(0, 'rgba(90,167,255,.22)');
		areaGrad.addColorStop(1, 'rgba(90,167,255,0)');
		ctx.fillStyle = areaGrad;
		ctx.fill();

		// line
		ctx.beginPath();
		smoothPath(ctx, pts);
		ctx.strokeStyle = grad;
		ctx.lineWidth = 2.4;
		ctx.lineJoin = 'round';
		ctx.stroke();

		// --- x labels ---
		ctx.fillStyle = dimColor;
		ctx.textAlign = 'center';
		ctx.textBaseline = 'top';
		const labelEvery = Math.ceil(hours.length / (W < 560 ? 5 : 8));
		hours.forEach((h, i) => {
			if (i % labelEvery !== 0) return;
			ctx.fillText(hourLabel(h.iso, locale), s.x(i), H - PAD.bottom + 8);
		});

		// --- hover crosshair ---
		if (hoverIndex >= 0 && hoverIndex < hours.length) {
			const hx = s.x(hoverIndex);
			const hy = s.yT(hours[hoverIndex].temp);
			ctx.strokeStyle = dimColor;
			ctx.setLineDash([4, 4]);
			ctx.lineWidth = 1;
			ctx.beginPath();
			ctx.moveTo(hx, PAD.top);
			ctx.lineTo(hx, PAD.top + s.innerH);
			ctx.stroke();
			ctx.setLineDash([]);

			ctx.beginPath();
			ctx.arc(hx, hy, 5.5, 0, Math.PI * 2);
			ctx.fillStyle = text;
			ctx.fill();
			ctx.beginPath();
			ctx.arc(hx, hy, 3.4, 0, Math.PI * 2);
			ctx.fillStyle = accent;
			ctx.fill();
		}
	}

	function smoothPath(c, pts) {
		if (pts.length < 2) return;
		c.moveTo(pts[0].x, pts[0].y);
		for (let i = 0; i < pts.length - 1; i++) {
			const p0 = pts[Math.max(0, i - 1)];
			const p1 = pts[i];
			const p2 = pts[i + 1];
			const p3 = pts[Math.min(pts.length - 1, i + 2)];
			const cp1x = p1.x + (p2.x - p0.x) / 6;
			const cp1y = p1.y + (p2.y - p0.y) / 6;
			const cp2x = p2.x - (p3.x - p1.x) / 6;
			const cp2y = p2.y - (p3.y - p1.y) / 6;
			c.bezierCurveTo(cp1x, cp1y, cp2x, cp2y, p2.x, p2.y);
		}
	}

	function roundRect(c, x, y, w, h, r) {
		c.beginPath();
		c.moveTo(x + r, y);
		c.arcTo(x + w, y, x + w, y + h, r);
		c.arcTo(x + w, y + h, x, y + h, r);
		c.arcTo(x, y + h, x, y, r);
		c.arcTo(x, y, x + w, y, r);
		c.closePath();
	}

	function nearestIndex(clientX) {
		const rect = canvas.getBoundingClientRect();
		const mx = clientX - rect.left;
		const s = scales();
		let best = 0;
		let bestDist = Infinity;
		hours.forEach((_, i) => {
			const d = Math.abs(s.x(i) - mx);
			if (d < bestDist) {
				bestDist = d;
				best = i;
			}
		});
		return best;
	}

	function showTooltip(i) {
		const h = hours[i];
		const s = scales();
		tooltipEl.innerHTML = `
      <div class="tt-time">${hourLabel(h.iso, locale)}</div>
      <div class="tt-row"><span class="tt-dot" style="background:${cssVar('--warm') || '#ffb45e'}"></span> ${fmtTemp(h.temp, unit)}</div>
      <div class="tt-row"><span class="tt-dot" style="background:${cssVar('--cool') || '#6fd3ff'}"></span> ${h.precipProb ?? 0}% precip</div>`;
		tooltipEl.hidden = false;
		tooltipEl.style.left = `${s.x(i)}px`;
		tooltipEl.style.top = `${s.yT(h.temp) - 10}px`;
	}

	function onMove(e) {
		const i = nearestIndex(e.clientX ?? e.touches?.[0]?.clientX ?? 0);
		if (i !== hoverIndex) {
			hoverIndex = i;
			if (raf) cancelAnimationFrame(raf);
			raf = requestAnimationFrame(draw);
			showTooltip(i);
			onHover?.(hours[i]);
		}
	}

	function onLeave() {
		hoverIndex = -1;
		tooltipEl.hidden = true;
		if (raf) cancelAnimationFrame(raf);
		raf = requestAnimationFrame(draw);
		onHover?.(null);
	}

	canvas.addEventListener('pointermove', onMove);
	canvas.addEventListener('pointerdown', onMove);
	canvas.addEventListener('pointerleave', onLeave);

	resize();
	const ro = new ResizeObserver(() => resize());
	ro.observe(canvas);

	return {
		update(nextHours) {
			hours.length = 0;
			hours.push(...nextHours);
			hoverIndex = -1;
			draw();
		},
		destroy() {
			ro.disconnect();
			canvas.removeEventListener('pointermove', onMove);
			canvas.removeEventListener('pointerdown', onMove);
			canvas.removeEventListener('pointerleave', onLeave);
		},
	};
}
