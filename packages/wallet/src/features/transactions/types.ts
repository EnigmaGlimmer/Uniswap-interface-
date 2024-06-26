import { AnyAction } from '@reduxjs/toolkit'
import { Protocol } from '@uniswap/router-sdk'
import { TradeType } from '@uniswap/sdk-core'
import { providers } from 'ethers'
import { Dispatch } from 'react'
import { TransactionListQuery } from 'uniswap/src/data/graphql/uniswap-data-api/__generated__/types-and-hooks'
import { FORLogo } from 'uniswap/src/features/fiatOnRamp/types'
import { WalletChainId } from 'uniswap/src/types/chains'
import { DappInfo } from 'uniswap/src/types/walletConnect'
import { Routing } from 'wallet/src/data/tradingApi/__generated__/index'
import { AssetType } from 'wallet/src/entities/assets'
import { MoonpayCurrency } from 'wallet/src/features/fiatOnRamp/types'
import { GasFeeResult } from 'wallet/src/features/gas/types'
import { ParsedWarnings } from 'wallet/src/features/transactions/hooks/useParsedTransactionWarnings'
import { DerivedTransferInfo } from 'wallet/src/features/transactions/transfer/types'

export enum WrapType {
  NotApplicable,
  Wrap,
  Unwrap,
}

export type ChainIdToTxIdToDetails = Partial<
  Record<WalletChainId, { [txId: string]: TransactionDetails }>
>

// Basic identifying info for a transaction
export interface TransactionId {
  chainId: WalletChainId
  // moonpay externalTransactionId
  id: string
}

export type TransactionListQueryResponse = NonNullable<
  NonNullable<NonNullable<TransactionListQuery['portfolios']>[0]>['assetActivities']
>[0]

interface BaseTransactionDetails extends TransactionId {
  ownerAddress?: Address
  from: Address

  // Specific info for the tx type
  typeInfo: TransactionTypeInfo

  // Info for status tracking
  status: TransactionStatus
  addedTime: number
  // Note: hash is mandatory for classic transactions and undefined for unfilled UniswapX orders
  // It may also become optional for classic if we start tracking txs before they're actually sent
  hash?: string

  receipt?: TransactionReceipt

  // cancelRequest is the txRequest object to be submitted
  // in attempt to cancel the current transaction
  // it should contain all the appropriate gas details in order
  // to get submitted first
  cancelRequest?: providers.TransactionRequest
}

export interface UniswapXOrderDetails extends BaseTransactionDetails {
  routing: Routing.DUTCH_V2

  // Note: `orderHash` is an off-chain value used to track orders before they're filled on-chain.
  // UniswapX orders will also have a transaction `hash` if they become filled.
  // `orderHash` will be undefined if the object is built from a filled order received from graphql. Once filled, it is not needed for any tracking.
  orderHash?: string
}

export interface ClassicTransactionDetails extends BaseTransactionDetails {
  routing: Routing.CLASSIC

  // Info for submitting the tx
  options: TransactionOptions
}

export type TransactionDetails = UniswapXOrderDetails | ClassicTransactionDetails

export enum TransactionStatus {
  Canceled = 'cancelled',
  Cancelling = 'cancelling',
  FailedCancel = 'failedCancel',
  Success = 'confirmed',
  Failed = 'failed',
  Pending = 'pending',
  Replacing = 'replacing',
  Unknown = 'unknown',
  // May want more granular options here later like InMemPool
}

// Transaction confirmed on chain
export type FinalizedTransactionStatus =
  | TransactionStatus.Success
  | TransactionStatus.Failed
  | TransactionStatus.Canceled
  | TransactionStatus.FailedCancel

export type FinalizedTransactionDetails = TransactionDetails & {
  status: FinalizedTransactionStatus
  hash: string
}

export type TransactionOptions = {
  request: providers.TransactionRequest
  timeoutMs?: number
  submitViaPrivateRpc?: boolean
}

export interface TransactionReceipt {
  transactionIndex: number
  blockHash: string
  blockNumber: number
  confirmedTime: number
  confirmations: number
  gasUsed: number
  effectiveGasPrice: number
}

export interface NFTSummaryInfo {
  tokenId: string
  name: string
  collectionName: string
  imageURL: string
}

export enum NFTTradeType {
  BUY = 'buy',
  SELL = 'sell',
}

/**
 * Be careful adding to this enum, always assign a unique value (typescript will not prevent duplicate values).
 * These values are persisted in state and if you change the value it will cause errors
 */
export enum TransactionType {
  // Token Specific
  Approve = 'approve',
  Swap = 'swap',
  Wrap = 'wrap',

  // NFT specific
  NFTApprove = 'nft-approve',
  NFTTrade = 'nft-trade',
  NFTMint = 'nft-mint',

  // All asset types
  Send = 'send',
  Receive = 'receive',

  // Fiat onramp
  FiatPurchase = 'fiat-purchase', // deprecated. TODO(MOB-2963): remove
  OnRampPurchase = 'onramp-purchase',
  OnRampTransfer = 'onramp-transfer',

  // General
  WCConfirm = 'wc-confirm',
  Unknown = 'unknown',
}

export interface BaseTransactionInfo {
  type: TransactionType
  transactedUSDValue?: number
  isSpam?: boolean
  externalDappInfo?: DappInfo
}

export interface ApproveTransactionInfo extends BaseTransactionInfo {
  type: TransactionType.Approve
  tokenAddress: string
  spender: string
  approvalAmount?: string
}

export interface BaseSwapTransactionInfo extends BaseTransactionInfo {
  type: TransactionType.Swap
  tradeType?: TradeType
  inputCurrencyId: string
  outputCurrencyId: string
  slippageTolerance?: number
  quoteId?: string
  routeString?: string
  gasUseEstimate?: string
  protocol?: Protocol
}

export interface ExactInputSwapTransactionInfo extends BaseSwapTransactionInfo {
  tradeType: TradeType.EXACT_INPUT
  inputCurrencyAmountRaw: string
  expectedOutputCurrencyAmountRaw: string
  minimumOutputCurrencyAmountRaw: string
}

export interface ExactOutputSwapTransactionInfo extends BaseSwapTransactionInfo {
  tradeType: TradeType.EXACT_OUTPUT
  outputCurrencyAmountRaw: string
  expectedInputCurrencyAmountRaw: string
  maximumInputCurrencyAmountRaw: string
}

export interface ConfirmedSwapTransactionInfo extends BaseSwapTransactionInfo {
  inputCurrencyAmountRaw: string
  outputCurrencyAmountRaw: string
}

export interface WrapTransactionInfo extends BaseTransactionInfo {
  type: TransactionType.Wrap
  unwrapped: boolean
  currencyAmountRaw: string
}

export interface SendTokenTransactionInfo extends BaseTransactionInfo {
  type: TransactionType.Send
  assetType: AssetType
  recipient: string
  tokenAddress: string
  currencyAmountRaw?: string
  tokenId?: string // optional. NFT token id
  nftSummaryInfo?: NFTSummaryInfo // optional. NFT metadata
}

export interface ReceiveTokenTransactionInfo extends BaseTransactionInfo {
  type: TransactionType.Receive
  assetType: AssetType
  currencyAmountRaw?: string
  sender: string
  tokenAddress: string
  tokenId?: string // optional. NFT token id
  nftSummaryInfo?: NFTSummaryInfo
}

export interface FiatPurchaseTransactionInfo extends BaseTransactionInfo {
  type: TransactionType.FiatPurchase
  id?: string
  explorerUrl?: string
  // code will be used for formatting amounts
  inputCurrency?: Pick<MoonpayCurrency, 'type' | 'code'>
  inputSymbol?: string
  inputCurrencyAmount?: number
  // metadata will be used to get the output currency
  outputCurrency?: Required<Pick<MoonpayCurrency, 'type' | 'metadata'>>
  outputSymbol?: string
  // outputCurrencyAmount can be null for failed transactions,
  // cause it's supposed to be set once transaction is complete
  // https://docs.moonpay.com/moonpay/developer-resources/api/client-side-apis/transactions
  outputCurrencyAmount?: number | null
  syncedWithBackend: boolean
  // only avaible with FOR aggregator
  serviceProviderLogo?: FORLogo
  institutionLogoUrl?: string
  serviceProvider?: string
  institution?: string
}

export interface OnRampTransactionInfo extends BaseTransactionInfo {
  type: TransactionType
  id: string
  destinationTokenSymbol: string
  destinationTokenAddress: string
  destinationTokenAmount: number
  serviceProvider: ServiceProviderInfo
  // Fees are in units of the sourceCurrency for purchases,
  // and in units of the destinationToken for transfers
  networkFee?: number
  transactionFee?: number
  totalFee?: number
}

export interface OnRampPurchaseInfo extends OnRampTransactionInfo {
  type: TransactionType.OnRampPurchase
  sourceCurrency: string
  sourceAmount: number
}

export interface OnRampTransferInfo extends OnRampTransactionInfo {
  type: TransactionType.OnRampTransfer
}

export interface ServiceProviderInfo {
  id: string
  name: string
  url: string
  logoLightUrl: string
  logoDarkUrl: string
  supportUrl?: string
}

export interface NFTMintTransactionInfo extends BaseTransactionInfo {
  type: TransactionType.NFTMint
  nftSummaryInfo: NFTSummaryInfo
  purchaseCurrencyId?: string
  purchaseCurrencyAmountRaw?: string
}

export interface NFTTradeTransactionInfo extends BaseTransactionInfo {
  type: TransactionType.NFTTrade
  nftSummaryInfo: NFTSummaryInfo
  purchaseCurrencyId: string
  purchaseCurrencyAmountRaw: string
  tradeType: NFTTradeType
}

export interface NFTApproveTransactionInfo extends BaseTransactionInfo {
  type: TransactionType.NFTApprove
  nftSummaryInfo: NFTSummaryInfo
  spender: string
}

export interface WCConfirmInfo extends BaseTransactionInfo {
  type: TransactionType.WCConfirm
  dapp: DappInfo
}

export interface UnknownTransactionInfo extends BaseTransactionInfo {
  type: TransactionType.Unknown
  tokenAddress?: string
}

export type TransactionTypeInfo =
  | ApproveTransactionInfo
  | FiatPurchaseTransactionInfo
  | ExactOutputSwapTransactionInfo
  | ExactInputSwapTransactionInfo
  | ConfirmedSwapTransactionInfo
  | WrapTransactionInfo
  | SendTokenTransactionInfo
  | ReceiveTokenTransactionInfo
  | NFTTradeTransactionInfo
  | NFTApproveTransactionInfo
  | NFTMintTransactionInfo
  | WCConfirmInfo
  | UnknownTransactionInfo
  | OnRampPurchaseInfo
  | OnRampTransferInfo

export function isConfirmedSwapTypeInfo(
  typeInfo: TransactionTypeInfo
): typeInfo is ConfirmedSwapTransactionInfo {
  return Boolean(
    (typeInfo as ConfirmedSwapTransactionInfo).inputCurrencyAmountRaw &&
      (typeInfo as ConfirmedSwapTransactionInfo).outputCurrencyAmountRaw
  )
}

export function isFinalizedTx(
  tx: TransactionDetails | FinalizedTransactionDetails
): tx is FinalizedTransactionDetails {
  return (
    tx.status === TransactionStatus.Success ||
    tx.status === TransactionStatus.Failed ||
    tx.status === TransactionStatus.Canceled ||
    tx.status === TransactionStatus.FailedCancel
  )
}

export enum TransactionStep {
  FORM,
  REVIEW,
  SUBMITTED,
}

export interface TransferFlowProps {
  dispatch: Dispatch<AnyAction>
  showRecipientSelector?: boolean
  recipientSelector?: JSX.Element
  flowName: string
  derivedInfo: DerivedTransferInfo
  onClose: () => void
  txRequest?: providers.TransactionRequest
  gasFee: GasFeeResult
  step: TransactionStep
  setStep: (newStep: TransactionStep) => void
  warnings: ParsedWarnings
  exactValue: string
  isFiatInput?: boolean
  showFiatToggle?: boolean
}
