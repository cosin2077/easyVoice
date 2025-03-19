"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.asyncSleep = void 0;
const asyncSleep = (delay = 200) => new Promise((resolve) => setTimeout(resolve, delay));
exports.asyncSleep = asyncSleep;
