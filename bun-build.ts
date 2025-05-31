/**
 * Bun-specific build script for Gut-Punch
 */
import { resolve, basename } from 'path';
import { globSync } from 'glob';
import { mkdir, writeFile } from 'fs/promises';

// Bun types
declare global {
  const Bun: {
    file: (path: string) => {
      text: () => Promise<string>;
    };
    build: (options: {
      entrypoints: string[];
      outdir: string;
      target: string;
      format: string;
      sourcemap: string | boolean;
      minify: boolean;
      external: string[];
    }) => Promise<any>;
  };
}

// Find all .ts files in the src/jobs directory for job entries
const jobFiles = globSync('src/jobs/**/*.ts').reduce((acc, file) => {
  const key = `jobs/${basename(file, '.ts')}`; // Prefix with 'jobs/' for output structure
  acc[key] = resolve(process.cwd(), file);
  return acc;
}, {} as Record<string, string>);

// CLI entry
const cliEntry = {
  'cli': resolve(process.cwd(), 'src/cli.ts')
};

// Combined entries
const allEntries = { ...jobFiles, ...cliEntry };

// Ensure dist directory exists
await mkdir('dist', { recursive: true });

// Build each entry point
for (const [name, entryPath] of Object.entries(allEntries)) {
  console.log(`Building ${name} from ${entryPath}...`);
  
  try {
    const result = await Bun.build({
      entrypoints: [entryPath],
      outdir: 'dist',
      target: 'bun',
      format: 'cjs',
      sourcemap: 'external',
      minify: false,
      external: [
        'better-sqlite3',
        'drizzle-orm',
        'sqlite3',
        'yaml',
        'commander',
      ],
    });
    
    console.log(`Successfully built ${name}`);
    
    // For CLI, make it executable
    if (name === 'cli') {
      const outputPath = resolve(process.cwd(), 'dist', `${name}.js`);
      const fileContent = await Bun.file(outputPath).text();
      await writeFile(outputPath, `#!/usr/bin/env bun\n${fileContent}`, { mode: 0o755 });
      console.log(`Made ${name} executable`);
    }
  } catch (error) {
    console.error(`Error building ${name}:`, error);
  }
}

console.log('Build completed');
