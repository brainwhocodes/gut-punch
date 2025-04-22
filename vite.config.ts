import { defineConfig, type UserConfigExport } from 'vite';
import { resolve, basename } from 'path';
import { globSync } from 'glob';

// Find all .ts files in the src/jobs directory for job entries
const jobFiles = globSync('src/jobs/**/*.ts').reduce((acc, file) => {
  const key = `jobs/${basename(file, '.ts')}`; // Prefix with 'jobs/' for output structure
  acc[key] = resolve(__dirname, file);
  return acc;
}, {} as Record<string, string>);

// CLI entry
const cliEntry = {
  'cli': resolve(__dirname, 'src/cli.ts')
};

// Combined entries
const allEntries = { ...jobFiles, ...cliEntry };

const config: UserConfigExport = defineConfig({
  build: {
    outDir: 'dist',
    emptyOutDir: true, // Let this single build manage the dist directory
    sourcemap: true,
    target: 'node18', // Target Node.js environment for both
    // We can't use build.lib directly for multiple entry types easily. Use rollupOptions.
    rollupOptions: {
      input: allEntries,
      output: [
        // Output for Jobs (CJS)
        {
          dir: 'dist',
          format: 'cjs',
          entryFileNames: (chunkInfo) => {
            // Place jobs in dist/jobs/, keep CLI at dist/cli.cjs
            return chunkInfo.name.startsWith('jobs/') ? `[name].cjs` : `[name].cjs`;
          },
          chunkFileNames: 'chunks/[name]-[hash].cjs', // How shared chunks are named
          exports: 'auto',
        },
        // If you needed an ES module output for jobs/cli as well, add another output object here
      ],
      // Externalize dependencies that shouldn't be bundled
      external: [
        /^node:.*/, // Node built-in modules (handles fs, path, url, etc.)
        'better-sqlite3',
        'drizzle-orm',
        'sqlite3',
        'yaml',
        'commander',
      ],
      treeshake: {
        moduleSideEffects: (id, external) => {
          // Mark all files within src/jobs/ as having side effects
          // to prevent them from being tree-shaken away.
          return id.includes('/src/jobs/');
        },
      },
      preserveEntrySignatures: 'strict',
    },
    minify: false, // Keep builds readable for debugging
  },
  // If jobs or CLI import CSS or other assets, configure plugins here
  // plugins: [],
});

export default config;
