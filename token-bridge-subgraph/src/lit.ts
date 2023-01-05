import { log } from "@graphprotocol/graph-ts";
import { Transfer as TransferEvent } from "../generated/LIT/LIT";
import { Transfer } from "../generated/schema";

const bridgeAddress = "0x11bce4536296c81d1a291b1ffbe292fdd55a3a89";

export function handleTransfer(event: TransferEvent): void {
  let entity = new Transfer(
    event.transaction.hash.concatI32(event.logIndex.toI32())
  );

  entity.from = event.params.from;
  entity.to = event.params.to;
  entity.value = event.params.value;
  entity.blockNumber = event.block.number;
  entity.blockTimestamp = event.block.timestamp;
  entity.transactionHash = event.transaction.hash;

  log.info("[handleTransfer] from: {}, to: {}, value: {}, timestamp: {}", [
    entity.from.toHexString().toLowerCase(),
    entity.to.toHexString(),
    entity.value.toString(),
    new Date(entity.blockTimestamp.toI64() * 1000).toString()
  ]);

  if (
    entity.from.toHexString().toLowerCase() == bridgeAddress ||
    entity.to.toHexString().toLowerCase() == bridgeAddress
  ) {
    entity.save();
  }
}
