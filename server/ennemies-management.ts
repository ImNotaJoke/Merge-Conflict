import { Ennemi } from "../common/types.ts";
import { io } from "./index.ts";

const rightWall:number = 1980;
const arenaHeight:number = 720;
const leftCleanupLimit:number = -100;
const initialSpawnIntervalMs:number = 4000;
const minimumSpawnIntervalMs:number = 700;
const spawnAccelerationMs:number = 100;

// Session-based enemy management
interface GameSession {
	ennemies: Ennemi[];
	playing: boolean;
	currentSpawnIntervalMs: number;
	spawnTimeout: NodeJS.Timeout | undefined;
	players: Set<string>; // socket IDs in this session
	isCoop: boolean;
}

const sessions: Map<string, GameSession> = new Map();

// Get or create session for a socket
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
	const newEnnemi = new Ennemi(rightWall, Math.random() * arenaHeight, 25);
	session.ennemies.push(newEnnemi);
	// Emit only to players in this session
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

export function hurtEnnemi(sessionId: string, index: number) {
	const session = getSession(sessionId);
	if (!session) return;
	
	if (index >= 0 && index < session.ennemies.length) {
		if (session.ennemies[index].health <= 0) {
			removeEnnemi(sessionId, index);
			return;
		}
		session.ennemies[index].hurt();
	}
}

function scheduleNextSpawn(session: GameSession, sessionId: string) {
	if (!session.playing) {
		return;
	}

	session.spawnTimeout = setTimeout(() => {
		if (!session.playing) {
			return;
		}
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

// Auto-move enemies for all active sessions
function autoMoveAll() {
	sessions.forEach((session, sessionId) => {
		if (session.playing) {
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
		}
	});
}
setInterval(autoMoveAll, 100);

export function startPlaying(sessionId: string, socketId: string, isCoop: boolean) {
	let session = getSession(sessionId);
	
	if (!session) {
		session = createSession(sessionId, isCoop);
	}
	
	session.players.add(socketId);
	
	// Only reset if this is a new game (not a player joining existing coop)
	if (!session.playing) {
		resetSpawnTimer(session);
		session.ennemies.length = 0;
		session.playing = true;
		spawnEnnemi(session, sessionId);
		scheduleNextSpawn(session, sessionId);
		console.log(`[Session ${sessionId}] Game started (coop: ${isCoop})`);
	} else {
		// Player joining or rejoining existing session - send current state immediately
		io.to(socketId).emit("ennemiEvent", session.ennemies);
		console.log(`[Session ${sessionId}] Player ${socketId} joined existing game. Enemies: ${session.ennemies.length}`);
	}
}

// Get current player count in a session
export function getSessionPlayerCount(sessionId: string): number {
	const session = getSession(sessionId);
	return session ? session.players.size : 0;
}

export function stopPlaying(sessionId: string, socketId: string) {
	const session = getSession(sessionId);
	if (!session) return;
	
	session.players.delete(socketId);
	console.log(`[Session ${sessionId}] Player ${socketId} left. Players remaining: ${session.players.size}`);
	
	// Only delete session if NO players remain
	// For coop: session persists as long as at least one player stays
	if (session.players.size === 0) {
		resetSpawnTimer(session);
		session.playing = false;
		session.ennemies.length = 0;
		deleteSession(sessionId);
		console.log(`[Session ${sessionId}] Game ended - all players left`);
	}
}

export function playerDisconnected(socketId: string) {
	// Find and clean up any session this player was in
	sessions.forEach((session, sessionId) => {
		if (session.players.has(socketId)) {
			stopPlaying(sessionId, socketId);
		}
	});
}