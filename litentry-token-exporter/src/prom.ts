import BigNumber from "bignumber.js";
import * as PromClient from "prom-client";
import fs from "fs";
import { utils as substrateUtils } from "./circulation";

import {
  getDailyTransactionQuery,
  getWeeklyTransactionQuery,
  getMonthlyTransactionQuery,
  getTransactionValueGreaterThanQuery,
  query,
} from "./query";
import type { Transfer } from "./query";
import { totalSupply } from "./circulation";
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
    console.log(getTransactionValueGreaterThanQuery(0, blockNumber));
    // NOTES: possible bugs here ?
    const data = await query(
      getTransactionValueGreaterThanQuery(0, blockNumber)
    );
    console.log(
      "--------------------------------------------------------------------------------"
    );
    console.log("transfers: ");
    console.log(data.transfers);
    console.log(
      "--------------------------------------------------------------------------------"
    );
    if (data.transfers.length === 0) {
      return;
    }
    const THE_GRAPH_LIMIT = 100;
    const length = data.transfers.length;
    const lastBlockNumberInQuery = parseInt(
      data.transfers[length - 1].blockNumber
    );
    console.log(
      "length: ",
      length,
      ", lastBlockNumberInQuery: ",
      lastBlockNumberInQuery
    );
    for (const transfer of data.transfers) {
      if (
        length >= THE_GRAPH_LIMIT &&
        parseInt(transfer.blockNumber) === lastBlockNumberInQuery
      ) {
        break;
      }

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
        0
      );
      if (blockNumber < parseInt(transfer.blockNumber)) {
        blockNumber = parseInt(transfer.blockNumber);
      }
      console.log(
        "blocknumber: ",
        blockNumber,
        ", lastBlockNumberInQuery: ",
        lastBlockNumberInQuery
      );
    }
    saveCheckpoint(blockNumber);
  },
});

new PromClient.Gauge({
  name: "lit_token_supply_and_locked",
  help: "Report about total supply and locked token information",
  labelNames: ["total_supply", "locked"],

  registers: [register],
  async collect() {
    const data = await totalSupply();
    this.set(
      { total_supply: "eth" },
      new BigNumber(data.eth_total_supply.amount)
        .dividedBy(new BigNumber(1e18))
        .toNumber()
    );
    this.set(
      { total_supply: "bsc" },
      new BigNumber(data.bsc_total_supply.amount)
        .dividedBy(new BigNumber(1e18))
        .toNumber()
    );
    this.set(
      { total_supply: "litentry" },
      new BigNumber(data.litentry_total_supply.amount)
        .dividedBy(new BigNumber(1e12))
        .toNumber()
    );
    this.set(
      { total_supply: "litmus" },
      new BigNumber(data.litmus_total_supply.amount)
        .dividedBy(new BigNumber(1e12))
        .toNumber()
    );
    this.set(
      { locked: "ecosystem" },
      new BigNumber(data.locked_info.ecosystem.amount)
        .dividedBy(new BigNumber(1e18))
        .toNumber()
    );
    this.set(
      { locked: "team" },
      new BigNumber(data.locked_info.team.amount)
        .dividedBy(new BigNumber(1e18))
        .toNumber()
    );
    this.set(
      { locked: "foundation" },
      new BigNumber(data.locked_info.foundation.amount)
        .dividedBy(new BigNumber(1e18))
        .toNumber()
    );
    this.set(
      { locked: "bridge" },
      new BigNumber(data.locked_info.bridge.amount)
        .dividedBy(new BigNumber(1e18))
        .toNumber()
    );
  },
});

new PromClient.Gauge({
  name: "lit_staking",
  help: "Report about staking",
  labelNames: [
    "collator",
    "delegator",
    "type",
    "delegationCount",
    "selfStaking",
    "delegatedStaking",
  ],

  registers: [register],
  async collect() {
    await substrateUtils.init();
    const { total, collators, delegators } = await substrateUtils.staking();
    this.set(
      { type: "total_staking" },
      new BigNumber(total.amount).dividedBy(new BigNumber(1e12)).toNumber()
    );
    for (const collator of collators) {
      this.set(
        {
          type: "collator",
          collator: collator.account,
          delegator: "-",
          delegationCount: collator.delegationCount,
          selfStaking: new BigNumber(collator.bond)
            .dividedBy(new BigNumber(1e12))
            .toNumber(),
          delegatedStaking:
            new BigNumber(collator.totalCounted)
              .dividedBy(new BigNumber(1e12))
              .toNumber() -
            new BigNumber(collator.bond)
              .dividedBy(new BigNumber(1e12))
              .toNumber(),
        },
        new BigNumber(collator.bond).dividedBy(new BigNumber(1e12)).toNumber()
      );
    }
    for (const ind in delegators) {
      const ds = delegators[ind];
      const collator = ds.collator;
      for (const delegator of ds.delegations) {
        this.set(
          {
            type: "delegator",
            collator: collator,
            delegator: delegator.owner,
            delegationCount: "-",
          },
          new BigNumber(delegator.amount)
            .dividedBy(new BigNumber(1e12))
            .toNumber()
        );
      }
    }
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
