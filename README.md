# token-bridge-transaction-monitor
gather token-bridge transaction data for monitors and reports

## litentry-token-exporter
### Install deps
`yarn`

### Start exporter
`yarn start:prod` or `yarn restart:prod`

## token-bridge-subgraph
```
yarn
yarn codegen && yarn build
```

### Auth (optional)
	graph auth --studio <auth_token>

### Deploy

	yarn deploy
### subgraph development link
	https://api.studio.thegraph.com/query/40178/litentry-token-monitor/v0.0.1	