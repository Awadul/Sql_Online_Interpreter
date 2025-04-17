import express from "express";
import cors from "cors";
// import dotenv from "dotenv";
import supabase from "./services/supabase-client.js";
import { validateQuery , executeQuery, getSchema } from "./utils/supabase-request-handler.js";
// dotenv.config();

const app = express();

app.use(cors());
app.use(express.json());

app.get("/ping" , (req , res) => {
    res.send("Pong");
})

app.listen(8080 , () => {
    console.log("Server is running on port 3000");
})

app.post("/validate-query" , async (req , res) => {

    try {
        const { query } = req.body;
        const result = await validateQuery(query);
        res.json(result);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
})

app.post("/api/query/execute" , async (req , res) => {
    try {
        const { query } = req.body;
        const result = await executeQuery(query);
        res.json(result);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
})

app.get("/api/query/schema" , async (req , res) => {
    const schema = await getSchema();
    // console.log("schema data" , schema);
    if (schema.error) {
        res.status(500).json({ error: schema.error });
    } else {
        res.status(200).json(schema);
    }
})

app.get("/api/connection/test" , async (req , res) => {
    try {
        return res.status(200).json({ message: "Connection successful" });
    } catch (error) {
        return res.status(500).json({ error: "Connection failed" });
    }
})  