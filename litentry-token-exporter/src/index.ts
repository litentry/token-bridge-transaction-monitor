import * as dotenv from "dotenv";
dotenv.config();

import express, { Express, Request, Response } from "express";
// import axios from "axios";
// ;import {
//   getBigTransactionQuery,
//   queryDailyReportJob,
//   queryWeeklyReportJob,
//   queryMonthlyReportJob,
//   queryBigTransactionJob,
// } from "./query";
// import * as PromClient from "prom-client";
import { register as Register } from "./prom";
const app: Express = express();
const PORT = process.env.PORT;

// queryDailyReportJob();
// queryBigTransactionJob();

// const collectDefaultMetrics = PromClient.collectDefaultMetrics;
// const Registry = PromClient.Registry;
// const register = new Registry();

// const g = new PromClient.Gauge({
//   name: "lit_report",
//   help: "Report about transactions",
//   labelNames: ["amount", "volume"],
//   registers: [register],
//   async collect() {
//     this.set({ amount: "daily" }, 100);
//     this.set({ amount: "weekly" }, 100);
//     this.set({ amount: "monthly" }, 100);
//     this.set({ volume: "daily" }, 100);
//     this.set({ volume: "weekly" }, 100);
//     this.set({ volume: "monthly" }, 100);
//   },
// });

app.get("/metrics", async (req, res) => {
  try {
    res.set("Content-Type", Register.contentType);
    const body = await Register.metrics();
    // console.log("body: ", body);
    return res.end(body);
  } catch (err) {
    res.status(500).end(err);
  }
});

app.listen(PORT, () => {
  console.log(`Server is running at ::${PORT}`);
});
