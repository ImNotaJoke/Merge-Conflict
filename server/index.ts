import http from 'http';
import { Server as IOServer } from 'socket.io';
import { startPlaying, stopPlaying } from './ennemies-management.ts';

const name: string = process.argv[2];

const httpServer = http.createServer((_req, res) => {
	res.statusCode = 200;
	res.setHeader('Content-Type', 'text/html');
	res.end(`Think ${name}, Think !\nPWD: ${process.env['PWD']}`);
});

const port = process.env['PORT'] || 8080;
httpServer.listen(port, () => {
	console.log(`Server running at http://localhost:${port}/`);
});

export const io = new IOServer(httpServer, { cors: { origin: true } });
io.on('connection', socket => {
	console.log(`Nouvelle connexion du client ${socket.id}`);
    socket.on('disconnect', () => {
		console.log(`Déconnexion du client ${socket.id}`);
	});
    socket.on("startPlaying", () => {
        startPlaying();
    });
    socket.on("stopPlaying", () => {
        stopPlaying();
    })
});