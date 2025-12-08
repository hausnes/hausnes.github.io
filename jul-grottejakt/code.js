// Julestemning: Grottejakt – MVP grid, movement, pickups, simple encounter stub

const SIZE = 10; // 10x10
const REQUIRED_GIFTS = 5;

const state = {
	hp: 10,
	lantern: 2, // vision radius
	gifts: 0,
	player: { x: 0, y: 0 },
	tiles: [], // {type: 'floor'|'wall'|'gift'|'enemy'|'player'}
	enemies: [], // positions for simple collision
	exitPlaced: false,
	difficulty: 'normal',
	time: 90,
	timerId: null,
};

const gridEl = document.getElementById('grid');
const hpEl = document.getElementById('hp');
const giftsEl = document.getElementById('gifts');
const lanternEl = document.getElementById('lantern');
const timerEl = document.getElementById('timer');
const combatEl = document.getElementById('combat');
const playerHpEl = document.getElementById('player-hp');
const enemyHpEl = document.getElementById('enemy-hp');
const attackBtn = document.getElementById('act-attack');
const guardBtn = document.getElementById('act-guard');
const runBtn = document.getElementById('act-run');
const overlayLoseEl = document.getElementById('overlay-lose');
const overlayWinEl = document.getElementById('overlay-win');
const loseReasonEl = document.getElementById('lose-reason');
const restartBtn = document.getElementById('btn-restart');
const restartBtn2 = document.getElementById('btn-restart2');
const toastEl = document.getElementById('message');
const diffEl = document.getElementById('difficulty');

function idx(x, y) { return y * SIZE + x }

function clamp(n, min, max) { return Math.max(min, Math.min(max, n)) }

function showToast(text) {
	toastEl.textContent = text;
	toastEl.classList.remove('hidden');
	setTimeout(() => toastEl.classList.add('hidden'), 1500);
}

function updateHUD() {
	hpEl.textContent = `HP: ${state.hp}`;
	giftsEl.textContent = `Gaver: ${state.gifts}/${REQUIRED_GIFTS}`;
	lanternEl.textContent = `Lanterne: ${state.lantern}`;
	timerEl.textContent = `Tid: ${state.time}s`;
}

function makeTiles() {
	state.tiles = Array.from({ length: SIZE * SIZE }, () => ({ type: 'floor' }));
	// Difficulty settings
	const settings = {
		easy:  { walls: 14, enemies: 3, enemyHitChance: 0.5, enemyDmg: [1,3], sight: 4 },
		normal:{ walls: 18, enemies: 4, enemyHitChance: 0.6, enemyDmg: [1,3], sight: 5 },
		hard:  { walls: 22, enemies: 5, enemyHitChance: 0.7, enemyDmg: [2,4], sight: 6 },
	}[state.difficulty];

	// Add some walls
	for (let i = 0; i < settings.walls; i++) {
		const x = Math.floor(Math.random() * SIZE);
		const y = Math.floor(Math.random() * SIZE);
		if (x === 0 && y === 0) continue; // don't block start
		state.tiles[idx(x, y)].type = 'wall';
	}
	// Place gifts
	let placed = 0;
	while (placed < REQUIRED_GIFTS) {
		const x = Math.floor(Math.random() * SIZE);
		const y = Math.floor(Math.random() * SIZE);
		const t = state.tiles[idx(x, y)];
		if (t.type === 'floor' && (x !== 0 || y !== 0)) { t.type = 'gift'; placed++; }
	}
	// Place enemies
	let enemies = 0;
	while (enemies < settings.enemies) {
		const x = Math.floor(Math.random() * SIZE);
		const y = Math.floor(Math.random() * SIZE);
		const t = state.tiles[idx(x, y)];
		if (t.type === 'floor' && (x !== 0 || y !== 0)) { t.type = 'enemy'; state.enemies.push({ x, y, hp: 6 }); enemies++; }
	}
	// store sight for enemies (shared per difficulty)
	state.enemySight = settings.sight;
}

function render() {
	gridEl.innerHTML = '';
	gridEl.style.setProperty('--size', SIZE);
	for (let y = 0; y < SIZE; y++) {
		for (let x = 0; x < SIZE; x++) {
			const t = state.tiles[idx(x, y)];
			const el = document.createElement('div');
			el.className = `tile ${t.type}`;
			el.setAttribute('role', 'gridcell');
			// Player
			if (state.player.x === x && state.player.y === y) el.classList.add('player');
			// Light overlay for vision
			const dx = x - state.player.x; const dy = y - state.player.y;
			const dist = Math.abs(dx) + Math.abs(dy);
			if (dist <= state.lantern) {
				const light = document.createElement('div');
				light.className = 'light';
				el.appendChild(light);
			} else {
				// Fog-of-war: fully hide tiles outside lantern radius
				el.style.filter = 'brightness(0) contrast(0)';
				el.style.boxShadow = 'inset 0 0 20px #000';
			}
			// Mark exit tile visually
			if (t.type === 'exit') el.classList.add('exit');
			gridEl.appendChild(el);
		}
	}
}

// --- Simple sound effects (WebAudio) ---
let audioCtx;
function playSound(type) {
	try {
		if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
		const o = audioCtx.createOscillator();
		const g = audioCtx.createGain();
		o.connect(g); g.connect(audioCtx.destination);
		const now = audioCtx.currentTime;
		g.gain.setValueAtTime(0.001, now);
		g.gain.exponentialRampToValueAtTime(0.05, now + 0.01);
		g.gain.exponentialRampToValueAtTime(0.0001, now + 0.25);
		// Frequencies per type
		const freq = {
			pickup: 740,
			hit: 200,
			miss: 120,
			win: 880,
			lose: 90,
			step: 340,
		}[type] || 440;
		o.frequency.setValueAtTime(freq, now);
		o.type = type === 'hit' ? 'square' : 'sine';
		o.start();
		o.stop(now + 0.25);
	} catch (e) { /* ignore */ }
}

let currentEnemy = null;
let guarding = false;

function openCombat(enemy) {
	currentEnemy = enemy;
	guarding = false;
	playerHpEl.textContent = state.hp;
	enemyHpEl.textContent = enemy.hp;
	combatEl.classList.remove('hidden');
}

function closeCombat(victory) {
	combatEl.classList.add('hidden');
	currentEnemy = null;
	guarding = false;
	if (victory) showToast('Fienden ble beseiret!');
	updateHUD();
	render();
}

function enemyTurn() {
	if (!currentEnemy) return;
	// Chance based on difficulty
	const settings = {
		easy: 0.5,
		normal: 0.6,
		hard: 0.7,
	}[state.difficulty];
	const willAttack = Math.random() < settings;
	if (willAttack) {
		const range = state.difficulty === 'hard' ? [2,4] : [1,3];
		let dmg = Math.floor(range[0] + Math.random() * (range[1]-range[0]+1));
		if (guarding) dmg = Math.max(0, dmg - 2);
		state.hp -= dmg;
		showToast(dmg > 0 ? `Fienden angriper for ${dmg}.` : 'Du blokkerte angrepet!');
		playSound(dmg > 0 ? 'hit' : 'miss');
		playerHpEl.textContent = state.hp;
		if (state.hp <= 0) {
			closeCombat(false);
			gameOver('Du mistet all HP.');
		}
	} else {
		showToast('Fienden nøler...');
	}
	guarding = false; // guard lasts one enemy hit
}

function playerAttack() {
	if (!currentEnemy) return;
	const hit = Math.random() < 0.75; // 75% chance to hit
	const dmg = hit ? Math.floor(2 + Math.random() * 3) : 0;
	currentEnemy.hp -= dmg;
	enemyHpEl.textContent = Math.max(0, currentEnemy.hp);
	showToast(hit ? `Du angriper for ${dmg}.` : 'Du bommer.');
	playSound(hit ? 'hit' : 'miss');
	if (currentEnemy.hp <= 0) {
		// remove enemy from grid
		state.tiles[idx(currentEnemy.x, currentEnemy.y)].type = 'floor';
		state.enemies = state.enemies.filter(e => !(e.x === currentEnemy.x && e.y === currentEnemy.y));
		closeCombat(true);
		playSound('win');
		return;
	}
	enemyTurn();
}

function playerGuard() {
	guarding = true;
	showToast('Du går i forsvar.');
	enemyTurn();
}

function playerRun() {
	const success = Math.random() < 0.5;
	if (success) {
		showToast('Du klarte å løpe vekk!');
		closeCombat(false);
	} else {
		showToast('Flukt mislyktes.');
		enemyTurn();
	}
}

function tryMove(dx, dy) {
	const nx = clamp(state.player.x + dx, 0, SIZE - 1);
	const ny = clamp(state.player.y + dy, 0, SIZE - 1);
	const target = state.tiles[idx(nx, ny)];
	// Block movement during combat or after game end
	if (currentEnemy || isGameEnded) return;
	if (target.type === 'wall') { showToast('En vegg blokkerer veien.'); return }
	// Move
	state.player.x = nx; state.player.y = ny;
	playSound('step');
	// Resolve
	if (target.type === 'gift') {
		target.type = 'floor';
		state.gifts++;
		showToast('Du fant en gave!');
		playSound('pickup');
		if (state.gifts >= REQUIRED_GIFTS && !state.exitPlaced) {
			// Place an exit at a random floor tile far from player
			const candidates = [];
			for (let y = 0; y < SIZE; y++) for (let x = 0; x < SIZE; x++) {
				const t2 = state.tiles[idx(x, y)];
				const dist = Math.abs(x - state.player.x) + Math.abs(y - state.player.y);
				if (t2.type === 'floor' && dist > SIZE/2) candidates.push({ x, y });
			}
			const pick = candidates[Math.floor(Math.random() * candidates.length)] || { x: SIZE-1, y: SIZE-1 };
			state.tiles[idx(pick.x, pick.y)].type = 'exit';
			state.exitPlaced = true;
			showToast('Utgangen dukker opp i det fjerne!');
		}
	} else if (target.type === 'enemy') {
		const enemy = state.enemies.find(e => e.x === nx && e.y === ny);
		if (enemy) {
			openCombat(enemy);
		}
	} else if (target.type === 'exit') {
		if (state.gifts >= REQUIRED_GIFTS) {
			victory();
		} else {
			showToast('Du trenger flere gaver før du kan forlate grotten.');
		}
	}
	// After player moves, enemies act if they see you
	enemiesAct();
	updateHUD();
	render();
}

function seesPlayer(enemy) {
	const dist = Math.abs(enemy.x - state.player.x) + Math.abs(enemy.y - state.player.y);
	return dist <= (state.enemySight || 5);
}

function canMoveTo(x, y) {
	if (x < 0 || y < 0 || x >= SIZE || y >= SIZE) return false;
	const t = state.tiles[idx(x, y)];
	return t.type === 'floor' || t.type === 'player';
}

function enemiesAct() {
	// Each enemy steps toward player if in sight; if adjacent, starts combat
	for (const e of state.enemies) {
		if (!seesPlayer(e)) continue;
		const dx = Math.sign(state.player.x - e.x);
		const dy = Math.sign(state.player.y - e.y);
		// Prefer horizontal move if farther horizontally
		const horizFirst = Math.abs(state.player.x - e.x) >= Math.abs(state.player.y - e.y);
		let nx = e.x, ny = e.y;
		if (horizFirst && canMoveTo(e.x + dx, e.y)) { nx = e.x + dx; ny = e.y; }
		else if (canMoveTo(e.x, e.y + dy)) { nx = e.x; ny = e.y + dy; }
		else if (canMoveTo(e.x + dx, e.y + dy)) { nx = e.x + dx; ny = e.y + dy; }
		// If moving into player, initiate combat
		if (nx === state.player.x && ny === state.player.y) {
			openCombat(e);
			return; // pause world while in combat
		}
		// Move enemy if tile is floor
		if (canMoveTo(nx, ny)) {
			// Update grid tiles for visual: mark old as floor, new as enemy
			state.tiles[idx(e.x, e.y)].type = 'floor';
			e.x = nx; e.y = ny;
			state.tiles[idx(e.x, e.y)].type = 'enemy';
		}
	}
}

function onKey(e) {
	const key = e.key.toLowerCase();
	if (key === 'arrowup' || key === 'w') tryMove(0, -1);
	else if (key === 'arrowdown' || key === 's') tryMove(0, 1);
	else if (key === 'arrowleft' || key === 'a') tryMove(-1, 0);
	else if (key === 'arrowright' || key === 'd') tryMove(1, 0);
}

function init() {
	makeTiles();
	updateHUD();
	render();
	document.addEventListener('keydown', onKey);
	// Combat actions
	attackBtn.addEventListener('click', playerAttack);
	guardBtn.addEventListener('click', playerGuard);
	runBtn.addEventListener('click', playerRun);
	diffEl.addEventListener('change', (e) => {
		state.difficulty = e.target.value;
		// Reset board with new difficulty but preserve player/gifts collected? For now, restart.
		state.player = { x: 0, y: 0 };
		state.gifts = 0; state.hp = 10; state.enemies = []; state.exitPlaced = false; state.time = 90;
		makeTiles(); updateHUD(); render();
		showToast(`Vanskelighet: ${state.difficulty}`);
	});
	// Start countdown timer
	if (state.timerId) clearInterval(state.timerId);
	state.timerId = setInterval(() => {
		if (currentEnemy) return; // pause during combat
		state.time--;
		if (state.time <= 0) {
			state.time = 0;
			updateHUD();
			gameOver('Tiden er ute!');
			return;
		}
		updateHUD();
	}, 1000);
	restartBtn.addEventListener('click', resetGame);
	restartBtn2.addEventListener('click', resetGame);
}

let isGameEnded = false;
function gameOver(reason) {
	isGameEnded = true;
	loseReasonEl.textContent = reason;
	overlayLoseEl.classList.remove('hidden');
	playSound('lose');
	if (state.timerId) clearInterval(state.timerId);
}

function victory() {
	isGameEnded = true;
	overlayWinEl.classList.remove('hidden');
	playSound('win');
	if (state.timerId) clearInterval(state.timerId);
}

function resetGame() {
	// Close overlays and reset everything
	overlayLoseEl.classList.add('hidden');
	overlayWinEl.classList.add('hidden');
	combatEl.classList.add('hidden');
	currentEnemy = null;
	guarding = false;
	isGameEnded = false;
	state.player = { x: 0, y: 0 };
	state.gifts = 0; state.hp = 10; state.enemies = []; state.exitPlaced = false; state.time = 90;
	makeTiles(); updateHUD(); render();
	// restart timer
	if (state.timerId) clearInterval(state.timerId);
	state.timerId = setInterval(() => {
		if (currentEnemy) return; // pause during combat
		state.time--;
		if (state.time <= 0) {
			state.time = 0;
			updateHUD();
			gameOver('Tiden er ute!');
			return;
		}
		updateHUD();
	}, 1000);
	// re-bind movement if it was disabled
	document.addEventListener('keydown', onKey);
}

document.addEventListener('DOMContentLoaded', init);
