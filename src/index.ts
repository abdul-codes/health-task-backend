import express, { Request, Response } from 'express'
import cors from 'cors'
import "dotenv/config"
import compression from "compression"
import authRoutes from "./routes/authRoutes"
import userRoutes from "./routes/userRoutes"
import patientRoutes from "./routes/patientRoutes"
import taskRoutes from "./routes/taskRoutes"
import limiter from './middleware/rateLimitMiddleware'
import { initSocket } from './utils/socket'
import http from "http"

const app = express()
const server = http.createServer(app)
const io = initSocket(server)

app.use(compression())
app.use(express.json())
app.use(express.urlencoded({extended: true}))
app.use(cors())
app.use(limiter)


app.use('/auth', authRoutes)
app.use('/users', userRoutes)
app.use('/patients', patientRoutes)
app.use('/tasks', taskRoutes)

//To use it only for a certain path (e.g., limit only calls to the /auth/* endpoints), 
// specify the url as the first parameter in app.use
// app.use('/auth', limiter)

app.get("/api/test", async(req: Request, res: Response) => {
    res.json({messsage: "hello and welcome back"})
})

// --- Socket.IO Connection Logic ---
io.on('connection', (socket) => {
  console.log('A user connected:', socket.id);

  // This logic allows a user to join a "room" based on their userId
  // so you can send them targeted notifications.
  socket.on('joinRoom', (userId) => {
    socket.join(userId);
    console.log(`User ${socket.id} joined room ${userId}`);
  });

  socket.on('disconnect', () => {
    console.log('User disconnected:', socket.id);
  });
});

const PORT = process.env.PORT || 8000
app.listen(PORT, () => {
    console.log("Server running on localhost:8000");
    
})