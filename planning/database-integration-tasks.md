# Database Integration Tasks

This document outlines the specific tasks needed to make GutPunch work with external SQLite databases.

## Requirements

- Support connecting to an existing SQLite database in a host project
- Ensure schema compatibility and validation
- Prevent conflicts between GutPunch tables and existing tables
- Provide a migration path for existing data

## Tasks

### 9. Database Adapter Refactoring

- [ ] Create a `DatabaseAdapter` interface
  - Define required methods for job scheduling operations
  - Support both integrated and external database modes
  - Add proper TypeScript typing for all operations

- [ ] Refactor `JobDb` class to implement the interface
  - Move SQLite-specific code to a dedicated implementation
  - Add connection string support for external databases
  - Implement table name prefixing to avoid collisions

- [ ] Create a database connection factory
  - Add connection pooling for better performance
  - Support multiple database connection modes
  - Add robust error handling and reconnection logic

### 10. Schema Management

- [ ] Create a schema versioning system
  - Store GutPunch schema version in the database
  - Support automatic schema upgrades
  - Add schema validation on startup

- [ ] Implement table prefixing mechanism
  - Allow configurable table prefixes (e.g., `gutpunch_job_runs`)
  - Update all queries to use prefixed table names
  - Add migration utility for existing installations

- [ ] Add schema compatibility checks
  - Verify SQLite version compatibility
  - Check for required SQLite extensions
  - Validate table structure before operations

### 11. Migration Utilities

- [ ] Create database migration command
  - Add support for migrating from standalone to integrated mode
  - Create schema-only migration option
  - Implement data migration between databases

- [ ] Add database verification command
  - Check for required tables and schema
  - Validate index performance
  - Report potential issues and optimization opportunities

### 12. Documentation

- [ ] Update database documentation
  - Document external database connection options
  - Provide examples for different integration scenarios
  - Create a database migration guide

## Completion Criteria

- External database connections fully supported
- No table name conflicts in integrated mode
- Schema versioning and migrations working correctly
- Performance optimized with proper indexing
- All operations properly typed with TypeScript
- Unit tests cover all database integration scenarios
