/* eslint-disable max-lines */
import { useApolloClient } from '@apollo/client'
import { useIsFocused, useScrollToTop } from '@react-navigation/native'
import { FlashList } from '@shopify/flash-list'
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Freeze } from 'react-freeze'
import { useTranslation } from 'react-i18next'
import { FlatList, StyleProp, View, ViewProps, ViewStyle } from 'react-native'
import Animated, {
  FadeIn,
  FadeOut,
  interpolateColor,
  useAnimatedRef,
  useAnimatedScrollHandler,
  useAnimatedStyle,
  useDerivedValue,
  useSharedValue,
} from 'react-native-reanimated'
import { SvgProps } from 'react-native-svg'
import { SceneRendererProps, TabBar } from 'react-native-tab-view'
import { useAppDispatch, useAppSelector } from 'src/app/hooks'
import { ExtensionPromoModal } from 'src/app/modals/ExtensionPromoModal'
import { NavBar, SWAP_BUTTON_HEIGHT } from 'src/app/navigation/NavBar'
import { AppStackScreenProp } from 'src/app/navigation/types'
import TraceTabView from 'src/components/Trace/TraceTabView'
import { AccountHeader } from 'src/components/accounts/AccountHeader'
import { ExtensionPromoBanner } from 'src/components/banners/ExtensionPromoBanner'
import { ACTIVITY_TAB_DATA_DEPENDENCIES, ActivityTab } from 'src/components/home/ActivityTab'
import { FEED_TAB_DATA_DEPENDENCIES, FeedTab } from 'src/components/home/FeedTab'
import { NFTS_TAB_DATA_DEPENDENCIES, NftsTab } from 'src/components/home/NftsTab'
import { TOKENS_TAB_DATA_DEPENDENCIES, TokensTab } from 'src/components/home/TokensTab'
import { Screen } from 'src/components/layout/Screen'
import {
  HeaderConfig,
  ScrollPair,
  TAB_BAR_HEIGHT,
  TAB_STYLES,
  TAB_VIEW_SCROLL_THROTTLE,
  TabContentProps,
  TabLabel,
  useScrollSync,
} from 'src/components/layout/TabHelpers'
import { UnitagBanner } from 'src/components/unitags/UnitagBanner'
import { openModal } from 'src/features/modals/modalSlice'
import { selectSomeModalOpen } from 'src/features/modals/selectSomeModalOpen'
import { useWalletRestore } from 'src/features/wallet/hooks'
import { removePendingSession } from 'src/features/walletConnect/walletConnectSlice'
import { HomeScreenTabIndex } from 'src/screens/HomeScreenTabIndex'
import { hideSplashScreen } from 'src/utils/splashScreen'
import { Flex, HapticFeedback, Text, TouchableArea, useDeviceInsets, useMedia, useSporeColors } from 'ui/src'
import ReceiveIcon from 'ui/src/assets/icons/arrow-down-circle.svg'
import BuyIcon from 'ui/src/assets/icons/buy.svg'
import ScanIcon from 'ui/src/assets/icons/scan-home.svg'
import SendIcon from 'ui/src/assets/icons/send-action.svg'
import { AnimatedFlex } from 'ui/src/components/layout/AnimatedFlex'
import { useDeviceDimensions } from 'ui/src/hooks/useDeviceDimensions'
import { iconSizes, spacing } from 'ui/src/theme'
import { FeatureFlags } from 'uniswap/src/features/gating/flags'
import { useFeatureFlag } from 'uniswap/src/features/gating/hooks'
import Trace from 'uniswap/src/features/telemetry/Trace'
import {
  ElementName,
  ElementNameType,
  MobileEventName,
  ModalName,
  SectionName,
  SectionNameType,
} from 'uniswap/src/features/telemetry/constants'
import { MobileScreens } from 'uniswap/src/types/screens/mobile'
import { useTimeout } from 'utilities/src/time/timing'
import { ScannerModalState } from 'wallet/src/components/QRCodeScanner/constants'
import { selectHasSkippedUnitagPrompt } from 'wallet/src/features/behaviorHistory/selectors'
import { useCexTransferProviders } from 'wallet/src/features/fiatOnRamp/api'
import { useSelectAddressHasNotifications } from 'wallet/src/features/notifications/hooks'
import { setNotificationStatus } from 'wallet/src/features/notifications/slice'
import { PortfolioBalance } from 'wallet/src/features/portfolio/PortfolioBalance'
import { TokenBalanceListRow } from 'wallet/src/features/portfolio/TokenBalanceListContext'
import { useHeartbeatReporter, useLastBalancesReporter } from 'wallet/src/features/telemetry/hooks'
import { useCanActiveAddressClaimUnitag, useShowExtensionPromoBanner } from 'wallet/src/features/unitags/hooks'
import { AccountType } from 'wallet/src/features/wallet/accounts/types'
import { useActiveAccountWithThrow } from 'wallet/src/features/wallet/hooks'

const CONTENT_HEADER_HEIGHT_ESTIMATE = 270

/**
 * Home Screen hosts both Tokens and NFTs Tab
 * Manages TokensTabs and NftsTab scroll offsets when header is collapsed
 * Borrowed from: https://stormotion.io/blog/how-to-create-collapsing-tab-header-using-react-native/
 */
export function HomeScreen(props?: AppStackScreenProp<MobileScreens.Home>): JSX.Element {
  const activeAccount = useActiveAccountWithThrow()
  const { t } = useTranslation()
  const colors = useSporeColors()
  const media = useMedia()
  const insets = useDeviceInsets()
  const dimensions = useDeviceDimensions()
  const dispatch = useAppDispatch()
  const isFocused = useIsFocused()
  const isModalOpen = useAppSelector(selectSomeModalOpen)
  const isHomeScreenBlur = !isFocused || isModalOpen

  const hasSkippedUnitagPrompt = useAppSelector(selectHasSkippedUnitagPrompt)

  const showFeedTab = useFeatureFlag(FeatureFlags.FeedTab)
  // opens the wallet restore modal if recovery phrase is missing after the app is opened
  useWalletRestore({ openModalImmediately: true })

  // Record a heartbeat for anonymous user DAU
  useHeartbeatReporter()
  // Report balances at most every 24 hours, checking every 15 seconds when app is open
  useLastBalancesReporter()

  const [tabIndex, setTabIndex] = useState(props?.route?.params?.tab ?? HomeScreenTabIndex.Tokens)
  // Necessary to declare these as direct dependencies due to race condition with initializing react-i18next and useMemo
  const tokensTitle = t('home.tokens.title')
  const nftsTitle = t('home.nfts.title')
  const activityTitle = t('home.activity.title')
  const feedTitle = t('home.feed.title')

  const routes = useMemo(() => {
    const tabs: Array<{ key: SectionNameType; title: string }> = [
      { key: SectionName.HomeTokensTab, title: tokensTitle },
      { key: SectionName.HomeNFTsTab, title: nftsTitle },
      { key: SectionName.HomeActivityTab, title: activityTitle },
    ]

    if (showFeedTab) {
      tabs.push({ key: SectionName.HomeFeedTab, title: feedTitle })
    }

    return tabs
  }, [tokensTitle, nftsTitle, activityTitle, feedTitle, showFeedTab])

  useEffect(
    function syncTabIndex() {
      const newTabIndex = props?.route.params?.tab
      if (newTabIndex === undefined) {
        return
      }
      setTabIndex(newTabIndex)
    },
    [props?.route.params?.tab],
  )

  const [isLayoutReady, setIsLayoutReady] = useState(false)

  const [headerHeight, setHeaderHeight] = useState(CONTENT_HEADER_HEIGHT_ESTIMATE)
  const headerConfig = useMemo<HeaderConfig>(
    () => ({
      heightCollapsed: insets.top,
      heightExpanded: headerHeight,
    }),
    [headerHeight, insets.top],
  )
  const { heightCollapsed, heightExpanded } = headerConfig
  const headerHeightDiff = heightExpanded - heightCollapsed

  const handleHeaderLayout = useCallback<NonNullable<ViewProps['onLayout']>>((event) => {
    setHeaderHeight(event.nativeEvent.layout.height)
    setIsLayoutReady(true)
  }, [])

  const tokensTabScrollValue = useSharedValue(0)
  const tokensTabScrollHandler = useAnimatedScrollHandler(
    (event) => (tokensTabScrollValue.value = event.contentOffset.y),
  )
  const nftsTabScrollValue = useSharedValue(0)
  const nftsTabScrollHandler = useAnimatedScrollHandler((event) => (nftsTabScrollValue.value = event.contentOffset.y))
  const activityTabScrollValue = useSharedValue(0)
  const activityTabScrollHandler = useAnimatedScrollHandler(
    (event) => (activityTabScrollValue.value = event.contentOffset.y),
  )
  const feedTabScrollValue = useSharedValue(0)
  const feedTabScrollHandler = useAnimatedScrollHandler((event) => (feedTabScrollValue.value = event.contentOffset.y))

  const tokensTabScrollRef = useAnimatedRef<FlatList<TokenBalanceListRow>>()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const nftsTabScrollRef = useAnimatedRef<FlashList<any>>()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const activityTabScrollRef = useAnimatedRef<FlatList<any>>()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const feedTabScrollRef = useAnimatedRef<FlatList<any>>()

  const currentScrollValue = useDerivedValue(() => {
    if (tabIndex === HomeScreenTabIndex.Tokens) {
      return tokensTabScrollValue.value
    } else if (tabIndex === HomeScreenTabIndex.NFTs) {
      return nftsTabScrollValue.value
    } else if (tabIndex === HomeScreenTabIndex.Activity) {
      return activityTabScrollValue.value
    }
    return feedTabScrollValue.value
  }, [activityTabScrollValue, feedTabScrollValue, nftsTabScrollValue, tabIndex, tokensTabScrollValue])

  // clear the notification indicator if the user is on the activity tab
  const hasNotifications = useSelectAddressHasNotifications(activeAccount.address)
  useEffect(() => {
    if (tabIndex === 2 && hasNotifications) {
      dispatch(setNotificationStatus({ address: activeAccount.address, hasNotifications: false }))
    }
  }, [dispatch, activeAccount.address, tabIndex, hasNotifications])

  // If accounts are switched, we want to scroll to top and show full header
  useEffect(() => {
    nftsTabScrollValue.value = 0
    tokensTabScrollValue.value = 0
    activityTabScrollValue.value = 0
    feedTabScrollValue.value = 0
    nftsTabScrollRef.current?.scrollToOffset({ offset: 0, animated: true })
    tokensTabScrollRef.current?.scrollToOffset({ offset: 0, animated: true })
    activityTabScrollRef.current?.scrollToOffset({ offset: 0, animated: true })
    feedTabScrollRef.current?.scrollToOffset({ offset: 0, animated: true })
  }, [
    activeAccount,
    activityTabScrollRef,
    activityTabScrollValue,
    nftsTabScrollRef,
    nftsTabScrollValue,
    tokensTabScrollRef,
    tokensTabScrollValue,
    feedTabScrollRef,
    feedTabScrollValue,
  ])

  // Need to create a derived value for tab index so it can be referenced from a static ref
  const currentTabIndex = useDerivedValue(() => tabIndex, [tabIndex])
  const isNftTabsAtTop = useDerivedValue(() => nftsTabScrollValue.value === 0)
  const isActivityTabAtTop = useDerivedValue(() => activityTabScrollValue.value === 0)

  useScrollToTop(
    useRef({
      scrollToTop: () => {
        if (currentTabIndex.value === HomeScreenTabIndex.NFTs && isNftTabsAtTop.value) {
          setTabIndex(HomeScreenTabIndex.Tokens)
        } else if (currentTabIndex.value === HomeScreenTabIndex.NFTs) {
          nftsTabScrollRef.current?.scrollToOffset({ offset: 0, animated: true })
        } else if (currentTabIndex.value === HomeScreenTabIndex.Activity && isActivityTabAtTop.value) {
          setTabIndex(HomeScreenTabIndex.NFTs)
        } else if (currentTabIndex.value === HomeScreenTabIndex.Activity) {
          activityTabScrollRef.current?.scrollToOffset({ offset: 0, animated: true })
        } else {
          tokensTabScrollRef.current?.scrollToOffset({ offset: 0, animated: true })
        }
      },
    }),
  )

  const translateY = useDerivedValue(() => {
    // Allow header to scroll vertically with list
    return -Math.min(currentScrollValue.value, headerHeightDiff)
  })

  const translatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }],
  }))

  const scrollPairs = useMemo<ScrollPair[]>(
    () => [
      { list: tokensTabScrollRef, position: tokensTabScrollValue, index: 0 },
      { list: nftsTabScrollRef, position: nftsTabScrollValue, index: 1 },
      { list: activityTabScrollRef, position: activityTabScrollValue, index: 2 },
      { list: feedTabScrollRef, position: feedTabScrollValue, index: 3 },
    ],
    [
      activityTabScrollRef,
      activityTabScrollValue,
      feedTabScrollRef,
      feedTabScrollValue,
      nftsTabScrollRef,
      nftsTabScrollValue,
      tokensTabScrollRef,
      tokensTabScrollValue,
    ],
  )

  const { sync } = useScrollSync(currentTabIndex, scrollPairs, headerConfig)

  const forAggregatorEnabled = useFeatureFlag(FeatureFlags.ForAggregator)
  const cexTransferEnabled = useFeatureFlag(FeatureFlags.CexTransfers)
  const cexTransferProviders = useCexTransferProviders(cexTransferEnabled)

  const onPressBuy = useCallback(
    () =>
      dispatch(
        openModal({
          name: forAggregatorEnabled ? ModalName.FiatOnRampAggregator : ModalName.FiatOnRamp,
        }),
      ),
    [dispatch, forAggregatorEnabled],
  )
  const onPressScan = useCallback(() => {
    // in case we received a pending session from a previous scan after closing modal
    dispatch(removePendingSession())
    dispatch(openModal({ name: ModalName.WalletConnectScan, initialState: ScannerModalState.ScanQr }))
  }, [dispatch])
  const onPressSend = useCallback(() => dispatch(openModal({ name: ModalName.Send })), [dispatch])
  const onPressReceive = useCallback(() => {
    dispatch(
      openModal(
        cexTransferProviders.length > 0
          ? { name: ModalName.ReceiveCryptoModal, initialState: cexTransferProviders }
          : { name: ModalName.WalletConnectScan, initialState: ScannerModalState.WalletQr },
      ),
    )
  }, [dispatch, cexTransferProviders])
  const onPressViewOnlyLabel = useCallback(() => dispatch(openModal({ name: ModalName.ViewOnlyExplainer })), [dispatch])

  // Hide actions when active account isn't a signer account.
  const isSignerAccount = activeAccount.type === AccountType.SignerMnemonic
  // Necessary to declare these as direct dependencies due to race condition with initializing react-i18next and useMemo
  const buyLabel = t('home.label.buy')
  const sendLabel = t('home.label.send')
  const receiveLabel = t('home.label.receive')
  const scanLabel = t('home.label.scan')

  const actions = useMemo(
    (): QuickAction[] => [
      {
        Icon: BuyIcon,
        eventName: MobileEventName.FiatOnRampQuickActionButtonPressed,
        iconScale: 1.2,
        label: buyLabel,
        name: ElementName.Buy,
        sentryLabel: 'BuyActionButton',
        onPress: onPressBuy,
      },
      {
        Icon: SendIcon,
        iconScale: 1.1,
        label: sendLabel,
        name: ElementName.Send,
        sentryLabel: 'SendActionButton',
        onPress: onPressSend,
      },
      {
        Icon: ReceiveIcon,
        label: receiveLabel,
        name: ElementName.Receive,
        sentryLabel: 'ReceiveActionButton',
        onPress: onPressReceive,
      },
      {
        Icon: ScanIcon,
        label: scanLabel,
        name: ElementName.WalletConnectScan,
        sentryLabel: 'ScanActionButton',
        onPress: onPressScan,
      },
    ],
    [buyLabel, sendLabel, scanLabel, receiveLabel, onPressBuy, onPressScan, onPressSend, onPressReceive],
  )

  const { canClaimUnitag } = useCanActiveAddressClaimUnitag()

  const shouldPromptUnitag =
    activeAccount.type === AccountType.SignerMnemonic && !hasSkippedUnitagPrompt && canClaimUnitag

  const { showExtensionPromoBanner } = useShowExtensionPromoBanner()
  const [showExtensionPromoModal, setShowExtensionPromoModal] = useState(false)

  const viewOnlyLabel = t('home.warning.viewOnly')

  const promoBanner = useMemo(() => {
    if (shouldPromptUnitag) {
      return (
        <AnimatedFlex entering={FadeIn} exiting={FadeOut}>
          <UnitagBanner address={activeAccount.address} entryPoint={MobileScreens.Home} />
        </AnimatedFlex>
      )
    } else if (showExtensionPromoBanner) {
      return (
        <AnimatedFlex entering={FadeIn} exiting={FadeOut}>
          <ExtensionPromoBanner onShowExtensionPromoModal={() => setShowExtensionPromoModal(true)} />
        </AnimatedFlex>
      )
    }
    return null
  }, [shouldPromptUnitag, showExtensionPromoBanner, activeAccount.address])

  const contentHeader = useMemo(() => {
    return (
      <Flex backgroundColor="$surface1" gap="$spacing8" pb="$spacing16" px="$spacing12">
        <AccountHeader />
        <Flex pb="$spacing8" px="$spacing12">
          <PortfolioBalance owner={activeAccount.address} />
        </Flex>
        {isSignerAccount ? (
          <QuickActions actions={actions} sentry-label="QuickActions" />
        ) : (
          <TouchableArea hapticFeedback mt="$spacing16" onPress={onPressViewOnlyLabel}>
            <Flex centered row backgroundColor="$surface2" borderRadius="$rounded12" minHeight={40} p="$spacing8">
              <Text allowFontScaling={false} color="$neutral2" variant="body2">
                {viewOnlyLabel}
              </Text>
            </Flex>
          </TouchableArea>
        )}
        {promoBanner}
      </Flex>
    )
  }, [activeAccount.address, isSignerAccount, actions, onPressViewOnlyLabel, viewOnlyLabel, promoBanner])

  const paddingTop = headerHeight + TAB_BAR_HEIGHT + TAB_STYLES.tabListInner.paddingTop
  const paddingBottom = insets.bottom + SWAP_BUTTON_HEIGHT + TAB_STYLES.tabListInner.paddingBottom + spacing.spacing12

  const contentContainerStyle = useMemo<StyleProp<ViewStyle>>(
    () => ({ paddingTop, paddingBottom }),
    [paddingTop, paddingBottom],
  )

  const emptyComponentStyle = useMemo<StyleProp<ViewStyle>>(
    () => ({
      minHeight: dimensions.fullHeight - (paddingTop + paddingBottom),
      paddingTop: spacing.none,
      paddingLeft: media.short ? spacing.none : spacing.spacing12,
      paddingRight: media.short ? spacing.none : spacing.spacing12,
    }),
    [dimensions.fullHeight, media.short, paddingBottom, paddingTop],
  )

  const sharedProps = useMemo<TabContentProps>(
    () => ({
      contentContainerStyle,
      emptyComponentStyle,
      onMomentumScrollEnd: sync,
      onScrollEndDrag: sync,
      scrollEventThrottle: TAB_VIEW_SCROLL_THROTTLE,
    }),
    [contentContainerStyle, emptyComponentStyle, sync],
  )

  const tabBarStyle = useMemo<StyleProp<ViewStyle>>(
    () => [{ top: headerHeight }, translatedStyle],
    [headerHeight, translatedStyle],
  )

  const headerContainerStyle = useMemo<StyleProp<ViewStyle>>(
    () => [TAB_STYLES.headerContainer, { paddingTop: insets.top }, translatedStyle],
    [insets.top, translatedStyle],
  )

  const statusBarStyle = useAnimatedStyle(() => ({
    backgroundColor: interpolateColor(
      currentScrollValue.value,
      [0, headerHeightDiff],
      [colors.surface1.val, colors.surface1.val],
    ),
  }))

  const apolloClient = useApolloClient()

  const renderTabBar = useCallback(
    (sceneProps: SceneRendererProps) => {
      const style: ViewStyle = { width: 'auto' }
      return (
        <>
          <Animated.View style={headerContainerStyle} onLayout={handleHeaderLayout}>
            {contentHeader}
          </Animated.View>

          {isLayoutReady && (
            <Animated.View entering={FadeIn} style={[TAB_STYLES.header, tabBarStyle]}>
              <TabBar
                {...sceneProps}
                indicatorStyle={TAB_STYLES.activeTabIndicator}
                navigationState={{ index: tabIndex, routes }}
                pressColor={colors.surface3.val} // Android only
                renderLabel={TabLabel}
                style={[
                  TAB_STYLES.tabBar,
                  {
                    backgroundColor: colors.surface1.get(),
                    borderBottomColor: colors.surface3.get(),
                    paddingLeft: spacing.spacing12,
                  },
                ]}
                tabStyle={style}
                onTabPress={async (): Promise<void> => {
                  await HapticFeedback.impact()
                }}
              />
            </Animated.View>
          )}
        </>
      )
    },
    [
      colors.surface1,
      colors.surface3,
      contentHeader,
      handleHeaderLayout,
      headerContainerStyle,
      isLayoutReady,
      routes,
      tabBarStyle,
      tabIndex,
    ],
  )

  const [refreshing, setRefreshing] = useState(false)

  const onRefreshHomeData = useCallback(async () => {
    setRefreshing(true)

    await apolloClient.refetchQueries({
      include: [
        ...TOKENS_TAB_DATA_DEPENDENCIES,
        ...NFTS_TAB_DATA_DEPENDENCIES,
        ...ACTIVITY_TAB_DATA_DEPENDENCIES,
        ...(showFeedTab ? FEED_TAB_DATA_DEPENDENCIES : []),
      ],
    })

    // Artificially delay 0.5 second to show the refresh animation
    const timeout = setTimeout(() => setRefreshing(false), 500)
    return () => clearTimeout(timeout)
  }, [apolloClient, showFeedTab])

  const renderTab = useCallback(
    ({
      route,
    }: {
      route: {
        key: SectionNameType
        title: string
      }
    }) => {
      switch (route?.key) {
        case SectionName.HomeTokensTab:
          return (
            <Freeze freeze={tabIndex !== 0 && isHomeScreenBlur}>
              {isLayoutReady && (
                <Animated.View entering={FadeIn}>
                  <TokensTab
                    ref={tokensTabScrollRef}
                    containerProps={sharedProps}
                    headerHeight={headerHeight}
                    owner={activeAccount?.address}
                    refreshing={refreshing}
                    scrollHandler={tokensTabScrollHandler}
                    onRefresh={onRefreshHomeData}
                  />
                </Animated.View>
              )}
            </Freeze>
          )
        case SectionName.HomeNFTsTab:
          return (
            <Freeze freeze={tabIndex !== 1 && isHomeScreenBlur}>
              <NftsTab
                ref={nftsTabScrollRef}
                containerProps={sharedProps}
                headerHeight={headerHeight}
                owner={activeAccount?.address}
                refreshing={refreshing}
                scrollHandler={nftsTabScrollHandler}
                onRefresh={onRefreshHomeData}
              />
            </Freeze>
          )
        case SectionName.HomeActivityTab:
          return (
            <Freeze freeze={tabIndex !== 2 && isHomeScreenBlur}>
              <ActivityTab
                ref={activityTabScrollRef}
                containerProps={sharedProps}
                headerHeight={headerHeight}
                owner={activeAccount?.address}
                refreshing={refreshing}
                scrollHandler={activityTabScrollHandler}
                onRefresh={onRefreshHomeData}
              />
            </Freeze>
          )
        case SectionName.HomeFeedTab:
          return (
            <FeedTab
              ref={feedTabScrollRef}
              containerProps={sharedProps}
              headerHeight={headerHeight}
              owner={activeAccount?.address}
              refreshing={refreshing}
              scrollHandler={feedTabScrollHandler}
              onRefresh={onRefreshHomeData}
            />
          )
      }
      return null
    },
    [
      tabIndex,
      isHomeScreenBlur,
      isLayoutReady,
      tokensTabScrollRef,
      sharedProps,
      headerHeight,
      activeAccount?.address,
      refreshing,
      tokensTabScrollHandler,
      onRefreshHomeData,
      nftsTabScrollRef,
      nftsTabScrollHandler,
      activityTabScrollRef,
      activityTabScrollHandler,
      feedTabScrollRef,
      feedTabScrollHandler,
    ],
  )

  // Hides lock screen on next js render cycle, ensuring this component is loaded when the screen is hidden
  useTimeout(hideSplashScreen, 1)

  return (
    <Screen edges={['left', 'right']}>
      <View style={TAB_STYLES.container}>
        <TraceTabView
          lazy
          initialLayout={{
            height: dimensions.fullHeight,
            width: dimensions.fullWidth,
          }}
          navigationState={{ index: tabIndex, routes }}
          renderScene={renderTab}
          renderTabBar={renderTabBar}
          screenName={MobileScreens.Home}
          onIndexChange={setTabIndex}
        />
      </View>
      <NavBar />
      <AnimatedFlex
        height={insets.top}
        position="absolute"
        style={statusBarStyle}
        top={0}
        width="100%"
        zIndex="$sticky"
      />
      {showExtensionPromoModal && <ExtensionPromoModal onClose={() => setShowExtensionPromoModal(false)} />}
    </Screen>
  )
}

type QuickAction = {
  Icon: React.FC<SvgProps>
  eventName?: MobileEventName
  iconScale?: number
  label: string
  name: ElementNameType
  sentryLabel: string
  onPress: () => void
}

function QuickActions({ actions }: { actions: QuickAction[] }): JSX.Element {
  return (
    <Flex centered row gap="$spacing12" px="$spacing12">
      {actions.map((action) => (
        <ActionButton
          key={action.name}
          Icon={action.Icon}
          eventName={action.eventName}
          flex={1}
          iconScale={action.iconScale}
          label={action.label}
          name={action.name}
          sentry-label={action.sentryLabel}
          onPress={action.onPress}
        />
      ))}
    </Flex>
  )
}

function ActionButton({
  eventName,
  name,
  Icon,
  onPress,
  flex,
  activeScale = 0.96,
  iconScale = 1,
}: {
  eventName?: MobileEventName
  name: ElementNameType
  label: string
  Icon: React.FC<SvgProps>
  onPress: () => void
  flex: number
  activeScale?: number
  iconScale?: number
}): JSX.Element {
  const colors = useSporeColors()
  const media = useMedia()
  const iconSize = media.short ? iconSizes.icon24 : iconSizes.icon28

  return (
    <Trace logPress element={name} eventOnTrigger={eventName}>
      <TouchableArea hapticFeedback flex={flex} scaleTo={activeScale} onPress={onPress}>
        <AnimatedFlex
          centered
          fill
          backgroundColor="$DEP_backgroundActionButton"
          borderRadius="$rounded20"
          p="$spacing16"
        >
          <Icon
            color={colors.accent1.get()}
            height={iconSize * iconScale}
            strokeWidth={2}
            width={iconSize * iconScale}
          />
        </AnimatedFlex>
      </TouchableArea>
    </Trace>
  )
}
