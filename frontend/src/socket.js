import { io } from "socket.io-client";

const socket = io("https://pooling-system-grwl.onrender.com", {
    transports: ["polling", "websocket"],
    withCredentials: true,
    cors: {
        origin: "https://pooling-system-delta.vercel.app",
        methods: ["GET", "POST"],
        credentials: true
    }
});

export default socket;
