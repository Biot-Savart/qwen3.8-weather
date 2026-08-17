// ============================================================
// background.js — ambient animated weather canvas (parallax scene)
// Renders subtle sun rays / clouds / rain / snow / fog / stars
// behind the app, driven by the current weather & day/night.
// ============================================================

import { wmoInfo } from './icons.js';

export function createBackground(canvas) {
	const ctx = canvas.getContext('2d');
	let W = 0;
	let H = 0;
	let dpr = 1;
	let raf = null;
	let running = false;
	let reducedMotion = window.matchMedia(
		'(prefers-reduced-motion: reduce)',
	).matches;

	let mode = 'clear';
	let isDay = true;

	const particles = [];
	const clouds = [];
	const stars = [];

	function resize() {
		dpr = Math.min(window.devicePixelRatio || 1, 2);
		W = window.innerWidth;
		H = window.innerHeight;
		canvas.width = Math.round(W * dpr);
		canvas.height = Math.round(H * dpr);
		ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
	}

	function initParticles() {
		particles.length = 0;
		clouds.length = 0;
		stars.length = 0;

		if (mode === 'rain' || mode === 'drizzle') {
			const count = mode === 'rain' ? 120 : 60;
			for (let i = 0; i < count; i++) {
				particles.push({
					x: Math.random() * W,
					y: Math.random() * H,
					len: 8 + Math.random() * 14,
					speed: 7 + Math.random() * 8,
					drift: 1 + Math.random() * 1.5,
					o: 0.12 + Math.random() * 0.25,
				});
			}
		} else if (mode === 'snow') {
			for (let i = 0; i < 90; i++) {
				particles.push({
					x: Math.random() * W,
					y: Math.random() * H,
					r: 1.2 + Math.random() * 2.6,
					speed: 0.5 + Math.random() * 1.2,
					sway: Math.random() * Math.PI * 2,
					swaySpeed: 0.008 + Math.random() * 0.02,
					o: 0.25 + Math.random() * 0.5,
				});
			}
		} else if (!isDay) {
			for (let i = 0; i < 90; i++) {
				stars.push({
					x: Math.random() * W,
					y: Math.random() * H * 0.65,
					r: 0.4 + Math.random() * 1.1,
					tw: Math.random() * Math.PI * 2,
					twSpeed: 0.01 + Math.random() * 0.03,
				});
			}
		}

		const cloudCount =
			mode === 'cloudy' || mode === 'partly'
				? 6
				: mode === 'rain' || mode === 'thunder' || mode === 'snow'
					? 5
					: 2;
		for (let i = 0; i < cloudCount; i++) {
			clouds.push({
				x: Math.random() * W,
				y: H * 0.04 + Math.random() * H * 0.3,
				scale: 0.7 + Math.random() * 1.4,
				speed: 0.08 + Math.random() * 0.22,
				o: 0.05 + Math.random() * 0.09,
			});
		}
	}

	function setScene(group, day) {
		mode = group;
		isDay = !!day;
		initParticles();
	}

	function drawCloud(c) {
		ctx.save();
		ctx.translate(c.x, c.y);
		ctx.scale(c.scale, c.scale);
		ctx.globalAlpha = c.o;
		ctx.fillStyle = isDay ? '#ffffff' : '#8fa3c0';
		ctx.beginPath();
		ctx.arc(0, 0, 34, 0, Math.PI * 2);
		ctx.arc(38, -12, 42, 0, Math.PI * 2);
		ctx.arc(82, 0, 32, 0, Math.PI * 2);
		ctx.arc(44, 12, 40, 0, Math.PI * 2);
		ctx.fill();
		ctx.restore();
	}

	let tick = 0;

	function frame() {
		if (!running) return;
		tick++;
		ctx.clearRect(0, 0, W, H);

		// Stars (night)
		if (stars.length) {
			for (const s of stars) {
				s.tw += s.twSpeed;
				const a = 0.3 + Math.abs(Math.sin(s.tw)) * 0.7;
				ctx.globalAlpha = a * 0.8;
				ctx.fillStyle = '#dfe9ff';
				ctx.beginPath();
				ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
				ctx.fill();
			}
			ctx.globalAlpha = 1;
		}

		// Sun glow (day + clear/partly)
		if (isDay && (mode === 'clear' || mode === 'partly')) {
			const gx = W * 0.82;
			const gy = H * 0.12;
			const g = ctx.createRadialGradient(
				gx,
				gy,
				10,
				gx,
				gy,
				Math.max(W, H) * 0.5,
			);
			g.addColorStop(0, 'rgba(255, 214, 107, .30)');
			g.addColorStop(0.4, 'rgba(255, 180, 80, .08)');
			g.addColorStop(1, 'rgba(255, 180, 80, 0)');
			ctx.fillStyle = g;
			ctx.fillRect(0, 0, W, H);
		}

		// Moon glow (night + clear)
		if (!isDay && mode === 'clear') {
			const gx = W * 0.82;
			const gy = H * 0.14;
			const g = ctx.createRadialGradient(gx, gy, 6, gx, gy, 220);
			g.addColorStop(0, 'rgba(230, 240, 255, .35)');
			g.addColorStop(1, 'rgba(230, 240, 255, 0)');
			ctx.fillStyle = g;
			ctx.fillRect(0, 0, W, H);
			ctx.fillStyle = '#e8eefc';
			ctx.beginPath();
			ctx.arc(gx, gy, 26, 0, Math.PI * 2);
			ctx.fill();
		}

		// Clouds drift
		for (const c of clouds) {
			c.x += c.speed;
			if (c.x - 140 * c.scale > W) c.x = -160 * c.scale;
			drawCloud(c);
		}

		// Rain
		if (mode === 'rain' || mode === 'drizzle') {
			ctx.lineCap = 'round';
			ctx.strokeStyle = isDay
				? 'rgba(120, 170, 255, .8)'
				: 'rgba(140, 180, 255, .7)';
			for (const p of particles) {
				ctx.globalAlpha = p.o;
				ctx.lineWidth = mode === 'rain' ? 1.6 : 1.1;
				ctx.beginPath();
				ctx.moveTo(p.x, p.y);
				ctx.lineTo(p.x - p.drift * 2, p.y + p.len);
				ctx.stroke();
				p.y += p.speed;
				p.x -= p.drift;
				if (p.y > H) {
					p.y = -20;
					p.x = Math.random() * (W + 60);
				}
			}
			ctx.globalAlpha = 1;
		}

		// Snow
		if (mode === 'snow') {
			ctx.fillStyle = '#ffffff';
			for (const p of particles) {
				p.sway += p.swaySpeed;
				ctx.globalAlpha = p.o;
				ctx.beginPath();
				ctx.arc(p.x + Math.sin(p.sway) * 14, p.y, p.r, 0, Math.PI * 2);
				ctx.fill();
				p.y += p.speed;
				if (p.y > H + 5) {
					p.y = -6;
					p.x = Math.random() * W;
				}
			}
			ctx.globalAlpha = 1;
		}

		// Fog bands
		if (mode === 'fog') {
			for (let i = 0; i < 3; i++) {
				const y = H * (0.3 + i * 0.22);
				const off = Math.sin(tick / 300 + i * 2) * 60;
				const g = ctx.createLinearGradient(0, y - 70, 0, y + 70);
				g.addColorStop(0, 'rgba(200,210,225,0)');
				g.addColorStop(
					0.5,
					isDay ? 'rgba(200,210,225,.16)' : 'rgba(150,165,190,.14)',
				);
				g.addColorStop(1, 'rgba(200,210,225,0)');
				ctx.fillStyle = g;
				ctx.fillRect(off - 80, y - 70, W + 160, 140);
			}
		}

		// Thunder flash (very subtle, occasional)
		if (mode === 'thunder' && tick % 340 < 6 && tick % 340 > 0) {
			ctx.fillStyle = 'rgba(255,255,255,.06)';
			ctx.fillRect(0, 0, W, H);
		}

		if (!reducedMotion) {
			raf = requestAnimationFrame(frame);
		}
	}

	function start() {
		if (running) return;
		running = true;
		if (reducedMotion) {
			frame(); // single static frame
		} else {
			raf = requestAnimationFrame(frame);
		}
	}

	function stop() {
		running = false;
		if (raf) cancelAnimationFrame(raf);
	}

	window.addEventListener('resize', () => {
		resize();
		initParticles();
		if (reducedMotion && running) frame();
	});

	window
		.matchMedia('(prefers-reduced-motion: reduce)')
		.addEventListener('change', (e) => {
			reducedMotion = e.matches;
			if (reducedMotion) {
				stop();
				frame();
			} else if (running) {
				raf = requestAnimationFrame(frame);
			}
		});

	resize();

	return { setScene, start, stop };
}

/** Map a WMO code to a background scene group */
export function sceneFromCode(code) {
	return wmoInfo(code).group;
}
