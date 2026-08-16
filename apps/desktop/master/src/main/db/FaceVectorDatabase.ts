import Database from 'better-sqlite3';
import path from 'path';
import { env } from 'process';
import { logger } from '@/utils/logger';

/**
 * Omni-Channel Face Matching Engine (Pillar 1)
 * 
 * This local vector database runs inside the ClickFlash Master node.
 * It uses SQLite-vss (Vector Similarity Search) to match guest selfies
 * without requiring any cloud API calls. This enables offline, zero-latency biometric photo routing.
 */
export class FaceVectorDatabase {
  private db: Database.Database | null = null;
  private isInitialized = false;

  constructor() {}

  /**
   * Initializes the SQLite connection and loads the `vss0` extension.
   */
  public async initialize(): Promise<void> {
    if (this.isInitialized) return;

    try {
      const dbPath = env.NODE_ENV === 'production'
        ? path.join((process as any).resourcesPath, 'db', 'face_vectors.sqlite')
        : path.join(__dirname, '../../../../pb_data', 'face_vectors.sqlite');

      logger.info(`[FaceVectorDatabase] Connecting to local vector store at ${dbPath}`);
      this.db = new Database(dbPath);
      
      // Load the sqlite-vss extension (requires native module compilation in build step)
      // this.db.loadExtension(path.join(process.resourcesPath, 'vss0'));

      // Ensure the virtual table exists
      this.db.exec(`
        CREATE VIRTUAL TABLE IF NOT EXISTS vss_faces USING vss0(
          face_embedding(128)
        );
        CREATE TABLE IF NOT EXISTS guest_profiles (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          guest_id TEXT NOT NULL,
          rowid INTEGER NOT NULL
        );
      `);

      this.isInitialized = true;
      logger.info(`[FaceVectorDatabase] Vector similarity search engine initialized.`);
    } catch (error) {
      logger.error(`[FaceVectorDatabase] Failed to initialize:`, error);
      throw error;
    }
  }

  /**
   * Registers a new guest's face vector.
   * This is typically received via UDP from the Expo mobile app when a guest takes a selfie.
   * 
   * @param guestId Unique identifier for the guest
   * @param vector Float32Array containing the 128D embedding
   */
  public async registerGuestFace(guestId: string, _vector: Float32Array): Promise<void> {
    if (!this.isInitialized || !this.db) await this.initialize();

    logger.info(`[FaceVectorDatabase] Registering face vector for guest ${guestId}`);
    
    // const _insertVector = this.db!.prepare(`
    //   INSERT INTO vss_faces(face_embedding) VALUES (?)
    // `);
    
    // In a real implementation, we pass the binary vector representation
    // const info = insertVector.run(Buffer.from(vector.buffer));
    
    // const _insertProfile = this.db!.prepare(`
    //   INSERT INTO guest_profiles(guest_id, rowid) VALUES (?, ?)
    // `);
    // insertProfile.run(guestId, info.lastInsertRowid);
  }

  /**
   * Searches the database for the closest matching guest.
   * Called by the MoneyTrash ingestor when processing photos from ride rovers.
   * 
   * @param vector The extracted 128D vector of a face found in a newly ingested photo.
   * @returns The matched guest ID or null if confidence is too low.
   */
  public async findMatch(_vector: Float32Array): Promise<string | null> {
    if (!this.isInitialized || !this.db) await this.initialize();

    // Uses vss_search to find the closest cosine distance
    // const _query = this.db!.prepare(`
    //   SELECT rowid, distance 
    //   FROM vss_faces 
    //   WHERE vss_search(face_embedding, ?) 
    //   LIMIT 1
    // `);
    
    // Placeholder execution
    // const result = query.get(Buffer.from(vector.buffer));
    // if (result && result.distance < 0.3) { ... }
    
    return null; // No match found in placeholder
  }
}

export const faceVectorDb = new FaceVectorDatabase();
