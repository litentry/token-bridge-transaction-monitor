import * as dotenv from "dotenv";
dotenv.config();

import express, { Express, Request, Response } from "express";
import { register as Register } from "./prom";
import { totalSupply } from "./circulation";

const app: Express = express();
const PORT = process.env.PORT;

app.get("/metrics", async (req, res) => {
  try {
    res.set("Content-Type", Register.contentType);
    const body = await Register.metrics();
    return res.end(body);
  } catch (err) {
    res.status(500).end(err);
  }
});
app.get("/token-info", async (req, res) => {
  try {
    const info = await totalSupply();
    console.log("info: ", info);
    return res.send(info);
  } catch (err) {
    res.status(500).end(err);
  }
});

app.listen(PORT, () => {
  console.log(`Server is running at ::${PORT}`);
});
