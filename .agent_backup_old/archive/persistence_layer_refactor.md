# Persistence Layer Refactor Plan: "Unified Storage Adapter"

## Context

As identified in the Phase 4 Deep Dive, the ecosystem currently suffers from "Divergent Logic" where the Master App (SQLite), Touch App (IndexedDB/SQLite), and Cloud (PocketBase) use three completely different data access patterns. This duplicates logic and prevents code sharing.

## Objective

Create a unified `IStorageAdapter` interface that abstracts the underlying storage mechanism, allowing business logic to write to a single interface regardless of the platform.

## Proposed Interface (Draft)

```typescript
interface IStorageAdapter {
  // CRUD
  get<T>(collection: string, id: string): Promise<T | null>;
  list<T>(collection: string, filter?: FilterQuery): Promise<T[]>;
  create<T>(collection: string, data: T): Promise<T>;
  update<T>(collection: string, id: string, data: Partial<T>): Promise<T>;
  delete(collection: string, id: string): Promise<void>;

  // Transaction support
  transaction<T>(work: (trx: IAnalyticsTransaction) => Promise<T>): Promise<T>;
}
```

## Implementation Strategy (Phase 4)

1. **Define the Interface**: Create `shared/types/storage.ts`.
2. **Implement SQLite Adapter**: Wrapper around `better-sqlite3` for Master.
3. **Implement Cloud Adapter**: Wrapper around `pocketbase/sdk` for Cloud Sync logic.
4. **Refactor Services**: Update `UserService`, `AlbumService` to use `IStorageAdapter` instead of direct DB calls.

## Benefits

- **Testability**: Easy to mock `IStorageAdapter` for unit tests.
- **Portability**: Code can move between Master and Cloud with minimal changes.
- **Maintainability**: One place to fix query optimizations or caching logic.
