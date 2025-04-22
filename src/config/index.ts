/**
 * Loads and validates YAML configuration for Gut Punch.
 */
import { readFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";
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
export function loadConfig(configPath: string): GutPunchConfig {
  const absolutePath: string = resolve(configPath);
  console.log(`[Config] Attempting to load config from: ${absolutePath}`);

  if (!existsSync(absolutePath)) {
    const errorMsg = `[Config] YAML config file not found: ${absolutePath}`;
    console.error(errorMsg);
    throw new Error(errorMsg); // <-- Throw error
  }

  try {
    const fileContents: string = readFileSync(absolutePath, 'utf8');
    const config: GutPunchConfig = YAML.parse(fileContents) as GutPunchConfig;
    // TODO: Add validation logic for the config object structure here
    if (!config || typeof config !== 'object') {
      throw new Error('Invalid config format: Root should be an object.');
    }
    if (!config.jobsDirectory || typeof config.jobsDirectory !== 'string') {
      throw new Error('Invalid config format: jobsDirectory is missing or not a string.');
    }
    // Add more checks as needed...
    console.log(`[Config] Successfully loaded and validated config:`, config);
    return config;
  } catch (error: any) { // Catch YAML parsing errors or validation errors
    const errorMsg = `[Config] Error loading, parsing, or validating YAML config file ${absolutePath}: ${error.message}`;
    console.error(errorMsg, error);
    throw new Error(errorMsg); // <-- Re-throw error
  }
}
