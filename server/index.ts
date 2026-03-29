import http from 'http';
import { Server as IOServer } from 'socket.io';
import type { LeaderboardEntry, MultiplayerPlayerData, MultiplayerRoomData, MultiplayerRoomConfig, MultiplayerRoomInfo, MultiplayerEndGameStats } from '../common/types.ts';
import { startPlaying, stopPlaying, removeEnnemi, hurtEnnemi, playerDisconnected, startMultiplayerGame, stopMultiplayerGame } from './ennemies-management.ts';
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
	hostSkin: string;
	guestId?: string;
	guestPseudo?: string;
	guestSkin?: string;
	status: 'waiting' | 'playing' | 'ended';
}

const rooms: Map<string, RoomData> = new Map();
const playerRooms: Map<string, string> = new Map();

const multiRooms: Map<string, MultiplayerRoomData> = new Map();
const multiPlayerRooms: Map<string, string> = new Map(); // socketId -> roomId

function generateRoomId(): string {
	return Math.random().toString(36).substring(2, 8).toUpperCase();
}

function createMultiplayerPlayer(socketId: string, pseudo: string, isHost: boolean, skinIndex: string = "isa-lega"): MultiplayerPlayerData {
	return {
		socketId,
		pseudo,
		status: 'waiting',
		posX: 100,
		posY: 360,
		health: 3,
		score: 0,
		killedEnemies: {},
		survivalSeconds: 0,
		isHost,
		skinIndex,
	};
}

function migrateHost(room: MultiplayerRoomData): boolean {
	for (const [socketId, player] of room.players) {
		if (player.status !== 'disconnected') {
			room.hostId = socketId;
			player.isHost = true;
			console.log(`[Room ${room.id}] Host migrated to ${player.pseudo}`);
			return true;
		}
	}
	return false;
}

function getAlivePlayersCount(room: MultiplayerRoomData): number {
	let count = 0;
	for (const player of room.players.values()) {
		if (player.status === 'playing') {
			count++;
		}
	}
	return count;
}

function getAllPlayersEndStats(room: MultiplayerRoomData): MultiplayerEndGameStats[] {
	const stats: MultiplayerEndGameStats[] = [];

	for (const player of room.players.values()) {
		const totalKilled = Object.values(player.killedEnemies).reduce((a, b) => a + b, 0);
		stats.push({
			pseudo: player.pseudo,
			score: player.score,
			killedEnemies: totalKilled,
			survivalSeconds: player.survivalSeconds,
			status: player.status === 'spectator' ? 'dead' : 'alive',
		});
	}

	for (const player of room.disconnectedPlayers.values()) {
		const totalKilled = Object.values(player.killedEnemies).reduce((a, b) => a + b, 0);
		stats.push({
			pseudo: player.pseudo,
			score: player.score,
			killedEnemies: totalKilled,
			survivalSeconds: player.survivalSeconds,
			status: 'dead',
		});
	}

	stats.sort((a, b) => b.score - a.score);
	return stats;
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

		const multiRoomId = multiPlayerRooms.get(socket.id);
		if (multiRoomId) {
			const multiRoom = multiRooms.get(multiRoomId);
			if (multiRoom) {
				const player = multiRoom.players.get(socket.id);
				if (player) {
					multiRoom.disconnectedPlayers.set(player.pseudo, { ...player, status: 'disconnected' });
					multiRoom.players.delete(socket.id);

					if (multiRoom.hostId === socket.id) {
						const migrated = migrateHost(multiRoom);
						if (migrated) {
							io.to(multiRoomId).emit("multiHostMigrated", {
								newHostId: multiRoom.hostId,
								newHostPseudo: multiRoom.players.get(multiRoom.hostId)?.pseudo
							});
						}
					}

					io.to(multiRoomId).emit("multiPlayerDisconnected", {
						socketId: socket.id,
						pseudo: player.pseudo
					});

					if (multiRoom.players.size === 0) {
						multiRooms.delete(multiRoomId);
						stopPlaying(multiRoomId, socket.id);
						console.log(`[Room ${multiRoomId}] Deleted (empty)`);
					} else if (multiRoom.status === 'playing' && getAlivePlayersCount(multiRoom) === 0) {
						multiRoom.status = 'ended';
						stopPlaying(multiRoomId, socket.id);
						const stats = getAllPlayersEndStats(multiRoom);
						io.to(multiRoomId).emit("multiGameEnded", { stats, reason: "all_dead" });
					} else {
						stopPlaying(multiRoomId, socket.id);
					}
				}
			}
			multiPlayerRooms.delete(socket.id);
		}

		const sessionId = playerSessions.get(socket.id);
		if (sessionId) {
			socket.to(sessionId).emit("secondPlayerDisconnect", socket.id);
			playerDisconnected(socket.id);
			playerSessions.delete(socket.id);
		}

		console.log(`Déconnexion du client ${socket.id}`);
	});

	socket.on("createRoom", (data: { pseudo: string, skinIndex: string }, ack?: (result: { success: boolean; roomId?: string }) => void) => {
		const roomId = generateRoomId();
		const room: RoomData = {
			id: roomId,
			hostId: socket.id,
			hostPseudo: data.pseudo || "Guest",
			hostSkin: data.skinIndex || "isa-lega",
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

	socket.on("joinRoom", (data: { roomId: string; pseudo: string; skinIndex: string }, ack?: (result: { success: boolean; error?: string; hostPseudo?: string }) => void) => {
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
		room.guestSkin = data.skinIndex || "isa-lega";
		room.status = 'playing';
		playerRooms.set(socket.id, data.roomId);
		socket.join(data.roomId);

		console.log(`Server: Player ${socket.id} (${data.pseudo}) joined room ${data.roomId}`);
		ack?.({ success: true, hostPseudo: room.hostPseudo });

		io.to(data.roomId).emit("roomReady", {
			roomId: data.roomId
		});
		console.log(`Server: Emitted roomReady to room ${data.roomId}`);
	});

	// ... (rest of the code) ...
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

	socket.on("startPlaying", (data: { isCoop: boolean; roomId?: string; difficulty?: number; skinIndex?: string }) => {
		const isCoop = data?.isCoop ?? false;
		const difficulty = Number.isFinite(data?.difficulty) ? Number(data.difficulty) : 0;
		const sessionId = isCoop && data.roomId ? data.roomId : socket.id;
		console.log(`Server: startPlaying from ${socket.id}. session=${sessionId}, coop=${isCoop}, difficulty=${difficulty}`);

		playerSessions.set(socket.id, sessionId);
		if (isCoop && data.roomId) {
			playerRooms.set(socket.id, data.roomId);
		}

		socket.join(sessionId);
		startPlaying(sessionId, socket.id, isCoop, difficulty);

		if (isCoop) {
			socket.to(sessionId).emit("secondPlayerUpdate", {
				posX: 0,
				posY: 0,
				socketId: socket.id,
				modelId: data.skinIndex
			});
			socket.to(sessionId).emit("requestPositionUpdate");
		}
	});

	socket.on("stopPlaying", () => {
		const sessionId = playerSessions.get(socket.id);
		if (sessionId) {
			console.log(`Server: stopPlaying from ${socket.id}. session=${sessionId}`);
			socket.leave(sessionId);
			stopPlaying(sessionId, socket.id);
			playerSessions.delete(socket.id);
		}
	});

	socket.on("playerMove", (data: { posX: number; posY: number; modelId: string }) => {
		playerPositions.set(socket.id, data);
		const sessionId = playerSessions.get(socket.id);
		if (sessionId && sessionId !== socket.id) {
			socket.to(sessionId).emit("secondPlayerUpdate", {
				posX: data.posX,
				posY: data.posY,
				socketId: socket.id,
				modelId: data.modelId
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
			console.log(`Server: enemyKilled requested by ${socket.id} in session ${sessionId} at index ${index}`);
			removeEnnemi(sessionId, index);
		}
	});

	socket.on("enemyHurt", (index: number, damage: number) => {
		const sessionId = playerSessions.get(socket.id);
		if (sessionId) {
			console.log(`Server: enemyHurt from ${socket.id} in session ${sessionId}. index=${index}, damage=${damage}`);
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

	socket.on("collectBonus", (data: { id: string, type: string }) => {
		const sessionId = playerSessions.get(socket.id);
		if (sessionId) {
			console.log(`Server: collectBonus from ${socket.id} in session ${sessionId}. bonus=${data.id}, type=${data.type}`);
			io.to(sessionId).emit("applyBonus", data);
			console.log(`Server: applyBonus broadcast in session ${sessionId}. bonus=${data.id}, type=${data.type}`);
		}
	});

	socket.on("createMultiRoom", (data: { pseudo: string; config: MultiplayerRoomConfig; skinIndex?: string }, ack?: (result: { success: boolean; roomId?: string }) => void) => {
		const roomId = generateRoomId();
		const player = createMultiplayerPlayer(socket.id, data.pseudo || "Host", true, data.skinIndex || "isa-lega");

		const room: MultiplayerRoomData = {
			id: roomId,
			hostId: socket.id,
			config: {
				difficulty: data.config?.difficulty ?? 1,
				maxPlayers: Math.min(10, Math.max(3, data.config?.maxPlayers ?? 4)),
			},
			players: new Map([[socket.id, player]]),
			disconnectedPlayers: new Map(),
			status: 'waiting',
		};

		multiRooms.set(roomId, room);
		multiPlayerRooms.set(socket.id, roomId);
		socket.join(roomId);

		console.log(`[MultiRoom ${roomId}] Created by ${data.pseudo} (difficulty: ${room.config.difficulty}, max: ${room.config.maxPlayers})`);
		ack?.({ success: true, roomId });
	});

	socket.on("getMultiRooms", (ack?: (roomList: MultiplayerRoomInfo[]) => void) => {
		const availableRooms: MultiplayerRoomInfo[] = [];
		multiRooms.forEach((room) => {
			if (room.status === 'waiting' && room.players.size < room.config.maxPlayers) {
				const host = room.players.get(room.hostId);
				availableRooms.push({
					id: room.id,
					hostPseudo: host?.pseudo || "Unknown",
					playerCount: room.players.size,
					maxPlayers: room.config.maxPlayers,
					difficulty: room.config.difficulty,
				});
			}
		});
		ack?.(availableRooms);
	});

	socket.on("joinMultiRoom", (data: { roomId: string; pseudo: string; skinIndex: string }, ack?: (result: { success: boolean; error?: string; players?: MultiplayerPlayerData[]; config?: MultiplayerRoomConfig }) => void) => {
		const room = multiRooms.get(data.roomId);
		console.log("[" + data.roomId + "]" + data.pseudo + " : " + data.skinIndex);
		if (!room) {
			ack?.({ success: false, error: "Room introuvable" });
			return;
		}
		if (room.status !== 'waiting') {
			const disconnectedPlayer = room.disconnectedPlayers.get(data.pseudo);
			if (disconnectedPlayer && room.status === 'playing') {
				disconnectedPlayer.socketId = socket.id;
				disconnectedPlayer.status = disconnectedPlayer.health > 0 ? 'playing' : 'spectator';
				room.players.set(socket.id, disconnectedPlayer);
				room.disconnectedPlayers.delete(data.pseudo);
				multiPlayerRooms.set(socket.id, data.roomId);
				socket.join(data.roomId);

				console.log(`[MultiRoom ${data.roomId}] ${data.pseudo} reconnected`);

				socket.emit("multiReconnected", {
					player: disconnectedPlayer,
					config: room.config,
					players: Array.from(room.players.values()),
				});

				io.to(data.roomId).emit("multiPlayerReconnected", {
					player: disconnectedPlayer,
				});

				ack?.({ success: true, players: Array.from(room.players.values()), config: room.config });
				return;
			}
			ack?.({ success: false, error: "Partie déjà en cours" });
			return;
		}
		if (room.players.size >= room.config.maxPlayers) {
			ack?.({ success: false, error: "Room pleine" });
			return;
		}

		const player = createMultiplayerPlayer(socket.id, data.pseudo || "Player", false, data.skinIndex || "isa-lega");
		room.players.set(socket.id, player);
		multiPlayerRooms.set(socket.id, data.roomId);
		socket.join(data.roomId);

		console.log(`[MultiRoom ${data.roomId}] ${data.pseudo} joined (${room.players.size}/${room.config.maxPlayers})`);

		io.to(data.roomId).emit("multiPlayerJoined", { player });

		ack?.({ success: true, players: Array.from(room.players.values()), config: room.config });
	});

	socket.on("leaveMultiRoom", () => {
		const roomId = multiPlayerRooms.get(socket.id);
		if (!roomId) return;

		const room = multiRooms.get(roomId);
		if (!room) return;

		const player = room.players.get(socket.id);
		socket.leave(roomId);
		room.players.delete(socket.id);
		multiPlayerRooms.delete(socket.id);

		if (room.status === 'playing' || room.status === 'ended') {
			stopPlaying(roomId, socket.id);
		}

		if (room.players.size === 0) {
			multiRooms.delete(roomId);
			console.log(`[MultiRoom ${roomId}] Deleted (empty after leave)`);
			return;
		}

		if (room.status === 'waiting') {
			if (room.players.size === 0) {
				multiRooms.delete(roomId);
				console.log(`[MultiRoom ${roomId}] Deleted (host left in waiting)`);
			} else if (room.hostId === socket.id) {
				migrateHost(room);
				io.to(roomId).emit("multiHostMigrated", {
					newHostId: room.hostId,
					newHostPseudo: room.players.get(room.hostId)?.pseudo
				});
			}
			io.to(roomId).emit("multiPlayerLeft", { socketId: socket.id, pseudo: player?.pseudo });
		} else if (room.status === 'playing') {
			if (player) {
				room.disconnectedPlayers.set(player.pseudo, { ...player, status: 'disconnected' });
			}
			io.to(roomId).emit("multiPlayerDisconnected", { socketId: socket.id, pseudo: player?.pseudo });

			if (getAlivePlayersCount(room) === 0) {
				room.status = 'ended';
				stopMultiplayerGame(roomId);
				const stats = getAllPlayersEndStats(room);
				io.to(roomId).emit("multiGameEnded", { stats, reason: "all_dead" });
			}
		}

		console.log(`[MultiRoom ${roomId}] ${player?.pseudo} left`);
	});

	socket.on("startMultiGame", () => {
		const roomId = multiPlayerRooms.get(socket.id);
		if (!roomId) return;

		const room = multiRooms.get(roomId);
		if (!room || room.status !== 'waiting') return;

		if (room.hostId !== socket.id) return;

		if (room.players.size < 2) return;

		room.status = 'playing';
		room.gameStartTime = Date.now();

		for (const player of room.players.values()) {
			player.status = 'playing';
		}

		io.to(roomId).emit("multiGameStarted", {
			players: Array.from(room.players.values()),
			config: room.config,
		});

		const playerCount = room.players.size;
		const playerIds = Array.from(room.players.keys());
		startMultiplayerGame(roomId, playerCount, room.config.difficulty, playerIds);

		console.log(`[MultiRoom ${roomId}] Game started with ${playerCount} players`);
	});

	socket.on("multiPlayerMove", (data: { posX: number; posY: number }) => {
		const roomId = multiPlayerRooms.get(socket.id);
		if (!roomId) return;

		const room = multiRooms.get(roomId);
		if (!room || room.status !== 'playing') return;

		const player = room.players.get(socket.id);
		if (!player || player.status !== 'playing') return;

		player.posX = data.posX;
		player.posY = data.posY;

		socket.to(roomId).emit("multiPlayerMoved", {
			socketId: socket.id,
			posX: data.posX,
			posY: data.posY,
		});
	});

	socket.on("multiPlayerShoot", (data: { posX: number; posY: number }) => {
		const roomId = multiPlayerRooms.get(socket.id);
		if (!roomId) return;

		const room = multiRooms.get(roomId);
		if (!room || room.status !== 'playing') return;

		const player = room.players.get(socket.id);
		if (!player || player.status !== 'playing') return;

		socket.to(roomId).emit("multiPlayerShot", {
			socketId: socket.id,
			posX: data.posX,
			posY: data.posY,
		});
	});

	socket.on("multiHealthUpdate", (data: { health: number }) => {
		const roomId = multiPlayerRooms.get(socket.id);
		if (!roomId) return;

		const room = multiRooms.get(roomId);
		if (!room || room.status !== 'playing') return;

		const player = room.players.get(socket.id);
		if (!player) return;

		player.health = data.health;

		socket.to(roomId).emit("multiPlayerHealthUpdate", {
			socketId: socket.id,
			health: data.health,
		});
	});

	socket.on("multiPlayerDied", (data: { score: number; killedEnemies: Record<number, number>; survivalSeconds: number }) => {
		const roomId = multiPlayerRooms.get(socket.id);
		if (!roomId) return;

		const room = multiRooms.get(roomId);
		if (!room || room.status !== 'playing') return;

		const player = room.players.get(socket.id);
		if (!player) return;

		player.status = 'spectator';
		player.score = data.score;
		player.killedEnemies = data.killedEnemies;
		player.survivalSeconds = data.survivalSeconds;

		console.log(`[MultiRoom ${roomId}] ${player.pseudo} died (score: ${data.score})`);

		io.to(roomId).emit("multiPlayerBecameSpectator", {
			socketId: socket.id,
			pseudo: player.pseudo,
		});

		const alivePlayers = getAlivePlayersCount(room);
		if (alivePlayers === 0) {
			room.status = 'ended';
			stopMultiplayerGame(roomId);
			const stats = getAllPlayersEndStats(room);
			io.to(roomId).emit("multiGameEnded", { stats, reason: "all_dead" });
			console.log(`[MultiRoom ${roomId}] Game ended (all dead)`);
		}
	});

	socket.on("multiScoreUpdate", (data: { score: number; killedEnemies: Record<number, number>; survivalSeconds: number }) => {
		const roomId = multiPlayerRooms.get(socket.id);
		if (!roomId) return;

		const room = multiRooms.get(roomId);
		if (!room) return;

		const player = room.players.get(socket.id);
		if (!player) return;

		player.score = data.score;
		player.killedEnemies = data.killedEnemies;
		player.survivalSeconds = data.survivalSeconds;
	});

	socket.on("multiEnemyKilled", (index: number) => {
		const roomId = multiPlayerRooms.get(socket.id);
		if (roomId) {
			console.log(`Server: multiEnemyKilled by ${socket.id} in room ${roomId} at index ${index}`);
			removeEnnemi(roomId, index);
		}
	});

	socket.on("multiEnemyHurt", (index: number, damage: number) => {
		const roomId = multiPlayerRooms.get(socket.id);
		if (roomId) {
			console.log(`Server: multiEnemyHurt from ${socket.id} in room ${roomId}. index=${index}, damage=${damage}`);
			hurtEnnemi(roomId, index, damage);
		}
	});

	socket.on("multiCollectBonus", (data: { id: string; type: string }) => {
		const roomId = multiPlayerRooms.get(socket.id);
		if (roomId) {
			console.log(`Server: multiCollectBonus from ${socket.id} in room ${roomId}. bonus=${data.id}, type=${data.type}`);
			io.to(roomId).emit("multiApplyBonus", data);
			console.log(`Server: multiApplyBonus broadcast in room ${roomId}. bonus=${data.id}, type=${data.type}`);
		}
	});

	socket.on("getMultiRoomPlayers", (ack?: (players: MultiplayerPlayerData[]) => void) => {
		const roomId = multiPlayerRooms.get(socket.id);
		if (!roomId) {
			ack?.([]);
			return;
		}
		const room = multiRooms.get(roomId);
		if (!room) {
			ack?.([]);
			return;
		}
		ack?.(Array.from(room.players.values()));
	});
});