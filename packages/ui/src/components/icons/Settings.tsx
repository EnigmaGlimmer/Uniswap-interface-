import { Path, Svg } from 'react-native-svg'

// eslint-disable-next-line no-relative-import-paths/no-relative-import-paths
import { createIcon } from '../factories/createIcon'

export const [Settings, AnimatedSettings] = createIcon({
  name: 'Settings',
  getIcon: (props) => (
    <Svg fill="none" height="24" viewBox="0 0 24 24" width="24" {...props}>
      <Path
        d="M22.7922 15.1778C21.6555 14.5178 20.9589 13.3078 20.9589 12C20.9589 10.6922 21.6555 9.48221 22.7922 8.82221C22.9878 8.69999 23.0611 8.45556 22.9389 8.26L20.8978 4.74C20.8244 4.60555 20.69 4.53224 20.5556 4.53224C20.4822 4.53224 20.4089 4.55667 20.3478 4.59334C19.7855 4.91111 19.15 5.08222 18.5144 5.08222C17.8667 5.08222 17.2311 4.9111 16.6567 4.5811C15.52 3.9211 14.8233 2.72333 14.8233 1.41555C14.8233 1.18333 14.64 1 14.42 1H9.57999C9.35999 1 9.17667 1.18333 9.17667 1.41555C9.17667 2.72333 8.48 3.9211 7.34334 4.5811C6.76889 4.9111 6.13335 5.08222 5.48557 5.08222C4.85002 5.08222 4.21446 4.91111 3.65224 4.59334C3.45668 4.47111 3.21222 4.54444 3.10222 4.74L1.0489 8.26C1.01223 8.32111 1 8.39445 1 8.45556C1 8.60223 1.07335 8.73666 1.20779 8.82221C2.34446 9.48221 3.04113 10.68 3.04113 11.9878C3.04113 13.3078 2.34444 14.5178 1.21999 15.1778H1.20779C1.01224 15.3 0.938874 15.5444 1.0611 15.74L3.10222 19.26C3.17556 19.3944 3.31 19.4678 3.44444 19.4678C3.51778 19.4678 3.59113 19.4433 3.65224 19.4067C4.80113 18.7589 6.20667 18.7589 7.34334 19.4189C8.46778 20.0789 9.16444 21.2767 9.16444 22.5844C9.16444 22.8167 9.34776 23 9.57999 23H14.42C14.64 23 14.8233 22.8167 14.8233 22.5844C14.8233 21.2767 15.52 20.0789 16.6567 19.4189C17.2311 19.0889 17.8667 18.9178 18.5144 18.9178C19.15 18.9178 19.7855 19.0889 20.3478 19.4067C20.5433 19.5289 20.7878 19.4556 20.8978 19.26L22.9511 15.74C22.9878 15.6789 23 15.6055 23 15.5444C23 15.3978 22.9267 15.2633 22.7922 15.1778ZM12 15.6667C9.97111 15.6667 8.33333 14.0289 8.33333 12C8.33333 9.97111 9.97111 8.33333 12 8.33333C14.0289 8.33333 15.6667 9.97111 15.6667 12C15.6667 14.0289 14.0289 15.6667 12 15.6667Z"
        fill="currentColor"
      />
    </Svg>
  ),
})
