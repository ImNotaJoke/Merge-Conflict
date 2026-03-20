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

interface GameSession {
	ennemies: Ennemi[];
	playing: boolean;
	currentSpawnIntervalMs: number;
	spawnTimeout: NodeJS.Timeout | undefined;
	players: Set<string>;
	isCoop: boolean;
}

const sessions: Map<string, GameSession> = new Map();

function getSession(sessionId: string): GameSession | undefined {
	return sessions.get(sessionId);
}

function createSession(sessionId: string, isCoop: boolean): GameSession {
	const session: GameSession = {
		ennemies: [],
		playing: false,
		currentSpawnIntervalMs: initialSpawnIntervalMs,
		spawnTimeout: undefined,
		players: new Set(),
		isCoop
	};
	sessions.set(sessionId, session);
	return session;
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
	const random: number = Math.round(Math.random() * 100);
	let health = 25, moveSpeed = 1, url = 0;
	if(random < 25) {
		health = 10;
		moveSpeed = 5;
		url = 1;
	}
	const newEnnemi = new Ennemi(rightWall + ENNEMI_RENDER_WIDTH, Math.random() * (arenaHeight - ENNEMI_RENDER_HEIGHT), health, moveSpeed, url);
	session.ennemies.push(newEnnemi);
	session.players.forEach(socketId => {
		io.to(socketId).emit("ennemiEvent", session.ennemies);
	});
	console.log(`[Session ${sessionId}] Ennemi spawned. Total: ${session.ennemies.length}`);
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
			io.emit("newEnnemyKilled", session.ennemies[index].imageId);
			removeEnnemi(sessionId, index);
		}
	}
}

function scheduleNextSpawn(session: GameSession, sessionId: string) {
	if (!session.playing) return;

	session.spawnTimeout = setTimeout(() => {
		if (!session.playing) return;

		if (session.ennemies.length < 50) {
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
			}
		});

		for (let i = session.ennemies.length - 1; i >= 0; i--) {
			if (session.ennemies[i].posX <= leftCleanupLimit) {
				session.ennemies.splice(i, 1);
			}
		}

		session.players.forEach(socketId => {
			io.to(socketId).emit("ennemiEvent", session.ennemies);
		});
	});
}
setInterval(autoMoveAll, 100);

export function startPlaying(sessionId: string, socketId: string, isCoop: boolean) {
	let session = getSession(sessionId);

	if (!session) {
		session = createSession(sessionId, isCoop);
	}

	session.players.add(socketId);
	session.isCoop = isCoop;

	const shouldReset = !isCoop || !session.playing;

	if (shouldReset) {
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