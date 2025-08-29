
/* Get the Database Instance */
import { MongoClient } from 'mongodb';


const uri = process.env.MONGODB_URI || 'mongodb://localhost:27017';
const dbName = process.env.MONGODB_DATABASE || 'ai_narration';
let client: MongoClient;
let db: any;

export class DatabaseService {
    static instance: DatabaseService;
    private constructor() {}

    static getInstance() {
        if (!DatabaseService.instance) {
            DatabaseService.instance = new DatabaseService();
        }
        return DatabaseService.instance;
    }

    async connect() {
        if (!client) {
            client = new MongoClient(uri);
            await client.connect();
            db = client.db(dbName);
            console.log('Connected to MongoDB');
        }
        return db;
    }

    async getCollection(collectionName: string) {
        if (!db) {
            await this.connect();
        }
        return db.collection(collectionName);
    }

    async close() {
        if (client) {
            await client.close();
            client = null as any;
            db = null;
            console.log('Disconnected from MongoDB');
        }
    }
}




