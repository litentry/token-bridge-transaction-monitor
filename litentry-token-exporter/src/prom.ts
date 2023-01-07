import BigNumber from "bignumber.js";
import * as PromClient from "prom-client";
import fs from "fs";

import {
  getDailyTransactionQuery,
  getWeeklyTransactionQuery,
  getMonthlyTransactionQuery,
  getTransactionValueGreaterThanQuery,
  query,
} from "./query";
import type { Transfer } from "./query";
const collectDefaultMetrics = PromClient.collectDefaultMetrics;
const Registry = PromClient.Registry;
export const register = new Registry();

const CACHE = {
  daily: {
    volume: 0,
    amount: 0,
    lastTick: 0,
  },
  weekly: {
    volume: 0,
    amount: 0,
    lastTick: 0,
  },
  monthly: {
    volume: 0,
    amount: 0,
    lastTick: 0,
  },
};

async function reportHelper(
  qFunc: () => string,
  reportType: "daily" | "weekly" | "monthly",
  interval: string
) {
  if (
    CACHE[reportType]["lastTick"] === 0 ||
    Date.now() - CACHE[reportType]["lastTick"] >= parseInt(interval) * 1000
  ) {
    const data = await query(qFunc());
    const amount = data?.transfers.length;
    const volume = data?.transfers.reduce((acc: number, transfer: Transfer) => {
      const value = new BigNumber(transfer.value)
        .dividedBy(new BigNumber(1e18))
        .toNumber();
      return acc + value;
    }, 0);
    CACHE[reportType]["amount"] = amount;
    CACHE[reportType]["volume"] = volume;
    CACHE[reportType]["lastTick"] = Date.now();
    console.log(
      `[${reportType}] Fetch from thegraph: volume: ${CACHE[reportType]["volume"]}, amount: ${CACHE[reportType]["amount"]}`
    );

    return { amount, volume };
  }
  console.log(
    `[${reportType}] Fetch from cache: volume: ${CACHE[reportType]["volume"]}, amount: ${CACHE[reportType]["amount"]}`
  );
  return {
    amount: CACHE[reportType]["amount"],
    volume: CACHE[reportType]["volume"],
  };
}

new PromClient.Gauge({
  name: "lit_report",
  help: "Report about transactions",
  labelNames: ["amount", "volume"],
  registers: [register],
  async collect() {
    reportHelper(
      getDailyTransactionQuery,
      "daily",
      process.env.DAILY_REPORT_INTERVAL ?? process.env.DEFAULT_INTERVAL ?? "60"
    )
      .then((data) => {
        this.set({ volume: "daily" }, data.volume);
        this.set({ amount: "daily" }, data.amount);
      })
      .catch((err) => {
        console.log(err);
      });

    reportHelper(
      getWeeklyTransactionQuery,
      "weekly",
      process.env.WEEKLY_REPORT_INTERVAL ?? process.env.DEFAULT_INTERVAL ?? "60"
    )
      .then((data) => {
        this.set({ volume: "weekly" }, data.volume);
        this.set({ amount: "weekly" }, data.amount);
      })
      .catch((err) => {
        console.log(err);
      });

    reportHelper(
      getMonthlyTransactionQuery,
      "monthly",
      process.env.MONTHLY_REPORT_INTERVAL ??
        process.env.DEFAULT_INTERVAL ??
        "60"
    )
      .then((data) => {
        this.set({ volume: "monthly" }, data.volume);
        this.set({ amount: "monthly" }, data.amount);
      })
      .catch((err) => {
        console.log(err);
      });
  },
});

new PromClient.Gauge({
  name: "lit_transactions",
  help: "Information about transactions",
  labelNames: [
    "from",
    "to",
    "value",
    "blockNumber",
    "blockTimestamp",
    "transactionHash",
  ],
  registers: [register],
  async collect() {
    let blockNumber = loadCheckpoint();
    console.log("query from block number: ", blockNumber);
    const data = await query(
      getTransactionValueGreaterThanQuery(0, blockNumber)
    );

    for (const transfer of data.transfers) {
      this.set(
        {
          ...transfer,
          value: new BigNumber(transfer.value)
            .dividedBy(new BigNumber(1e18))
            .toNumber(),
          blockTimestamp: new Date(parseInt(transfer.blockTimestamp) * 1000)
            .toISOString()
            .slice(0, -5),
        },
        new BigNumber(transfer.value)
          .dividedBy(new BigNumber(1e18))
          .toNumber() >= 1000
          ? 1000
          : 0
      );
      if (blockNumber < parseInt(transfer.blockNumber)) {
        blockNumber = parseInt(transfer.blockNumber);
      }
    }
    saveCheckpoint(blockNumber);
  },
});

const checkpointPath = `${process.env.HOME}/.litentry/checkpoint.txt`;

function saveCheckpoint(blockNumber: number) {
  try {
    if (!fs.existsSync(`${process.env.HOME}/.litentry`)) {
      fs.mkdirSync(`${process.env.HOME}/.litentry`);
    }

    fs.writeFileSync(checkpointPath, `${blockNumber}`);
  } catch (err) {
    console.log(err);
  }
}

function loadCheckpoint(): number {
  try {
    const content = fs.readFileSync(checkpointPath, {
      encoding: "utf8",
      flag: "r",
    });
    console.log("content: ", content);
    return JSON.parse(content);
  } catch (err) {
    console.log(err);
  }
  return 0;
}
