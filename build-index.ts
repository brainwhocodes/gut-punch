/**
 * Simple build script to create index.mjs from index.ts
 */
import { resolve } from 'path';
import { writeFileSync } from 'fs';

// Bun types
declare global {
  const Bun: {
    build: (options: {
      entrypoints: string[];
      outdir?: string;
      target: string;
      format: string;
      minify: boolean;
    }) => Promise<{
      outputs: Array<{
        path: string;
        text: () => Promise<string>;
      }>;
    }>;
  };
}

async function buildIndex() {
  console.log('Building index.mjs...');
  
  try {
    const result = await Bun.build({
      entrypoints: [resolve(process.cwd(), 'index.ts')],
      target: 'node',
      format: 'esm',
      minify: false,
    });
    
    // Get the output content
    const output = result.outputs[0];
    const content = await output.text();
    
    // Write to index.mjs in the root directory
    writeFileSync(resolve(process.cwd(), 'index.mjs'), content);
    console.log('Successfully built index.mjs in the root directory');
  } catch (error) {
    console.error('Error building index.mjs:', error);
  }
}

buildIndex();
