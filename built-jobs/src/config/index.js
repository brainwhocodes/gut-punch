"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.loadConfig = loadConfig;
/**
 * Loads and validates YAML configuration for Gut Punch.
 */
const fs_1 = require("fs");
const yaml_1 = __importDefault(require("yaml"));
/**
 * Load config from YAML file.
 */
function loadConfig(path = "config.yaml") {
    const file = (0, fs_1.readFileSync)(path, "utf8");
    const config = yaml_1.default.parse(file);
    // TODO: Add validation
    return config;
}
//# sourceMappingURL=index.js.map