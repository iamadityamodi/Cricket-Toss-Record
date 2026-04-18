import express from "express";
import crictossRoute from "./routes/crictossroute.js";


const app = express();

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Routes
app.use("/api/v1/crictoss", crictossRoute);

const PORT = process.env.PORT || 8080;

app.listen(PORT, () => {
  console.log("Server running on port", PORT);
});

app.listen(3000, () => {
  console.log("Server running");
});