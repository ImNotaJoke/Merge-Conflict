import { Ennemi } from "../common/types.ts";
import { io } from "./index.ts";

const rightWall = 1980;
const arenaHeight = 720;
const leftCleanupLimit = -100;
const initialSpawnIntervalMs = 4000;
const minimumSpawnIntervalMs = 700;
const spawnAccelerationMs = 100;
const ENNEMI_RENDER_WIDTH = 64;
const ENNEMI_RENDER_HEIGHT = 64;
const BOSS_IMAGE_ID = 3;
const BOSS_RENDER_WIDTH = 220;
const BOSS_SPAWN_INTERVAL_MS = 45000;
const BOSS_POST_KILL_RESUME_MS = 3000;
const BOSS_STUN_CHANCE = 0.005;
const BOSS_STUN_DURATION_MS = 5000;
const BOSS_PATTERN_COOLDOWN_MS = 2000;
const HARD_BOSS_MIN_RANDOM_GAP = 0.16;

const BASE_MAX_ENEMIES = 50;
const MAX_PLAYER_MULTIPLIER = 5;

interface GameSession {
	ennemies: Ennemi[];
	playing: boolean;
	currentSpawnIntervalMs: number;
	spawnTimeout: NodeJS.Timeout | undefined;
	bossSpawnTimeout: NodeJS.Timeout | undefined;
	spawnBlockedUntilMs: number;
	bossStunnedUntilMs: number;
	bossCooldownUntilMs: number;
	bossPatternIndex: number;
	bossVolleyRemaining: number;
	bossNextVolleyAtMs: number;
	players: Set<string>;
	isCoop: boolean;
	difficulty: number;
	isMultiplayer: boolean;
	playerCount: number;
}

const sessions: Map<string, GameSession> = new Map();

function getSession(sessionId: string): GameSession | undefined {
	return sessions.get(sessionId);
}

function createSession(sessionId: string, isCoop: boolean, difficulty: number, isMultiplayer: boolean = false, playerCount: number = 1): GameSession {
	const session: GameSession = {
		ennemies: [],
		playing: false,
		currentSpawnIntervalMs: initialSpawnIntervalMs,
		spawnTimeout: undefined,
		bossSpawnTimeout: undefined,
		spawnBlockedUntilMs: 0,
		bossStunnedUntilMs: 0,
		bossCooldownUntilMs: 0,
		bossPatternIndex: 0,
		bossVolleyRemaining: 0,
		bossNextVolleyAtMs: 0,
		players: new Set(),
		isCoop,
		difficulty,
		isMultiplayer,
		playerCount,
	};
	sessions.set(sessionId, session);
	return session;
}

function getMaxEnemies(session: GameSession): number {
	if (!session.isMultiplayer) {
		return BASE_MAX_ENEMIES;
	}
	// Scale by player count, max x5
	const multiplier = Math.min(session.playerCount, MAX_PLAYER_MULTIPLIER);
	return BASE_MAX_ENEMIES * multiplier;
}

function deleteSession(sessionId: string) {
	const session = sessions.get(sessionId);
	if (session) {
		if (session.spawnTimeout) {
			clearTimeout(session.spawnTimeout);
		}
		if (session.bossSpawnTimeout) {
			clearTimeout(session.bossSpawnTimeout);
		}
		sessions.delete(sessionId);
	}
}

function isBoss(ennemi: Ennemi) {
	return ennemi.imageId === BOSS_IMAGE_ID;
}

function hasBoss(session: GameSession) {
	return session.ennemies.some((ennemi) => isBoss(ennemi));
}

function emitSessionEnemies(session: GameSession, sessionId: string) {
	io.to(sessionId).emit("ennemiEvent", session.ennemies);
	session.players.forEach(socketId => {
		io.to(socketId).emit("ennemiEvent", session.ennemies);
	});
}

function getBossHealthByDifficulty(difficulty: number) {
	switch (difficulty) {
		case 2:
			return 1200;
		case 1:
			return 900;
		default:
			return 700;
	}
}

function getBossVolleysByDifficulty(difficulty: number) {
	switch (difficulty) {
		case 2:
			return 2;
		case 1:
			return 1;
		default:
			return 1;
	}
}

function getBossVolleyIntervalByDifficulty(difficulty: number) {
	switch (difficulty) {
		case 2:
			return 500 + Math.floor(Math.random() * 501);
		case 1:
			return 900;
		default:
			return 1100;
	}
}

function buildHardBossRandomPattern() {
	const laneCount = 2 + Math.floor(Math.random() * 3);
	const minRatio = 0.08;
	const maxRatio = 0.92;

	for (let attempt = 0; attempt < 24; attempt++) {
		const candidates: number[] = [];
		for (let i = 0; i < laneCount; i++) {
			candidates.push(minRatio + Math.random() * (maxRatio - minRatio));
		}
		candidates.sort((a, b) => a - b);

		let hasEnoughSpace = true;
		for (let i = 1; i < candidates.length; i++) {
			if ((candidates[i] - candidates[i - 1]) < HARD_BOSS_MIN_RANDOM_GAP) {
				hasEnoughSpace = false;
				break;
			}
		}

		if (hasEnoughSpace) {
			return candidates;
		}
	}

	return [0.2, 0.5, 0.8];
}

function spawnBoss(session: GameSession, sessionId: string) {
	if (!session.playing || hasBoss(session)) return;

	const boss = new Ennemi(
		rightWall - BOSS_RENDER_WIDTH,
		0,
		getBossHealthByDifficulty(session.difficulty),
		0,
		BOSS_IMAGE_ID,
		0,
		0,
		0,
		"horizontal",
		0,
	);
	session.ennemies.push(boss);
	session.bossStunnedUntilMs = 0;
	session.bossPatternIndex = 0;
	session.bossVolleyRemaining = 0;
	session.bossNextVolleyAtMs = Date.now();
	session.bossCooldownUntilMs = Date.now();

	console.log(`Server: Boss spawned for session ${sessionId}`);
	emitSessionEnemies(session, sessionId);
}

function scheduleBossSpawn(session: GameSession, sessionId: string) {
	if (!session.playing) return;
	if (session.bossSpawnTimeout) {
		clearTimeout(session.bossSpawnTimeout);
	}

	session.bossSpawnTimeout = setTimeout(() => {
		if (!session.playing || hasBoss(session)) return;
		spawnBoss(session, sessionId);
	}, BOSS_SPAWN_INTERVAL_MS);
}

function handleBossDefeat(session: GameSession, sessionId: string) {
	session.spawnBlockedUntilMs = Date.now() + BOSS_POST_KILL_RESUME_MS;
	session.bossStunnedUntilMs = 0;
	session.bossVolleyRemaining = 0;
	session.bossNextVolleyAtMs = 0;
	session.bossCooldownUntilMs = 0;
	session.bossPatternIndex = 0;

	session.players.forEach(socketId => {
		io.to(socketId).emit("newEnnemyKilled", BOSS_IMAGE_ID);
	});

	scheduleBossSpawn(session, sessionId);
	console.log(`Server: Boss defeated for session ${sessionId}. Enemy spawn resumes in ${BOSS_POST_KILL_RESUME_MS}ms`);
}

function spawnEnnemi(session: GameSession, sessionId: string) {
	const random: number = Math.random() * 100;
	const isHardMode = session.difficulty === 2;

	let health = 25;
	let moveSpeed = 1;
	let imageId = 0;
	let movementType: "horizontal" | "diagonal" = "horizontal";
	let verticalSpeed = 0;
	let shootSpeed = 0;
	let projectileDamage = 0;
	let projectileSize = 0;

	if (isHardMode && random < 12) {
		// Ennemi special: plus rare, deplacement en X+Y et vitesse intermediaire.
		health = 18;
		moveSpeed = 3;
		imageId = 1;
		movementType = "diagonal";
		verticalSpeed = (Math.random() > 0.5 ? 1 : -1) * 2;
	} else if (random < 25) {
		health = 10;
		moveSpeed = 5;
		imageId = 1;
	} else if(random > 25 && random < 35) {
		health = 15;
		moveSpeed = 2;
		shootSpeed = 0.5
		projectileDamage = 1;
		projectileSize = 5;
		imageId = 2;
	}
	const newEnnemi = new Ennemi(
		rightWall + ENNEMI_RENDER_WIDTH,
		Math.random() * (arenaHeight - ENNEMI_RENDER_HEIGHT),
		health,
		moveSpeed,
		imageId,
		shootSpeed,
		projectileDamage,
		projectileSize,
		movementType,
		verticalSpeed,
	);
	session.ennemies.push(newEnnemi);
	console.log(`Server: Spawning ennemi for session ${sessionId}. Total: ${session.ennemies.length}`);
	emitSessionEnemies(session, sessionId);
	
}

export function removeEnnemi(sessionId: string, index: number) {
	const session = getSession(sessionId);
	if (!session) return;

	if (index >= 0 && index < session.ennemies.length) {
		const removed = session.ennemies[index];
		session.ennemies.splice(index, 1);
		if (removed && isBoss(removed)) {
			handleBossDefeat(session, sessionId);
		}
		emitSessionEnemies(session, sessionId);
	}
}

export function hurtEnnemi(sessionId: string, index: number, damage: number) {
	const session = getSession(sessionId);
	if (!session) return;

	if (index >= 0 && index < session.ennemies.length) {
		const ennemi = session.ennemies[index];
		if (!ennemi) return;

		if (isBoss(ennemi) && Math.random() <= BOSS_STUN_CHANCE) {
			session.bossStunnedUntilMs = Date.now() + BOSS_STUN_DURATION_MS;
		}

		ennemi.hurt(damage);
		if (ennemi.health <= 0) {
			const ex = ennemi.posX;
			const ey = ennemi.posY;

			if (!isBoss(ennemi)) {
				session.players.forEach(socketId => {
					io.to(socketId).emit("newEnnemyKilled", ennemi.imageId);
				});
			}

			removeEnnemi(sessionId, index);

			if(!isBoss(ennemi) && Math.random() <= 0.35) {
				const bonusTypes = ["attack", "speed", "invincibility"];
				const type = bonusTypes[Math.floor(Math.random() * bonusTypes.length)];
				
				const bonusId = Math.random().toString(36).substring(2, 9);
				
				io.to(sessionId).emit("spawnBonus", { id: bonusId, posX: ex, posY: ey, type: type });
			}
		}
	}
}

function scheduleNextSpawn(session: GameSession, sessionId: string) {
	if (!session.playing) return;

	session.spawnTimeout = setTimeout(() => {
		if (!session.playing) return;

		const maxEnemies = getMaxEnemies(session);
		if (Date.now() >= session.spawnBlockedUntilMs && !hasBoss(session) && session.ennemies.length < maxEnemies) {
			spawnEnnemi(session, sessionId);
		}

		session.currentSpawnIntervalMs = Math.max(
			minimumSpawnIntervalMs,
			session.currentSpawnIntervalMs - spawnAccelerationMs,
		);
		scheduleNextSpawn(session, sessionId);
	}, session.currentSpawnIntervalMs);
}

function resetSpawnTimer(session: GameSession) {
	if (session.spawnTimeout) {
		clearTimeout(session.spawnTimeout);
		session.spawnTimeout = undefined;
	}
	if (session.bossSpawnTimeout) {
		clearTimeout(session.bossSpawnTimeout);
		session.bossSpawnTimeout = undefined;
	}
	session.currentSpawnIntervalMs = initialSpawnIntervalMs;
	session.spawnBlockedUntilMs = 0;
	session.bossStunnedUntilMs = 0;
	session.bossCooldownUntilMs = 0;
	session.bossPatternIndex = 0;
	session.bossVolleyRemaining = 0;
	session.bossNextVolleyAtMs = 0;
}

function emitBossPattern(session: GameSession, boss: Ennemi) {
	const patterns = [
		[0.18, 0.5, 0.82],
		[0.28, 0.72],
		[0.12, 0.5, 0.88],
	];
	const pattern = session.difficulty === 2
		? buildHardBossRandomPattern()
		: patterns[session.bossPatternIndex % patterns.length];
	const yPositions = pattern.map(ratio => ratio * (arenaHeight - 1));
	const shotDelays = session.difficulty === 2
		? yPositions.map((_y, index) => (index * 90) + Math.floor(Math.random() * 81))
		: yPositions.map(() => 0);

	session.players.forEach(socketId => {
		io.to(socketId).emit("bossShootPattern", {
			posX: boss.posX,
			yPositions,
			shotDelays,
		});
	});
}

function autoMoveAll() {
	sessions.forEach((session, sessionId) => {
		if (!session.playing) return;

		session.ennemies.forEach((ennemi) => {
			if (ennemi.posX > leftCleanupLimit) {
				ennemi.move();

				if (ennemi.shootSpeed && ennemi.imageId !== BOSS_IMAGE_ID && Math.random() < (ennemi.shootSpeed * 0.1)) {
					session.players.forEach(socketId => {
						io.to(socketId).emit("enemyShoot", { posX: ennemi.posX, posY: ennemi.posY });
					});
				}
			}
		});

		const boss = session.ennemies.find((ennemi) => isBoss(ennemi));
		if (boss) {
			const now = Date.now();
			if (now >= session.bossStunnedUntilMs) {
				if (session.bossVolleyRemaining > 0 && now >= session.bossNextVolleyAtMs) {
					emitBossPattern(session, boss);
					session.bossVolleyRemaining -= 1;
					if (session.bossVolleyRemaining > 0) {
						session.bossNextVolleyAtMs = now + getBossVolleyIntervalByDifficulty(session.difficulty);
					} else {
						session.bossPatternIndex = (session.bossPatternIndex + 1) % 3;
						session.bossCooldownUntilMs = now + BOSS_PATTERN_COOLDOWN_MS;
					}
				}

				if (session.bossVolleyRemaining === 0 && now >= session.bossCooldownUntilMs) {
					session.bossVolleyRemaining = getBossVolleysByDifficulty(session.difficulty);
					session.bossNextVolleyAtMs = now;
				}
			}
		}

		for (let i = session.ennemies.length - 1; i >= 0; i--) {
			if (session.ennemies[i].posX <= leftCleanupLimit) {
				session.ennemies.splice(i, 1);
			}
		}

		emitSessionEnemies(session, sessionId);
	});
}
setInterval(autoMoveAll, 100);

export function startPlaying(sessionId: string, socketId: string, isCoop: boolean, difficulty: number) {
	let session = getSession(sessionId);

	if (!session) {
		session = createSession(sessionId, isCoop, difficulty);
	}

	session.players.add(socketId);
	session.isCoop = isCoop;

	const shouldReset = !isCoop || !session.playing;

	if (shouldReset) {
		session.difficulty = difficulty;
		resetSpawnTimer(session);
		session.ennemies.length = 0;
		session.playing = true;
		spawnEnnemi(session, sessionId);
		scheduleNextSpawn(session, sessionId);
		scheduleBossSpawn(session, sessionId);
		console.log(`[Session ${sessionId}] Game started (coop: ${isCoop})`);
	} else {
		emitSessionEnemies(session, sessionId);
		console.log(`[Session ${sessionId}] Player ${socketId} joined existing game`);
	}
}

export function stopPlaying(sessionId: string, socketId: string) {
	const session = getSession(sessionId);
	if (!session) return;

	session.players.delete(socketId);
	console.log(`[Session ${sessionId}] Player ${socketId} left. Players: ${session.players.size}`);

	if (session.players.size === 0) {
		resetSpawnTimer(session);
		session.playing = false;
		session.ennemies.length = 0;
		deleteSession(sessionId);
		console.log(`[Session ${sessionId}] Game ended`);
	}
}

export function playerDisconnected(socketId: string) {
	sessions.forEach((session, sessionId) => {
		if (session.players.has(socketId)) {
			stopPlaying(sessionId, socketId);
		}
	});
}

export function startMultiplayerGame(sessionId: string, playerCount: number, difficulty: number, players: string[]) {
	let session = getSession(sessionId);

	if (!session) {
		session = createSession(sessionId, false, difficulty, true, playerCount);
	} else {
		session.isMultiplayer = true;
		session.playerCount = playerCount;
		session.difficulty = difficulty;
	}
	
	players.forEach(p => session!.players.add(p));

	resetSpawnTimer(session);
	session.ennemies.length = 0;
	session.playing = true;

	// Initial spawns based on player count
	const initialSpawns = Math.min(playerCount, 3);
	for (let i = 0; i < initialSpawns; i++) {
		spawnEnnemi(session, sessionId);
	}

	scheduleNextSpawn(session, sessionId);
	scheduleBossSpawn(session, sessionId);
	console.log(`[Session ${sessionId}] Multiplayer game started (players: ${playerCount}, difficulty: ${difficulty}, maxEnemies: ${getMaxEnemies(session)})`);
}

export function updateMultiplayerPlayerCount(sessionId: string, playerCount: number) {
	const session = getSession(sessionId);
	if (!session) return;

	session.playerCount = playerCount;
	console.log(`[Session ${sessionId}] Player count updated: ${playerCount}, maxEnemies: ${getMaxEnemies(session)}`);
}

export function stopMultiplayerGame(sessionId: string) {
	const session = getSession(sessionId);
	if (!session) return;

	resetSpawnTimer(session);
	session.playing = false;
	session.ennemies.length = 0;
	deleteSession(sessionId);
	console.log(`[Session ${sessionId}] Multiplayer game ended`);
}