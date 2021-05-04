import React, { useCallback } from 'react'
import { Price } from '@uniswap/sdk-core'
import { useContext } from 'react'
import { Text } from 'rebass'

import styled, { ThemeContext } from 'styled-components'

interface TradePriceProps {
  price: Price
  showInverted: boolean
  setShowInverted: (showInverted: boolean) => void
}

const StyledPriceContainer = styled.button`
  justify-content: center;
  align-items: center;
  display: flex;
  width: fit-content;
  padding: 0;
  font-size: 0.875rem;
  font-weight: 400;
  background-color: transparent;
  border: none;
  margin-left: 1rem;
  height: 24px;
  cursor: pointer;

  ${({ theme }) => theme.mediaWidth.upToSmall`
    margin-left: 0;
    margin-top: 8px;
  `}
`

export default function TradePrice({ price, showInverted, setShowInverted }: TradePriceProps) {
  const theme = useContext(ThemeContext)

  let formattedPrice: string
  try {
    formattedPrice = showInverted ? price.toSignificant(4) : price.invert()?.toSignificant(4)
  } catch (error) {
    formattedPrice = '0'
  }

  const label = showInverted ? `${price.quoteCurrency?.symbol}` : `${price.baseCurrency?.symbol} `
  const labelInverted = showInverted ? `${price.baseCurrency?.symbol} ` : `${price.quoteCurrency?.symbol}`
  const flipPrice = useCallback(() => setShowInverted(!showInverted), [setShowInverted, showInverted])

  return (
    <StyledPriceContainer onClick={flipPrice}>
      <div style={{ alignItems: 'center', display: 'flex', width: 'fit-content' }}>
        <Text fontWeight={500} fontSize={14} color={theme.text1}>
          {'1 ' + labelInverted + ' = ' + formattedPrice ?? '-'} {label}
        </Text>
      </div>
    </StyledPriceContainer>
  )
}
