
/* Get the Database Instance */
import { Collection, MongoClient, Db } from 'mongodb';





export class DatabaseService {
    private static instance: DatabaseService
    private client: MongoClient | null = null
    private db: Db | null = null
    private isConnected = false

    private constructor() {}

    static getInstance() {
        if (!DatabaseService.instance) {
            DatabaseService.instance = new DatabaseService();
        }
        return DatabaseService.instance;
    }

    public async connect(): Promise<void> {
        if (this.isConnected && this.client) {
            console.log('✅ Already connected to MongoDB')
            return
        }

        try {
            const uri = process.env.MONGODB_URI || 'mongodb://localhost:27017'
            const dbName = process.env.MONGODB_DATABASE || 'ai_narration'

            console.log(`Attempting to connect to MongoDB...`)
            console.log(`Database: ${dbName}`)
            
            this.client = new MongoClient(uri, {
                serverSelectionTimeoutMS: 10000, // 10 second timeout
                connectTimeoutMS: 10000,
                socketTimeoutMS: 10000,
                maxPoolSize: 10,
                retryWrites: true,
                w: 'majority'
            })

            await this.client.connect()
            
            // Test the connection
            await this.client.db('admin').command({ ping: 1 })
            
            this.db = this.client.db(dbName)
            this.isConnected = true

            console.log(`Successfully connected to MongoDB database: ${dbName}`)
        } catch (error) {
            console.error('MongoDB connection failed:', error)
            
            // More specific error messages
            if (error instanceof Error) {
            if (error.message.includes('ECONNREFUSED')) {
                console.log('Connection refused - check if MongoDB is running')
            } else if (error.message.includes('authentication failed')) {
                console.log('Authentication failed - check your username/password')
            } else if (error.message.includes('serverSelectionTimeoutMS')) {
                console.log('Server selection timeout - check your connection string and network')
            }
            }
            
            this.isConnected = false
            throw error
        }
    }


    public async getCollection(name: string): Promise<Collection> {
        if (!this.isConnected || !this.db) {
            console.log(`Database not connected, attempting to connect...`)
            await this.connect()
        }

        if (!this.db) {
            throw new Error('Database not connected and connection failed')
        }

        return this.db.collection(name)
    }

    public async disconnect(): Promise<void> {
        if (this.client) {
            await this.client.close()
            this.isConnected = false
            this.client = null
            this.db = null
            console.log('Disconnected from MongoDB')
        }
    }

    public isReady(): boolean {
        return this.isConnected
    }

    public async testConnection(): Promise<boolean> {
        try {
            if (!this.client) {
            await this.connect()
            }
            await this.client?.db('admin').command({ ping: 1 })
            return true
        } catch (error) {
            console.error('Connection test failed:', error)
            return false
        }
    }
}




