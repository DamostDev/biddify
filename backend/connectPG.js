import "dotenv/config" 
import pg from "pg"

const { Pool } = pg

const connection = process.env.NEONCONNECT

export const pool = new Pool({
    connectionString: connection, 
    max: 50, 
    idleTimeoutMillis: 30000, 
})