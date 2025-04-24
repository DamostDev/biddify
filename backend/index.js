import express from "express";
import cors from "cors";
import { pool } from "./connectPG.js";



const app = express();

app.use(express.json())
app.use(cors())

app.get('/', async (req, res) => {
    let client;
    try {
        client = await pool.connect();
        const result = await client.query('SELECT * FROM users');
        res.status(200).json(result.rows);
    } catch (error) {
        console.error('Error fetching users:', error);
        res.status(500).json({ error: 'Internal server error' });
    } finally {
        if (client) client.release(); // Always release the client back to the pool
    }
});


app.listen(5005, () => {
    console.log("server is running on port 5001");
});
