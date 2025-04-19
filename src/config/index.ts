/**
 * Loads and validates YAML configuration for Gut Punch.
 */
import { readFileSync } from "fs";
import YAML from "yaml";

/**
 * Gut Punch config shape.
 */
export interface GutPunchConfig {
  database: { file: string };
  queues: Record<string, { priority: number }>;
  jobsDirectory: string;
}

/**
 * Load config from YAML file.
 */
export function loadConfig(path: string = "config.yaml"): GutPunchConfig {
  const file = readFileSync(path, "utf8");
  const config = YAML.parse(file) as GutPunchConfig;
  // TODO: Add validation
  return config;
}
