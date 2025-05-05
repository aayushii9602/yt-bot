import express from "express";
import queryBot from "../controller/botController.js";

const router = express.Router();
const PORT = process.env.PORT;
router.route("/botquery").post(queryBot);

export default router;
