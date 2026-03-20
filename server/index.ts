import http from 'http';
import { Server as IOServer } from 'socket.io';
import type { LeaderboardEntry } from '../common/types.ts';
import { startPlaying, stopPlaying, removeEnnemi, hurtEnnemi, playerDisconnected } from './ennemies-management.ts';
import { saveScore, getSeparateLeaderboards } from './leaderboard-storage.ts';

const name: string = process.argv[2];

const httpServer = http.createServer((_req, res) => {
	res.statusCode = 200;
	res.setHeader('Content-Type', 'text/html');
	res.end(`Think ${name}, Think !\nPWD: ${process.env['PWD']}`);
});

const connections: string[] = [];
const playerPositions: Map<string, { posX: number; posY: number }> = new Map();
const playerSessions: Map<string, string> = new Map();

interface RoomData {
	id: string;
	hostId: string;
	hostPseudo: string;
	guestId?: string;
	guestPseudo?: string;
	status: 'waiting' | 'playing' | 'ended';
}

const rooms: Map<string, RoomData> = new Map();
const playerRooms: Map<string, string> = new Map();

function generateRoomId(): string {
	return Math.random().toString(36).substring(2, 8).toUpperCase();
}

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

		const roomId = playerRooms.get(socket.id);
		if (roomId) {
			const room = rooms.get(roomId);
			if (room) {
				if (room.status === 'playing') {
					const otherPlayerId = room.hostId === socket.id ? room.guestId : room.hostId;
					if (otherPlayerId) {
						io.to(otherPlayerId).emit("gameOverRoom", { reason: "disconnect" });
						stopPlaying(roomId, otherPlayerId);
						playerRooms.delete(otherPlayerId);
						playerSessions.delete(otherPlayerId);
					}
				}
				rooms.delete(roomId);
			}
			playerRooms.delete(socket.id);
		}

		const sessionId = playerSessions.get(socket.id);
		if (sessionId) {
			socket.to(sessionId).emit("secondPlayerDisconnect", socket.id);
			playerDisconnected(socket.id);
			playerSessions.delete(socket.id);
		}

		console.log(`Déconnexion du client ${socket.id}`);
	});

	socket.on("createRoom", (data: { pseudo: string }, ack?: (result: { success: boolean; roomId?: string }) => void) => {
		const roomId = generateRoomId();
		const room: RoomData = {
			id: roomId,
			hostId: socket.id,
			hostPseudo: data.pseudo || "Guest",
			status: 'waiting',
		};
		rooms.set(roomId, room);
		playerRooms.set(socket.id, roomId);
		socket.join(roomId);
		console.log(`Room ${roomId} created by ${socket.id}`);
		ack?.({ success: true, roomId });
	});

	socket.on("getRooms", (ack?: (roomList: Array<{ id: string; hostPseudo: string }>) => void) => {
		const availableRooms: Array<{ id: string; hostPseudo: string }> = [];
		rooms.forEach((room) => {
			if (room.status === 'waiting') {
				availableRooms.push({ id: room.id, hostPseudo: room.hostPseudo });
			}
		});
		ack?.(availableRooms);
	});

	socket.on("joinRoom", (data: { roomId: string; pseudo: string }, ack?: (result: { success: boolean; error?: string; hostPseudo?: string }) => void) => {
		const room = rooms.get(data.roomId);
		if (!room) {
			ack?.({ success: false, error: "Room introuvable" });
			return;
		}
		if (room.status !== 'waiting') {
			ack?.({ success: false, error: "Partie déjà en cours" });
			return;
		}
		if (room.guestId) {
			ack?.({ success: false, error: "Room pleine" });
			return;
		}

		room.guestId = socket.id;
		room.guestPseudo = data.pseudo || "Invité";
		room.status = 'playing';
		playerRooms.set(socket.id, data.roomId);
		socket.join(data.roomId);

		console.log(`Player ${socket.id} joined room ${data.roomId}`);
		ack?.({ success: true, hostPseudo: room.hostPseudo });

		io.to(room.hostId).emit("roomReady", {
			guestPseudo: room.guestPseudo,
			roomId: data.roomId
		});

		socket.emit("roomReady", {
			hostPseudo: room.hostPseudo,
			roomId: data.roomId
		});
	});

	socket.on("leaveRoom", () => {
		const roomId = playerRooms.get(socket.id);
		if (!roomId) return;

		const room = rooms.get(roomId);
		if (!room) return;

		socket.leave(roomId);
		stopPlaying(roomId, socket.id);
		playerRooms.delete(socket.id);
		playerSessions.delete(socket.id);

		if (room.hostId === socket.id) {
			if (room.guestId) {
				io.to(room.guestId).emit("gameOverRoom", { reason: "host_left" });
				stopPlaying(roomId, room.guestId);
				playerRooms.delete(room.guestId);
				playerSessions.delete(room.guestId);
			}
			rooms.delete(roomId);
		} else if (room.guestId === socket.id) {
			if (room.status === 'playing') {
				io.to(room.hostId).emit("gameOverRoom", { reason: "guest_left" });
				stopPlaying(roomId, room.hostId);
				playerRooms.delete(room.hostId);
				playerSessions.delete(room.hostId);
				rooms.delete(roomId);
			} else {
				room.guestId = undefined;
				room.guestPseudo = undefined;
			}
		}

		console.log(`Player ${socket.id} left room ${roomId}`);
	});

	socket.on("healthUpdate", (data: { health: number }) => {
		const roomId = playerRooms.get(socket.id);
		if (roomId) {
			socket.to(roomId).emit("allyHealthUpdate", { health: data.health, socketId: socket.id });
		}
	});

	socket.on("playerDied", () => {
		const roomId = playerRooms.get(socket.id);
		if (!roomId) return;

		const room = rooms.get(roomId);
		if (!room || room.status !== 'playing') return;

		room.status = 'ended';
		io.to(roomId).emit("gameOverRoom", { reason: "player_died", deadPlayerId: socket.id });

		stopPlaying(roomId, room.hostId);
		if (room.guestId) stopPlaying(roomId, room.guestId);

		playerRooms.delete(room.hostId);
		playerSessions.delete(room.hostId);
		if (room.guestId) {
			playerRooms.delete(room.guestId);
			playerSessions.delete(room.guestId);
		}
		rooms.delete(roomId);
	});

	socket.on("startPlaying", (data: { isCoop: boolean; roomId?: string }) => {
		const isCoop = data?.isCoop ?? false;
		const sessionId = isCoop && data.roomId ? data.roomId : socket.id;

		playerSessions.set(socket.id, sessionId);
		if (isCoop && data.roomId) {
			playerRooms.set(socket.id, data.roomId);
		}

		socket.join(sessionId);
		startPlaying(sessionId, socket.id, isCoop);

		if (isCoop) {
			socket.to(sessionId).emit("secondPlayerUpdate", {
				posX: 0,
				posY: 0,
				socketId: socket.id
			});
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

	socket.on("playerMove", (data: { posX: number; posY: number }) => {
		playerPositions.set(socket.id, data);
		const sessionId = playerSessions.get(socket.id);
		if (sessionId && sessionId !== socket.id) {
			socket.to(sessionId).emit("secondPlayerUpdate", {
				posX: data.posX,
				posY: data.posY,
				socketId: socket.id
			});
		}
	});

	socket.on("playerShoot", (data: { posX: number; posY: number }) => {
		const sessionId = playerSessions.get(socket.id);
		if (sessionId && sessionId !== socket.id) {
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

	socket.on("enemyHurt", (index: number, damage: number) => {
		const sessionId = playerSessions.get(socket.id);
		if (sessionId) {
			hurtEnnemi(sessionId, index,damage);
		}
	});

	socket.on("submitScore", async (entry: LeaderboardEntry, ack?: (success: boolean) => void) => {
		if (!entry?.pseudo || !Number.isFinite(entry?.score) || !entry?.date || !entry?.mode) {
			ack?.(false);
			return;
		}
		await saveScore({
			pseudo: entry.pseudo,
			score: Math.max(0, Math.trunc(entry.score)),
			date: entry.date,
			mode: entry.mode,
		});
		ack?.(true);
	});

	socket.on("getLeaderboard", async (ack?: (scores: { solo: LeaderboardEntry[]; coop: LeaderboardEntry[] }) => void) => {
		const scores = await getSeparateLeaderboards();
		ack?.(scores);
	});
});