import dotenv from "dotenv";
dotenv.config();

import express from "express";
import crictossRoute from "./routes/crictossroute.js";

const app = express();

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
 

app.use("/api/v1/crictoss", crictossRoute);

const PORT = process.env.PORT || 8080;
 
app.listen(PORT, "0.0.0.0", () => {
     console.log('API running on port 3000');
});