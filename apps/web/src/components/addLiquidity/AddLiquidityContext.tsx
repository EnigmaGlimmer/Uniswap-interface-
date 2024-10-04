import { Currency, CurrencyAmount } from '@uniswap/sdk-core'
import { PositionInfo, useModalLiquidityPositionInfo } from 'components/Liquidity/utils'
import { Field } from 'components/addLiquidity/InputForm'
import { useDerivedAddLiquidityInfo } from 'components/addLiquidity/hooks'
import { Dispatch, PropsWithChildren, SetStateAction, createContext, useContext, useMemo, useState } from 'react'

export interface AddLiquidityState {
  position?: PositionInfo
  exactField: Field
  exactAmount?: string
}
const DEFAULT_ADD_LIQUIDITY_STATE = {
  exactField: Field.TOKEN0,
}

export interface AddLiquidityInfo {
  formattedAmounts?: { [field in Field]?: string }
  currencyBalances?: { [field in Field]?: CurrencyAmount<Currency> }
  currencyAmounts?: { [field in Field]?: CurrencyAmount<Currency> }
  currencyAmountsUSDValue?: { [field in Field]?: CurrencyAmount<Currency> }
}

interface AddLiquidityContextType {
  addLiquidityState: AddLiquidityState
  derivedAddLiquidityInfo: AddLiquidityInfo
  setAddLiquidityState: Dispatch<SetStateAction<AddLiquidityState>>
}

const AddLiquidityContext = createContext<AddLiquidityContextType>({
  addLiquidityState: DEFAULT_ADD_LIQUIDITY_STATE,
  derivedAddLiquidityInfo: {},
  setAddLiquidityState: () => undefined,
})

export function useAddLiquidityContext() {
  return useContext(AddLiquidityContext)
}

export function AddLiquidityContextProvider({ children }: PropsWithChildren) {
  const positionInfo = useModalLiquidityPositionInfo()

  const [addLiquidityState, setAddLiquidityState] = useState<AddLiquidityState>({
    ...DEFAULT_ADD_LIQUIDITY_STATE,
    position: positionInfo,
  })

  const derivedAddLiquidityInfo = useDerivedAddLiquidityInfo(addLiquidityState)

  const value = useMemo(
    () => ({
      addLiquidityState,
      setAddLiquidityState,
      derivedAddLiquidityInfo,
    }),
    [addLiquidityState, derivedAddLiquidityInfo],
  )

  return <AddLiquidityContext.Provider value={value}>{children}</AddLiquidityContext.Provider>
}
