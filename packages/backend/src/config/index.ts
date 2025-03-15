import dotenv from "dotenv";

dotenv.config();

export const config = {
  port: parseInt(process.env.PORT || "3000", 10),
  modelApiUrl: process.env.MODEL_API_URL || "https://api.example.com",
};