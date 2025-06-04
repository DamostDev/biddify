import express from "express";
import cors from "cors";
import sequelize from "./lib/connectPG.js"; // Your main sequelize instance
import { syncDatabase } from "./models/index.js"; // Import syncDatabase
import authRoutes from "./routes/auth.route.js";
import dotenv from "dotenv";
import cookieParser from 'cookie-parser';
import path from 'path';
import { fileURLToPath } from 'url'; 

import categoryRoutes from './routes/category.route.js'; 
import productRoutes from './routes/product.route.js'; 
import auctionRoutes from './routes/auction.route.js'; 
import bidRoutes from './routes/bid.route.js';
import orderRoutes from './routes/order.route.js';     
import userRoutes from './routes/user.route.js';
import streamRoutes from './routes/stream.route.js';

dotenv.config(); 

const __filename = fileURLToPath(import.meta.url); 
const __dirname = path.dirname(__filename); 

const app = express();
app.use(cors({
    origin: process.env.CLIENT_URL || 'http://localhost:5173', 
    credentials: true, 
}));

app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());

const publicUploadsPath = path.join(__dirname, '..', 'public/uploads');
app.use('/uploads', express.static(publicUploadsPath));

app.use("/api/auth",authRoutes);
app.use('/api/categories', categoryRoutes); 
app.use('/api/products', productRoutes);
app.use('/api/streams', streamRoutes); // Ensure this is correct, seems duplicated below
app.use('/api/auctions', auctionRoutes); 
app.use('/api/bids', bidRoutes); 
app.use('/api/orders', orderRoutes);        
app.use('/api/users', userRoutes);
// app.use('/api/streams', streamRoutes);   // This is a duplicate, remove one


const startServer = async () => {
  try {
    // Authenticate with the database
    await sequelize.authenticate();
    console.log('✅ PostgreSQL connection established via sequelize.authenticate()');

    // Sync database schema
    await syncDatabase(); // Call the sync function from models/index.js
    console.log('✅ Database schema synchronized.');

    app.listen(5005, () => {
        console.log("🚀 Server is running on port 5005");
    });
  } catch (error) {
    console.error('❌ Failed to start server:', error);
    process.exit(1); // Exit if cannot connect to DB or sync
  }
};

startServer();