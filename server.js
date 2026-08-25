import express from "express";
import crictossRoute from "./routes/crictossroute.js";

const app = express();

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
 

app.use("/api/v1/crictoss", crictossRoute);

const PORT = process.env.PORT || 8080;

console.log("SERVER STARTED:", new Date());

app.listen(PORT,() => {
    console.log(`Server running on port ${PORT}`);
});
app.get("/test", (req, res) => {
    res.send("");
});