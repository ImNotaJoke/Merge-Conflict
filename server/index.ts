import http from 'http';
import { Server as IOServer } from 'socket.io';
import type { LeaderboardEntry } from '../common/types.ts';
import { startPlaying, stopPlaying, removeEnnemi, hurtEnnemi, playerDisconnected } from './ennemies-management.ts';
import { getLeaderboard, saveScore } from './leaderboard-storage.ts';

const name: string = process.argv[2];

const httpServer = http.createServer((_req, res) => {
	res.statusCode = 200;
	res.setHeader('Content-Type', 'text/html');
	res.end(`Think ${name}, Think !\nPWD: ${process.env['PWD']}`);
});

const connections:string[] = [];
// Track player positions for coop
const playerPositions: Map<string, { posX: number; posY: number }> = new Map();
// Track which session each player is in
const playerSessions: Map<string, string> = new Map();

// Single coop session ID (all coop players share this)
const COOP_SESSION_ID = "coop-session";

const port = process.env['PORT'] || 8080;
httpServer.listen(port, () => {
	console.log(`Server running at http://localhost:${port}/`);
});

export const io = new IOServer(httpServer, { cors: { origin: true } });
io.on('connection', socket => {
	console.log(`Nouvelle connexion du client ${socket.id}`);
	connections.push(socket.id);
    socket.on('disconnect', () => {
		connections.splice(connections.indexOf(socket.id), 1);
		playerPositions.delete(socket.id);
		
		const sessionId = playerSessions.get(socket.id);
		if (sessionId) {
			// Notify only players in the same session
			socket.to(sessionId).emit("secondPlayerDisconnect", socket.id);
			playerDisconnected(socket.id);
			playerSessions.delete(socket.id);
		}
		
		console.log(`Déconnexion du client ${socket.id}`);
	});
    socket.on("startPlaying", (data: { isCoop: boolean }) => {
		const isCoop = data?.isCoop ?? false;
		// Solo players get their own session (socket.id), coop players share one session
		const sessionId = isCoop ? COOP_SESSION_ID : socket.id;
		playerSessions.set(socket.id, sessionId);
		// Join the socket.io room for this session
		socket.join(sessionId);
        startPlaying(sessionId, socket.id, isCoop);
		
		// For coop: notify other players that a new player joined and send existing positions
		if (isCoop) {
			// Send this player's initial position to others
			socket.to(sessionId).emit("secondPlayerUpdate", {
				posX: 0,
				posY: 0,
				socketId: socket.id
			});
			// Request position update from existing players (they'll respond via playerMove)
			socket.to(sessionId).emit("requestPositionUpdate");
		}
    });
    socket.on("stopPlaying", () => {
		const sessionId = playerSessions.get(socket.id);
		if (sessionId) {
			socket.leave(sessionId);
			stopPlaying(sessionId, socket.id);
			playerSessions.delete(socket.id);
		}
	});
	// Handle player movement for coop - broadcast only to same session
	socket.on("playerMove", (data: { posX: number; posY: number }) => {
		playerPositions.set(socket.id, data);
		const sessionId = playerSessions.get(socket.id);
		// Only broadcast if in coop session
		if (sessionId === COOP_SESSION_ID) {
			socket.to(sessionId).emit("secondPlayerUpdate", {
				posX: data.posX,
				posY: data.posY,
				socketId: socket.id
			});
		}
	});
	// Handle player shoot for coop - broadcast only to same session
	socket.on("playerShoot", (data: { posX: number; posY: number }) => {
		const sessionId = playerSessions.get(socket.id);
		if (sessionId === COOP_SESSION_ID) {
			socket.to(sessionId).emit("secondPlayerShoot", {
				posX: data.posX,
				posY: data.posY,
				socketId: socket.id
			});
		}
	});
	socket.on("enemyKilled", (index: number) => {
		const sessionId = playerSessions.get(socket.id);
		if (sessionId) {
			removeEnnemi(sessionId, index);
		}
    });
	socket.on("enemyHurt", (index: number) => {
		const sessionId = playerSessions.get(socket.id);
		if (sessionId) {
			hurtEnnemi(sessionId, index);
		}
    })
	socket.on("submitScore", async (entry: LeaderboardEntry, ack?: (success: boolean) => void) => {
		if (!entry?.pseudo || !Number.isFinite(entry?.score) || !entry?.date) {
			ack?.(false);
			return;
		}

		await saveScore({
			pseudo: entry.pseudo,
			score: Math.max(0, Math.trunc(entry.score)),
			date: entry.date,
		});
		ack?.(true);
	});
	socket.on("getLeaderboard", async (ack?: (scores: LeaderboardEntry[]) => void) => {
		const scores = await getLeaderboard();
		ack?.(scores);
	});
});