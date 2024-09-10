import { useApolloClient } from '@apollo/client'
import dayjs from 'dayjs'
import { useEffect, useMemo } from 'react'
import { View } from 'react-native'
import { batch, useDispatch, useSelector } from 'react-redux'
import { PollingInterval } from 'uniswap/src/constants/misc'
import {
  TransactionHistoryUpdaterQueryResult,
  TransactionListQuery,
  useTransactionHistoryUpdaterQuery,
  useTransactionListLazyQuery,
} from 'uniswap/src/data/graphql/uniswap-data-api/__generated__/types-and-hooks'
import { GQLQueries } from 'uniswap/src/data/graphql/uniswap-data-api/queries'
import { useHideSpamTokensSetting } from 'uniswap/src/features/settings/hooks'
import { TransactionStatus, TransactionType } from 'uniswap/src/features/transactions/types/transactionDetails'
import { ONE_SECOND_MS } from 'utilities/src/time/time'
import { buildReceiveNotification } from 'wallet/src/features/notifications/buildReceiveNotification'
import { shouldSuppressNotification } from 'wallet/src/features/notifications/notificationWatcherSaga'
import { selectLastTxNotificationUpdate } from 'wallet/src/features/notifications/selectors'
import {
  pushNotification,
  setLastTxNotificationUpdate,
  setNotificationStatus,
} from 'wallet/src/features/notifications/slice'
import { ReceiveCurrencyTxNotification, ReceiveNFTNotification } from 'wallet/src/features/notifications/types'
import { parseDataResponseToTransactionDetails } from 'wallet/src/features/transactions/history/utils'
import { useSelectAddressTransactions } from 'wallet/src/features/transactions/selectors'
import { useAccounts, useActiveAccountAddress } from 'wallet/src/features/wallet/hooks'
import { selectActiveAccountAddress } from 'wallet/src/features/wallet/selectors'

export const GQL_QUERIES_TO_REFETCH_ON_TXN_UPDATE = [
  GQLQueries.PortfolioBalances,
  GQLQueries.TransactionList,
  GQLQueries.NftsTab,
]

/**
 * For all imported accounts, checks for new transactions and updates
 * the notification status in redux.
 */
export function TransactionHistoryUpdater(): JSX.Element | null {
  const allAccounts = useAccounts()

  const activeAccountAddress = useActiveAccountAddress()
  const nonActiveAccountAddresses = useMemo(() => {
    return Object.keys(allAccounts).filter((address) => address !== activeAccountAddress)
  }, [activeAccountAddress, allAccounts])

  // Poll at different intervals to reduce requests made for non active accounts.

  const { data: activeAccountData } = useTransactionHistoryUpdaterQuery({
    variables: { addresses: activeAccountAddress ?? [] },
    pollInterval: PollingInterval.KindaFast,
    fetchPolicy: 'network-only', // Ensure latest data.
    skip: !activeAccountAddress,
  })

  const { data: nonActiveAccountData } = useTransactionHistoryUpdaterQuery({
    variables: { addresses: nonActiveAccountAddresses },
    pollInterval: PollingInterval.Normal,
    fetchPolicy: 'network-only', // Ensure latest data.
    skip: nonActiveAccountAddresses.length === 0,
  })

  const combinedPortfoliosData = [...(activeAccountData?.portfolios ?? []), ...(nonActiveAccountData?.portfolios ?? [])]

  if (!combinedPortfoliosData.length) {
    return null
  }

  return (
    <>
      {combinedPortfoliosData.map((portfolio) => {
        if (!portfolio?.ownerAddress || !portfolio?.assetActivities) {
          return null
        }

        return (
          <View key={portfolio.ownerAddress} testID={`AddressTransactionHistoryUpdater/${portfolio.ownerAddress}`}>
            <AddressTransactionHistoryUpdater activities={portfolio.assetActivities} address={portfolio.ownerAddress} />
          </View>
        )
      })}
    </>
  )
}

function AddressTransactionHistoryUpdater({
  address,
  activities,
}: {
  address: string
  activities: NonNullable<
    NonNullable<
      NonNullable<NonNullable<TransactionHistoryUpdaterQueryResult['data']>['portfolios']>[0]
    >['assetActivities']
  >
}): JSX.Element | null {
  const dispatch = useDispatch()
  const apolloClient = useApolloClient()

  const activeAccountAddress = useSelector(selectActiveAccountAddress)

  // Current txn count for all addresses
  const lastTxNotificationUpdateTimestamp = useSelector(selectLastTxNotificationUpdate)[address]

  const fetchAndDispatchReceiveNotification = useFetchAndDispatchReceiveNotification()

  // don't show notifications on spam tokens if setting enabled
  const hideSpamTokens = useHideSpamTokensSetting()

  const localTransactions = useSelectAddressTransactions(address)

  useEffect(() => {
    batch(async () => {
      let newTransactionsFound = false

      // Parse txns and address from portfolio.
      activities.forEach((activity) => {
        if (!activity) {
          return
        }

        if (!lastTxNotificationUpdateTimestamp) {
          dispatch(setLastTxNotificationUpdate({ address, timestamp: dayjs().valueOf() })) // Note this is in ms
          return
        }

        const updatedTimestampMs = activity.timestamp * ONE_SECOND_MS // convert api response from s -> ms
        const hasNewTxn = updatedTimestampMs > lastTxNotificationUpdateTimestamp

        if (hasNewTxn) {
          dispatch(setLastTxNotificationUpdate({ address, timestamp: updatedTimestampMs }))

          // Dont flag notification status for txns submitted from app, this is handled in transactionWatcherSaga.
          const confirmedLocally = localTransactions?.some(
            // eslint-disable-next-line max-nested-callbacks
            (localTx) => activity.details.__typename === 'TransactionDetails' && localTx.hash === activity.details.hash,
          )
          if (!confirmedLocally) {
            dispatch(setNotificationStatus({ address, hasNotifications: true }))
          }

          // full send refetch all active (mounted) queries
          newTransactionsFound = true
        }
      })

      if (newTransactionsFound && address === activeAccountAddress) {
        // Fetch full recent txn history and dispatch receive notification if needed.
        await fetchAndDispatchReceiveNotification(address, lastTxNotificationUpdateTimestamp, hideSpamTokens)
        await apolloClient.refetchQueries({ include: GQL_QUERIES_TO_REFETCH_ON_TXN_UPDATE })
      }
    }).catch(() => undefined)
  }, [
    activeAccountAddress,
    activities,
    address,
    apolloClient,
    dispatch,
    fetchAndDispatchReceiveNotification,
    hideSpamTokens,
    lastTxNotificationUpdateTimestamp,
    localTransactions,
  ])

  return null
}

/*
 * Fetch and search recent transactions for receive txn. If confirmed since the last status update timestamp,
 * dispatch notification update. We special case here because receive is never initiated within app.
 *
 * Note: we opt for a waterfall request here because full transaction data is a large query that we dont
 * want to submit every polling interval - only fetch this data if new txn is detected. This ideally gets
 * replaced with a subscription to new transactions with more full txn data.
 */
export function useFetchAndDispatchReceiveNotification(): (
  address: string,
  lastTxNotificationUpdateTimestamp: number | undefined,
  hideSpamTokens: boolean,
) => Promise<void> {
  const [fetchFullTransactionData] = useTransactionListLazyQuery()
  const dispatch = useDispatch()

  return async (
    address: string,
    lastTxNotificationUpdateTimestamp: number | undefined,
    hideSpamTokens = false,
  ): Promise<void> => {
    // Fetch full transaction history for user address.
    const { data: fullTransactionData } = await fetchFullTransactionData({
      variables: { address },
      fetchPolicy: 'network-only', // Ensure latest data.
    })

    const notification = getReceiveNotificationFromData(
      fullTransactionData,
      address,
      lastTxNotificationUpdateTimestamp,
      hideSpamTokens,
    )

    if (notification) {
      dispatch(pushNotification(notification))
    }
  }
}

export function getReceiveNotificationFromData(
  data: TransactionListQuery | undefined,
  address: Address,
  lastTxNotificationUpdateTimestamp: number | undefined,
  hideSpamTokens = false,
): ReceiveCurrencyTxNotification | ReceiveNFTNotification | undefined {
  if (!data || !lastTxNotificationUpdateTimestamp) {
    return
  }

  const parsedTxHistory = parseDataResponseToTransactionDetails(data, hideSpamTokens)
  if (!parsedTxHistory) {
    return
  }

  const latestReceivedTx = parsedTxHistory
    .sort((a, b) => a.addedTime - b.addedTime)
    .find(
      (tx) =>
        tx.addedTime &&
        tx.addedTime >= lastTxNotificationUpdateTimestamp &&
        tx.typeInfo.type === TransactionType.Receive &&
        tx.status === TransactionStatus.Success,
    )

  if (!latestReceivedTx) {
    return
  }

  // Suppress notification if rules apply
  if (shouldSuppressNotification(latestReceivedTx)) {
    return
  }

  return buildReceiveNotification(latestReceivedTx, address)
}
