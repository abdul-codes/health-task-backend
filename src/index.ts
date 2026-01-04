import express, { Request, Response, NextFunction } from "express";
import cors from "cors";
import "dotenv/config";
import compression from "compression";
import authRoutes from "./routes/authRoutes";
import userRoutes from "./routes/userRoutes";
import patientRoutes from "./routes/patientRoutes";
import taskRoutes from "./routes/taskRoutes";
import notificationRoutes from "./routes/notificationRoutes";
import limiter from "./middleware/rateLimitMiddleware";
import { errorHandler } from "./middleware/errorHandler";

const app = express();
app.use(compression());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cors());

// app.use(cors({
//   origin: ['https://yourapp.com', 'https://admin.yourapp.com'],
//   credentials: true
// }));

app.use(limiter);

app.use("/api/auth", authRoutes);
app.use("/api/users", userRoutes);
app.use("/api/patients", patientRoutes);
app.use("/api/tasks", taskRoutes);
app.use("/api/notifications", notificationRoutes);

//To use it only for a certain path (e.g., limit only calls to the /auth/* endpoints),
// specify the url as the first parameter in app.use
// app.use('/auth', limiter)

app.get("/api/test", async (req: Request, res: Response) => {
  res.json({ messsage: "hello and welcome back" });
});

const PORT = process.env.PORT || 8000;
app.listen(PORT, () => {
  console.log("Server running on localhost:" + PORT);
});

// Error handling middleware
app.use(errorHandler);

module.exports = app;