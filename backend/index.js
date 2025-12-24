import express from "express";
import http from "http";
import cors from "cors";
import { Server } from "socket.io";
import dotenv from "dotenv";
import socketHandler from "./socket.js";
import connectDB from "./config/db.js";
import pollRoutes from "./routes/pollRoutes.js";

dotenv.config();

const app = express();
const server = http.createServer(app);

app.use(cors({
    origin: ["https://pooling-system-delta.vercel.app", "http://localhost:3000", "http://localhost:4173"],
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"]
}));

app.use(express.json());

const io = new Server(server, {
    cors: {
        origin: ["https://pooling-system-delta.vercel.app", "http://localhost:3000", "http://localhost:4173"],
        methods: ["GET", "POST"],
        credentials: true,
        allowedHeaders: ["Content-Type", "Authorization"]
    },
    transports: ["polling", "websocket"]
});

connectDB();

io.on("connection", (socket) => {
    console.log("New socket connected with id:", socket.id);
    socketHandler(socket, io);
});

app.use("/api/polls", pollRoutes);

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
    console.log(`Backend server started successfully at http://localhost:${PORT}`);
});
