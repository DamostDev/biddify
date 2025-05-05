import express from "express";
import cors from "cors";
import sequelize from "./lib/connectPG.js";
import authRoutes from "./routes/auth.route.js";
import dotenv from "dotenv";
import cookieParser from 'cookie-parser';



dotenv.config(); 



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

app.use("/api/auth",authRoutes);




app.listen(5005, () => {
    console.log("server is running on port 5005");
    sequelize.authenticate()
      
});
