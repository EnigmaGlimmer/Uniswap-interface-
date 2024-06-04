import { useBottomSheetInternal } from '@gorhom/bottom-sheet'
import { formatUnits } from 'ethers/lib/utils'
import { useTranslation } from 'react-i18next'
import Animated, { useAnimatedStyle } from 'react-native-reanimated'
import { ModalWithOverlay } from 'src/components/WalletConnect/ModalWithOverlay/ModalWithOverlay'
import { UwuLinkErc20Request } from 'src/features/walletConnect/walletConnectSlice'
import { Flex, Text, useIsDarkMode } from 'ui/src'
import { iconSizes, spacing } from 'ui/src/theme'
import { CurrencyInfo } from 'uniswap/src/features/dataApi/types'
import { ModalName } from 'uniswap/src/features/telemetry/constants'
import { NumberType } from 'utilities/src/format/types'
import { TokenLogo } from 'wallet/src/components/CurrencyLogo/TokenLogo'
import { SpinningLoader } from 'wallet/src/components/loading/SpinningLoader'
import { NetworkFee } from 'wallet/src/components/network/NetworkFee'
import { CHAIN_INFO } from 'wallet/src/constants/chains'
import { GasFeeResult } from 'wallet/src/features/gas/types'
import { RemoteImage } from 'wallet/src/features/images/RemoteImage'
import { useLocalizationContext } from 'wallet/src/features/language/LocalizationContext'
import { useOnChainCurrencyBalance } from 'wallet/src/features/portfolio/api'
import { NativeCurrency } from 'wallet/src/features/tokens/NativeCurrency'
import { useCurrencyInfo } from 'wallet/src/features/tokens/useCurrencyInfo'
import { useActiveAccountAddressWithThrow } from 'wallet/src/features/wallet/hooks'
import { buildCurrencyId } from 'wallet/src/utils/currencyId'

type Props = {
  onClose: () => void
  onConfirm: () => void
  onReject: () => void
  request: UwuLinkErc20Request
  hasSufficientGasFunds: boolean
  gasFee: GasFeeResult
}

export function UwULinkErc20SendModal({
  gasFee,
  onClose,
  onConfirm,
  onReject,
  request,
  hasSufficientGasFunds,
}: Props): JSX.Element {
  const { t } = useTranslation()
  const activeAccountAddress = useActiveAccountAddressWithThrow()
  // TODO: wallet should determine if the currency is stablecoin
  const { chainId, tokenAddress, amount } = request
  const currencyInfo = useCurrencyInfo(buildCurrencyId(chainId, tokenAddress))
  const { balance } = useOnChainCurrencyBalance(currencyInfo?.currency, activeAccountAddress)

  const hasSufficientTokenFunds = !balance?.lessThan(amount)

  return (
    <ModalWithOverlay
      confirmationButtonText={t('common.button.pay')}
      contentContainerStyle={{
        paddingHorizontal: spacing.spacing24,
        paddingTop: spacing.spacing8,
      }}
      disableConfirm={!hasSufficientTokenFunds || !hasSufficientGasFunds}
      name={ModalName.UwULinkErc20SendModal}
      scrollDownButtonText={t('walletConnect.request.button.scrollDown')}
      onClose={onClose}
      onConfirm={onConfirm}
      onReject={onReject}>
      <UwULinkErc20SendModalContent
        currencyInfo={currencyInfo}
        gasFee={gasFee}
        hasSufficientGasFunds={hasSufficientGasFunds}
        hasSufficientTokenFunds={hasSufficientTokenFunds}
        loading={!balance || !currencyInfo}
        request={request}
      />
    </ModalWithOverlay>
  )
}

function UwULinkErc20SendModalContent({
  gasFee,
  request,
  loading,
  currencyInfo,
  hasSufficientGasFunds,
  hasSufficientTokenFunds,
}: {
  gasFee: GasFeeResult
  request: UwuLinkErc20Request
  loading: boolean
  hasSufficientGasFunds: boolean
  hasSufficientTokenFunds: boolean
  currencyInfo: Maybe<CurrencyInfo>
}): JSX.Element {
  const { t } = useTranslation()
  const isDarkMode = useIsDarkMode()
  const { animatedFooterHeight } = useBottomSheetInternal()
  const bottomSpacerStyle = useAnimatedStyle(() => ({
    height: animatedFooterHeight.value,
  }))
  const { convertFiatAmountFormatted } = useLocalizationContext()

  const { chainId, isStablecoin } = request
  const nativeCurrency = chainId && NativeCurrency.onChain(chainId)

  if (loading || !currencyInfo) {
    return (
      <Flex centered py="$spacing12">
        <SpinningLoader color="$accent1" size={iconSizes.icon64} />
        <Animated.View style={bottomSpacerStyle} />
      </Flex>
    )
  }

  const {
    logoUrl,
    currency: { name, symbol, decimals },
  } = currencyInfo

  const recipientLogoUrl = isDarkMode
    ? request?.recipient?.logo?.dark
    : request?.recipient?.logo?.light

  const formattedTokenAmount = isStablecoin
    ? convertFiatAmountFormatted(formatUnits(request.amount, decimals), NumberType.FiatStandard)
    : formatUnits(request.amount, decimals)

  return (
    <Flex centered gap="$spacing12" justifyContent="space-between">
      {recipientLogoUrl ? (
        <RemoteImage height={50} uri={recipientLogoUrl} width={200} />
      ) : (
        <Text variant="subheading1">{request.recipient.name}</Text>
      )}
      <Flex centered flex={1} gap="$spacing12" py="$spacing36">
        {!hasSufficientTokenFunds && (
          <Text color="red">
            {t('uwulink.error.insufficientTokens', {
              tokenSymbol: symbol,
              chain: CHAIN_INFO[chainId].label,
            })}
          </Text>
        )}
        <Text fontSize={64} my="$spacing4" pt={42}>
          {formattedTokenAmount}
        </Text>
        <Flex row gap="$spacing8">
          <TokenLogo
            chainId={chainId}
            name={name}
            size={iconSizes.icon24}
            symbol={symbol}
            url={logoUrl}
          />
          <Text color="$neutral2">
            {formatUnits(request.amount, decimals)} {symbol}
          </Text>
        </Flex>
      </Flex>
      <Flex alignSelf="stretch" borderTopColor="$surface3" borderTopWidth={1} pt="$spacing16">
        <NetworkFee chainId={chainId} gasFee={gasFee} />
      </Flex>
      {!hasSufficientGasFunds && (
        <Text color="$DEP_accentWarning" pt="$spacing8" textAlign="center" variant="body3">
          {t('walletConnect.request.error.insufficientFunds', {
            currencySymbol: nativeCurrency?.symbol,
          })}
        </Text>
      )}
      <Animated.View style={bottomSpacerStyle} />
    </Flex>
  )
}
