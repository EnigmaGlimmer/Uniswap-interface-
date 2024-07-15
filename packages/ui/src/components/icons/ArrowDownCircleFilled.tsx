import { Path, Svg } from 'react-native-svg'

// eslint-disable-next-line no-relative-import-paths/no-relative-import-paths
import { createIcon } from '../factories/createIcon'

export const [ArrowDownCircleFilled, AnimatedArrowDownCircleFilled] = createIcon({
  name: 'ArrowDownCircleFilled',
  getIcon: (props) => (
    <Svg viewBox="0 0 29 28" fill="none" {...props}>
      <Path
        d="M14.8752 2.33301C8.43166 2.33301 3.2085 7.55617 3.2085 13.9997C3.2085 20.4432 8.43166 25.6663 14.8752 25.6663C21.3187 25.6663 26.5418 20.4432 26.5418 13.9997C26.5418 7.55617 21.3187 2.33301 14.8752 2.33301ZM18.9935 15.7847L15.4935 19.2847C15.413 19.3652 15.3163 19.4292 15.2101 19.4736C15.104 19.5179 14.9895 19.5413 14.8752 19.5413C14.7608 19.5413 14.6475 19.5179 14.5402 19.4736C14.4329 19.4292 14.3373 19.3652 14.2568 19.2847L10.7568 15.7847C10.415 15.4429 10.415 14.8887 10.7568 14.5468C11.0986 14.205 11.6528 14.205 11.9947 14.5468L14.0013 16.5535V9.33301C14.0013 8.85001 14.3933 8.45801 14.8763 8.45801C15.3593 8.45801 15.7513 8.85001 15.7513 9.33301V16.5535L17.7579 14.5468C18.0998 14.205 18.654 14.205 18.9958 14.5468C19.3376 14.8887 19.3354 15.4429 18.9935 15.7847Z"
        fill="currentColor"
      />
    </Svg>
  ),
})
