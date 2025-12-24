import { io } from "socket.io-client";

const socket = io("http://localhost:5001", {
    transports: ["polling", "websocket"],
    withCredentials: true,
    cors: {
        origin: "http://localhost:5173",
        methods: ["GET", "POST"],
        credentials: true
    }
});

export default socket;
