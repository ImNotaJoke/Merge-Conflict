import { io } from "socket.io-client";

// L'URL se base sur l'environnement. En production, il se connecte au nom de domaine de l'API.
// En développement, il utilise l'URL locale du serveur Node.js.
const URL = import.meta.env.PROD ? 'https://api.sulivaportefolio.live' : 'http://localhost:8080';

export const socket = io(URL, {
    autoConnect: false
});