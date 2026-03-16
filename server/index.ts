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