import { config } from "dotenv";

config();

export const env = {
  port: Number(process.env.PORT || 5000),
  frontendUrl: process.env.FRONTEND_URL || "http://localhost:5173",
};
