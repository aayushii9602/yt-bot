import express from "express";
import dotenv from "dotenv";
import botRoutes from "./src/routes/botRoutes.js"

// Load environment variables from a .env file
dotenv.config();

// Create an instance of the Express application
const app = express();

// regular middlewares
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// router middleware
app.use("/api/v1", botRoutes);

export default app;
