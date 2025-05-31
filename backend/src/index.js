import express from "express";
import cors from "cors";
import sequelize from "./lib/connectPG.js";
import authRoutes from "./routes/auth.route.js";
import dotenv from "dotenv";
import cookieParser from 'cookie-parser';
import path from 'path'; // Needed for serving static files
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
    // Set origin to your specific frontend URL
    origin: process.env.CLIENT_URL || 'http://localhost:5173', // <-- Use the correct frontend port
    credentials: true, // <-- Crucial: Allow cookies/headers to be sent/received
    // Optional: Add methods/headers if needed beyond defaults
    // methods: "GET,HEAD,PUT,PATCH,POST,DELETE",
    // allowedHeaders: "Content-Type,Authorization",
}));

app.use(express.json());
app.use(express.urlencoded({ extended: false }));


app.use(cookieParser());

const publicUploadsPath = path.join(__dirname, '..', 'public/uploads'); // Go UP one level from src
app.use('/uploads', express.static(publicUploadsPath));

app.use("/api/auth",authRoutes);
app.use('/api/categories', categoryRoutes); 
app.use('/api/products', productRoutes);
app.use('/api/streams', streamRoutes);
app.use('/api/auctions', auctionRoutes); 
app.use('/api/bids', bidRoutes); 
app.use('/api/orders', orderRoutes);        
app.use('/api/users', userRoutes);
app.use('/api/streams', streamRoutes);   


app.listen(5005, () => {
    console.log("server is running on port 5005");
    sequelize.authenticate()
      
});
