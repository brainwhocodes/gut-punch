import type { Config } from 'drizzle-kit';

export default {
  schema: './src/db/schema.ts', // Your main schema file
  out: './test/migrations', // Test-specific migrations output directory
  dialect: 'sqlite',
  dbCredentials: {
    url: './test/gut-punch-test.sqlite', // The specific test database file
  },
  verbose: true,
} satisfies Config;
