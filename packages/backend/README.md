# TTS Backend

A scalable, enterprise-grade Text-to-Speech service built with Express, TypeScript, and modern architectural patterns.

## Features
- Dependency Injection (DI) with custom container
- Event-driven architecture with EventEmitter
- DTO validation using `class-validator`
- Prometheus metrics for performance monitoring
- Comprehensive logging with Winston
- Unit and integration tests with Jest
- Dockerized deployment with health checks

## Architecture
- **Layered Design**: API -> Service -> Utils
- **Modular Routes**: Easily extensible RESTful endpoints
- **Error Handling**: Centralized with custom exceptions

## Setup
1. `npm install`
2. `cp .env.example .env` and configure
3. `npm run dev` for development
4. `npm run build && npm start` for production

## Docker
```bash
docker build -t tts-backend .
docker run -p 3000:3000 -v $(pwd)/logs:/app/logs tts-backend