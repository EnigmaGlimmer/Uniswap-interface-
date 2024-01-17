import { ApolloClient, from, InMemoryCache } from '@apollo/client'
import { RestLink } from 'apollo-link-rest'
import { config } from 'wallet/src/config'

const restLink = new RestLink({
  uri: config.uniswapApiBaseUrl,
  headers: {
    'Content-Type': 'application/json',
    'X-API-KEY': config.tradingApiKey,
    Origin: config.uniswapAppUrl,
  },
})

export const TradingApiApolloClient = new ApolloClient({
  link: from([restLink]),
  cache: new InMemoryCache(),
  defaultOptions: {
    watchQuery: {
      // ensures query is returning data even if some fields errored out
      errorPolicy: 'all',
      fetchPolicy: 'network-only',
    },
  },
})
