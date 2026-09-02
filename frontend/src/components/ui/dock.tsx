import {
  motion,
  MotionValue,
  useMotionValue,
  useSpring,
  useTransform,
  type SpringOptions,
  AnimatePresence,
} from 'framer-motion'
import {
  Children,
  cloneElement,
  createContext,
  isValidElement,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react'
import { cn } from '../../lib/utils'

const DOCK_THICKNESS = 128
const DEFAULT_MAGNIFICATION = 96
const DEFAULT_DISTANCE = 150
const DEFAULT_PANEL_HEIGHT = 72
const DEFAULT_BASE_ITEM_SIZE = 56

type Orientation = 'horizontal' | 'vertical'

type DockProps = {
  children: React.ReactNode
  className?: string
  distance?: number
  panelHeight?: number
  magnification?: number
  baseItemSize?: number
  spring?: SpringOptions
  orientation?: Orientation
}
type DockItemProps = {
  className?: string
  children: React.ReactNode
  onClick?: () => void
  'aria-label'?: string
}
type DockLabelProps = {
  className?: string
  children: React.ReactNode
}
type DockIconProps = {
  className?: string
  children: React.ReactNode
}
type DockActiveIndicatorProps = {
  className?: string
}

type DocContextType = {
  mousePos: MotionValue
  spring: SpringOptions
  magnification: number
  distance: number
  baseItemSize: number
  orientation: Orientation
}
type DockProviderProps = {
  children: React.ReactNode
  value: DocContextType
}

const DockContext = createContext<DocContextType | undefined>(undefined)

function DockProvider({ children, value }: DockProviderProps) {
  return <DockContext.Provider value={value}>{children}</DockContext.Provider>
}

function useDock() {
  const context = useContext(DockContext)
  if (!context) {
    throw new Error('useDock must be used within an DockProvider')
  }
  return context
}

function Dock({
  children,
  className,
  spring = { mass: 0.1, stiffness: 150, damping: 12 },
  magnification = DEFAULT_MAGNIFICATION,
  distance = DEFAULT_DISTANCE,
  panelHeight = DEFAULT_PANEL_HEIGHT,
  baseItemSize = DEFAULT_BASE_ITEM_SIZE,
  orientation = 'horizontal',
}: DockProps) {
  const mousePos = useMotionValue(Infinity)
  const isHovered = useMotionValue(0)
  const isHorizontal = orientation === 'horizontal'

  const maxThickness = useMemo(() => {
    return Math.max(DOCK_THICKNESS, magnification + magnification / 2 + 4)
  }, [magnification])

  const thicknessRow = useTransform(isHovered, [0, 1], [panelHeight, maxThickness])
  const thickness = useSpring(thicknessRow, spring)

  return (
    <motion.div
      style={
        isHorizontal
          ? { height: thickness, scrollbarWidth: 'none' }
          : { width: thickness, scrollbarWidth: 'none' }
      }
      className={cn(
        'flex max-w-full max-h-full',
        isHorizontal ? 'mx-2 items-end overflow-x-auto' : 'my-2 flex-col items-start overflow-y-auto'
      )}
    >
      <motion.div
        onMouseMove={({ pageX, pageY }) => {
          isHovered.set(1)
          mousePos.set(isHorizontal ? pageX : pageY)
        }}
        onMouseLeave={() => {
          isHovered.set(0)
          mousePos.set(Infinity)
        }}
        className={cn(
          'flex items-center rounded-2xl bg-dark-900 border border-dark-700 shadow-card',
          isHorizontal ? 'mx-auto w-fit gap-2 px-3' : 'my-auto h-fit flex-col gap-2 py-3',
          className
        )}
        style={isHorizontal ? { height: panelHeight } : { width: panelHeight }}
        role="toolbar"
        aria-label="Application dock"
      >
        <DockProvider value={{ mousePos, spring, distance, magnification, baseItemSize, orientation }}>
          {children}
        </DockProvider>
      </motion.div>
    </motion.div>
  )
}

function DockItem({ children, className, onClick, ...rest }: DockItemProps) {
  const ref = useRef<HTMLDivElement>(null)

  const { distance, magnification, mousePos, spring, baseItemSize, orientation } = useDock()
  const isHorizontal = orientation === 'horizontal'

  const isHovered = useMotionValue(0)

  const mouseDistance = useTransform(mousePos, (val) => {
    const domRect = ref.current?.getBoundingClientRect() ?? { x: 0, y: 0, width: 0, height: 0 }
    const center = isHorizontal ? domRect.x + domRect.width / 2 : domRect.y + domRect.height / 2
    return val - center
  })

  const sizeTransform = useTransform(
    mouseDistance,
    [-distance, 0, distance],
    [baseItemSize, magnification, baseItemSize]
  )

  const size = useSpring(sizeTransform, spring)

  return (
    <motion.div
      ref={ref}
      style={isHorizontal ? { width: size } : { height: size }}
      onHoverStart={() => isHovered.set(1)}
      onHoverEnd={() => isHovered.set(0)}
      onFocus={() => isHovered.set(1)}
      onBlur={() => isHovered.set(0)}
      onClick={onClick}
      className={cn(
        'relative inline-flex items-center justify-center outline-none focus-visible:ring-2 focus-visible:ring-dark-600',
        onClick && 'cursor-pointer',
        className
      )}
      tabIndex={0}
      role="button"
      {...rest}
    >
      {Children.map(children, (child) =>
        isValidElement(child) ? cloneElement(child, { size, isHovered, orientation } as object) : child
      )}
    </motion.div>
  )
}

function DockLabel({ children, className, ...rest }: DockLabelProps) {
  const restProps = rest as Record<string, unknown>
  const isHovered = restProps['isHovered'] as MotionValue<number>
  const orientation = (restProps['orientation'] as Orientation) ?? 'horizontal'
  const isHorizontal = orientation === 'horizontal'
  const [isVisible, setIsVisible] = useState(false)

  useEffect(() => {
    const unsubscribe = isHovered.on('change', (latest) => {
      setIsVisible(latest === 1)
    })

    return () => unsubscribe()
  }, [isHovered])

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={isHorizontal ? { opacity: 0, y: 0 } : { opacity: 0, x: 0 }}
          animate={isHorizontal ? { opacity: 1, y: -12 } : { opacity: 1, x: 8 }}
          exit={isHorizontal ? { opacity: 0, y: 0 } : { opacity: 0, x: 0 }}
          transition={{ duration: 0.2 }}
          className={cn(
            'absolute w-fit whitespace-pre rounded-lg border border-dark-600 bg-dark-800 px-2.5 py-1 text-xs font-medium text-foreground shadow-card',
            isHorizontal ? '-top-8 left-1/2' : 'left-full top-1/2',
            className
          )}
          role="tooltip"
          style={isHorizontal ? { x: '-50%' } : { y: '-50%' }}
        >
          {children}
        </motion.div>
      )}
    </AnimatePresence>
  )
}

function DockIcon({ children, className, ...rest }: DockIconProps) {
  const restProps = rest as Record<string, unknown>
  const size = restProps['size'] as MotionValue<number>

  const sizeTransform = useTransform(size, (val) => val * 0.6)

  return (
    <motion.div
      style={{ width: sizeTransform }}
      className={cn('flex items-center justify-center', className)}
    >
      {children}
    </motion.div>
  )
}

function DockActiveIndicator({ className, ...rest }: DockActiveIndicatorProps) {
  const restProps = rest as Record<string, unknown>
  const orientation = (restProps['orientation'] as Orientation) ?? 'horizontal'
  const isHorizontal = orientation === 'horizontal'

  return (
    <span
      className={cn(
        'absolute h-1 w-1 rounded-full bg-foreground',
        isHorizontal ? '-bottom-1.5 left-1/2 -translate-x-1/2' : '-right-1.5 top-1/2 -translate-y-1/2',
        className
      )}
    />
  )
}

export { Dock, DockIcon, DockItem, DockLabel, DockActiveIndicator }
