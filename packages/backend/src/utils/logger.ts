import winston from "winston";

export const logger = winston.createLogger({
  level: process.env.DEBUG ? "debug" : "info",
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
  transports: [
    new winston.transports.File({ filename: "logs/error.log", level: "error" }),
    new winston.transports.File({ filename: "logs/combined.log" }),
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(), // 控制台彩色输出
        winston.format.simple()
      )
    }),
  ],
});
