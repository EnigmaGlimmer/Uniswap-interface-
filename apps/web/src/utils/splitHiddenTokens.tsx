import { PortfolioBalance } from 'graphql/data/portfolios'
import { TokenStandard } from 'uniswap/src/data/graphql/uniswap-data-api/__generated__/types-and-hooks'

const HIDE_SMALL_USD_BALANCES_THRESHOLD = 1

export interface SplitOptions {
  hideSmallBalances?: boolean
  hideSpam?: boolean
}

export function splitHiddenTokens(
  tokenBalances: readonly (PortfolioBalance | undefined)[],
  { hideSmallBalances = true, hideSpam = true }: SplitOptions = {},
) {
  const visibleTokens: PortfolioBalance[] = []
  const hiddenTokens: PortfolioBalance[] = []

  for (const tokenBalance of tokenBalances) {
    if (!tokenBalance) {
      continue
    }

    const isSpam = tokenBalance.token?.project?.isSpam
    if ((hideSpam && isSpam) || (hideSmallBalances && isNegligibleBalance(tokenBalance))) {
      hiddenTokens.push(tokenBalance)
    } else {
      visibleTokens.push(tokenBalance)
    }
  }

  return { visibleTokens, hiddenTokens }
}

function isNegligibleBalance({ denominatedValue, token }: PortfolioBalance) {
  return (
    denominatedValue?.value !== undefined && // if undefined we keep visible (see WEB-1940)
    token?.standard !== TokenStandard.Native && // always show native token balances
    denominatedValue?.value < HIDE_SMALL_USD_BALANCES_THRESHOLD // hide balances less than $1
  )
}
