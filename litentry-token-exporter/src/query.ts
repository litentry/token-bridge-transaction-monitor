import axios from "axios";
import BigNumber from "bignumber.js";

export type Transfer = {
  id: string;
  from: string;
  to: string;
  value: string;
  blockNumber: string;
  blockTimestamp: string;
  transactionHash: string;
};

const SUMMARY_QUERY = `
query ($startAt: BigInt!, $endAt: BigInt!) {
  transfers (orderBy: blockTimestamp, orderDirection: desc, where: {blockTimestamp_gte: $startAt, blockTimestamp_lt: $endAt }) {
    id
    value
    transactionHash
  }
}
`;

export function getDailyTransactionQuery() {
  const endAt = Date.now();
  const startAt = new Date(endAt);
  startAt.setUTCHours(0);
  startAt.setUTCMinutes(0);
  startAt.setUTCSeconds(0);
  startAt.setUTCMilliseconds(0);

  return JSON.stringify({
    query: SUMMARY_QUERY,
    variables: {
      startAt: `${Math.floor(startAt.getTime() / 1000)}`,
      endAt: `${Math.floor(endAt / 1000)}`,
    },
  });
}

export function getWeeklyTransactionQuery() {
  const endAt = Date.now();
  const startAt = new Date(endAt);
  startAt.setUTCDate(startAt.getUTCDate() - 7);
  startAt.setUTCHours(0);
  startAt.setUTCMinutes(0);
  startAt.setUTCSeconds(0);
  startAt.setUTCMilliseconds(0);

  return JSON.stringify({
    query: SUMMARY_QUERY,
    variables: {
      startAt: `${Math.floor(startAt.getTime() / 1000)}`,
      endAt: `${Math.floor(endAt / 1000)}`,
    },
  });
}

export function getMonthlyTransactionQuery() {
  const endAt = Date.now();
  const startAt = new Date(endAt);
  startAt.setUTCMonth(startAt.getUTCMonth() - 1);
  startAt.setUTCHours(0);
  startAt.setUTCMinutes(0);
  startAt.setUTCSeconds(0);
  startAt.setUTCMilliseconds(0);

  return JSON.stringify({
    query: SUMMARY_QUERY,
    variables: {
      startAt: `${Math.floor(startAt.getTime() / 1000)}`,
      endAt: `${Math.floor(endAt / 1000)}`,
    },
  });
}

const TRANSACTION_VALUE_GREATER_THAN_QUERY = `
query ($value: BigInt!, $blockNumber: BigInt!) {
  transfers (orderBy: blockNumber, orderDirection: asc, where: {value_gte: $value, blockNumber_gt: $blockNumber}) {
    from
    to
    value
    blockTimestamp
    transactionHash
    blockNumber
  }
}
`;

export function getTransactionValueGreaterThanQuery(
  value: number,
  blockNumber: number
) {
  if (value < 0) throw new Error(`Invalid value: ${value}, should be >= 0`);
  return JSON.stringify({
    query: TRANSACTION_VALUE_GREATER_THAN_QUERY,
    variables: {
      value: new BigNumber(1e18).multipliedBy(value).toFixed(),
      blockNumber: blockNumber,
    },
  });
}

export async function query(q: string) {
  const payload = {
    method: "post",
    url: process.env.THEGRAPH_ENDPOINT,
    headers: { "Content-Type": "application/json" },
    data: q,
  };
  const {
    data: { data },
  } = await axios(payload);
  return data;
}
