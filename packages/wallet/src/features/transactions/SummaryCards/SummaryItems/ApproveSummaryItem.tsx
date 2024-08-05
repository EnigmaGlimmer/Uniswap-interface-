import { useTranslation } from 'react-i18next'
import { AssetType } from 'uniswap/src/entities/assets'
import { getSymbolDisplayText } from 'uniswap/src/utils/currency'
import { buildCurrencyId } from 'uniswap/src/utils/currencyId'
import { NumberType } from 'utilities/src/format/types'
import { LogoWithTxStatus } from 'wallet/src/components/CurrencyLogo/LogoWithTxStatus'
import { useLocalizationContext } from 'wallet/src/features/language/LocalizationContext'
import { useCurrencyInfo } from 'wallet/src/features/tokens/useCurrencyInfo'
import TransactionSummaryLayout from 'wallet/src/features/transactions/SummaryCards/SummaryItems/TransactionSummaryLayout'
import { SummaryItemProps } from 'wallet/src/features/transactions/SummaryCards/types'
import { TXN_HISTORY_ICON_SIZE } from 'wallet/src/features/transactions/SummaryCards/utils'
import { ApproveTransactionInfo, TransactionDetails, TransactionType } from 'wallet/src/features/transactions/types'

const INFINITE_AMOUNT = 'INF'
const ZERO_AMOUNT = '0.0'

export function ApproveSummaryItem({
  transaction,
  index,
}: SummaryItemProps & {
  transaction: TransactionDetails & { typeInfo: ApproveTransactionInfo }
}): JSX.Element {
  const { t } = useTranslation()
  const { formatNumberOrString } = useLocalizationContext()
  const currencyInfo = useCurrencyInfo(buildCurrencyId(transaction.chainId, transaction.typeInfo.tokenAddress))

  const { approvalAmount } = transaction.typeInfo

  const amount =
    approvalAmount === INFINITE_AMOUNT
      ? t('transaction.amount.unlimited')
      : approvalAmount && approvalAmount !== ZERO_AMOUNT
        ? formatNumberOrString({ value: approvalAmount, type: NumberType.TokenNonTx })
        : ''

  const caption = `${amount ? amount + ' ' : ''}${getSymbolDisplayText(currencyInfo?.currency.symbol) ?? ''}`

  return (
    <TransactionSummaryLayout
      caption={caption}
      icon={
        <LogoWithTxStatus
          assetType={AssetType.Currency}
          chainId={transaction.chainId}
          currencyInfo={currencyInfo}
          size={TXN_HISTORY_ICON_SIZE}
          txStatus={transaction.status}
          txType={TransactionType.Approve}
        />
      }
      index={index}
      transaction={transaction}
    />
  )
}
