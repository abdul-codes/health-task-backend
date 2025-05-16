import express, { Request, Response } from 'express'
import cors from 'cors'
import "dotenv/config"
import compression from "compression"
import authRoutes from "./routes/authRoutes"
import userRoutes from "./routes/userRoutes"
import patientRoutes from "./routes/patientRoutes"
import taskRoutes from "./routes/taskRoutes"

import limiter from './middleware/rateLimitMiddleware'

const app = express()

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

const PORT = process.env.PORT || 8000
app.listen(PORT, () => {
    console.log("Server running on localhost:8000");
    
})