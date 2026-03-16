import http from 'http';
import { Server as IOServer } from 'socket.io';
import type { LeaderboardEntry } from '../common/types.ts';
import { startPlaying, stopPlaying, removeEnnemi, hurtEnnemi } from './ennemies-management.ts';
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

const port = process.env['PORT'] || 8080;
httpServer.listen(port, () => {
	console.log(`Server running at http://localhost:${port}/`);
});

export const io = new IOServer(httpServer, { cors: { origin: true } });
io.on('connection', socket => {
	console.log(`Nouvelle connexion du client ${socket.id}`);
	connections.push(socket.id);
    socket.on('disconnect', () => {
		connections.splice(connections.indexOf(socket.id));
		playerPositions.delete(socket.id);
		// Notify other players that this player disconnected
		socket.broadcast.emit("secondPlayerDisconnect", socket.id);
		console.log(`Déconnexion du client ${socket.id}`);
		if(connections.length === 0) {
			stopPlaying();
		}
	});
    socket.on("startPlaying", () => {
        startPlaying();
    });
    socket.on("stopPlaying", () => {
        stopPlaying();
	});
	// Handle player movement for coop - broadcast to other players
	socket.on("playerMove", (data: { posX: number; posY: number }) => {
		playerPositions.set(socket.id, data);
		// Broadcast position to all other connected clients
		socket.broadcast.emit("secondPlayerUpdate", {
			posX: data.posX,
			posY: data.posY,
			socketId: socket.id
		});
	});
	socket.on("enemyKilled", (index: number) => {
        removeEnnemi(index);
    });
	socket.on("enemyHurt", (index: number) => {
        hurtEnnemi(index);
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