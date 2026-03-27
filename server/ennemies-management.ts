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

const BASE_MAX_ENEMIES = 50;
const MAX_PLAYER_MULTIPLIER = 5;

interface GameSession {
	ennemies: Ennemi[];
	playing: boolean;
	currentSpawnIntervalMs: number;
	spawnTimeout: NodeJS.Timeout | undefined;
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
		sessions.delete(sessionId);
	}
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
	session.players.forEach(socketId => {
		console.log(`Server: Emitting ennemiEvent to ${socketId} for session ${sessionId}. Ennemies count: ${session.ennemies.length}`);
		io.to(socketId).emit("ennemiEvent", session.ennemies);
	});
	
}

export function removeEnnemi(sessionId: string, index: number) {
	const session = getSession(sessionId);
	if (!session) return;

	if (index >= 0 && index < session.ennemies.length) {
		session.ennemies.splice(index, 1);
		session.players.forEach(socketId => {
			io.to(socketId).emit("ennemiEvent", session.ennemies);
		});
	}
}

export function hurtEnnemi(sessionId: string, index: number, damage: number) {
	const session = getSession(sessionId);
	if (!session) return;

	if (index >= 0 && index < session.ennemies.length) {
		session.ennemies[index].hurt(damage);
		if (session.ennemies[index].health <= 0) {
			const ex = session.ennemies[index].posX;
            const ey = session.ennemies[index].posY;
			io.emit("newEnnemyKilled", session.ennemies[index].imageId);
			removeEnnemi(sessionId, index);

			if(Math.random() <= 0.35) {
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
		if (session.ennemies.length < maxEnemies) {
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
	session.currentSpawnIntervalMs = initialSpawnIntervalMs;
}

function autoMoveAll() {
	sessions.forEach((session, _sessionId) => {
		if (!session.playing) return;

		session.ennemies.forEach((ennemi) => {
			if (ennemi.posX > leftCleanupLimit) {
				ennemi.move();

				if (ennemi.shootSpeed && Math.random() < (ennemi.shootSpeed * 0.1)) {
					session.players.forEach(socketId => {
						io.to(socketId).emit("enemyShoot", { posX: ennemi.posX, posY: ennemi.posY });
					});
				}
			}
		});

		for (let i = session.ennemies.length - 1; i >= 0; i--) {
			if (session.ennemies[i].posX <= leftCleanupLimit) {
				session.ennemies.splice(i, 1);
			}
		}

		session.players.forEach(socketId => {
			// console.log(`Server: Emitting ennemiEvent (autoMoveAll) to ${socketId} for session ${_sessionId}. Ennemies count: ${session.ennemies.length}`); // Uncomment for very verbose logging
			io.to(socketId).emit("ennemiEvent", session.ennemies);
		});
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
		console.log(`[Session ${sessionId}] Game started (coop: ${isCoop})`);
	} else {
		io.to(socketId).emit("ennemiEvent", session.ennemies);
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