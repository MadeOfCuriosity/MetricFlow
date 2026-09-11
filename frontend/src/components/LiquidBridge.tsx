interface LiquidBridgeProps {
  className?: string
  width?: number
  height?: number
  waistDepth?: number
  orientation?: 'horizontal' | 'vertical'
}

export function LiquidBridge({
  className = '',
  width,
  height,
  waistDepth = 11,
  orientation = 'horizontal',
}: LiquidBridgeProps) {
  const isVertical = orientation === 'vertical'
  const actualWidth = width ?? (isVertical ? 48 : 20)
  const actualHeight = height ?? (isVertical ? 20 : 48)

  if (isVertical) {
    const halfH = actualHeight / 2
    const cH1 = actualHeight * 0.3
    const cH2 = actualHeight * 0.7
    const waistLeft = waistDepth
    const waistRight = actualWidth - waistDepth

    // Continuous cubic bezier path for the solid waist (vertical)
    const fillPath = `
      M 0 0
      L ${actualWidth} 0
      C ${actualWidth} ${cH1}, ${waistRight} ${cH1}, ${waistRight} ${halfH}
      C ${waistRight} ${cH2}, ${actualWidth} ${cH2}, ${actualWidth} ${actualHeight}
      L 0 ${actualHeight}
      C 0 ${cH2}, ${waistLeft} ${cH2}, ${waistLeft} ${halfH}
      C ${waistLeft} ${cH1}, 0 ${cH1}, 0 0
      Z
    `.trim()

    const leftStroke = `
      M 0.5 0
      C 0.5 ${cH1}, ${waistLeft + 0.5} ${cH1}, ${waistLeft + 0.5} ${halfH}
      C ${waistLeft + 0.5} ${cH2}, 0.5 ${cH2}, 0.5 ${actualHeight}
    `.trim()

    const rightStroke = `
      M ${actualWidth - 0.5} 0
      C ${actualWidth - 0.5} ${cH1}, ${waistRight - 0.5} ${cH1}, ${waistRight - 0.5} ${halfH}
      C ${waistRight - 0.5} ${cH2}, ${actualWidth - 0.5} ${cH2}, ${actualWidth - 0.5} ${actualHeight}
    `.trim()

    return (
      <svg
        width={actualWidth}
        height={actualHeight}
        viewBox={`0 0 ${actualWidth} ${actualHeight}`}
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className={`flex-shrink-0 -my-[1px] relative z-10 pointer-events-none ${className}`}
        style={{
          width: `${actualWidth}px`,
          height: `${actualHeight}px`,
        }}
      >
        {/* Body fill */}
        <path
          d={fillPath}
          className="fill-dark-900"
          style={{ fill: 'rgb(var(--color-dark-900))' }}
        />
        {/* Left contour stroke */}
        <path
          d={leftStroke}
          fill="none"
          strokeWidth="1"
          className="stroke-dark-700"
          style={{ stroke: 'rgb(var(--color-dark-700))' }}
        />
        {/* Right contour stroke */}
        <path
          d={rightStroke}
          fill="none"
          strokeWidth="1"
          className="stroke-dark-700"
          style={{ stroke: 'rgb(var(--color-dark-700))' }}
        />
      </svg>
    )
  }

  // Horizontal (default)
  const halfW = actualWidth / 2
  const cW1 = actualWidth * 0.3
  const cW2 = actualWidth * 0.7
  const waistTop = waistDepth
  const waistBottom = actualHeight - waistDepth

  // Continuous cubic bezier path for the solid waist
  const fillPath = `
    M 0 0
    C ${cW1} 0, ${cW1} ${waistTop}, ${halfW} ${waistTop}
    C ${cW2} ${waistTop}, ${cW2} 0, ${actualWidth} 0
    L ${actualWidth} ${actualHeight}
    C ${cW2} ${actualHeight}, ${cW2} ${waistBottom}, ${halfW} ${waistBottom}
    C ${cW1} ${waistBottom}, ${cW1} ${actualHeight}, 0 ${actualHeight}
    Z
  `.trim()

  const topStroke = `
    M 0 0.5
    C ${cW1} 0.5, ${cW1} ${waistTop + 0.5}, ${halfW} ${waistTop + 0.5}
    C ${cW2} ${waistTop + 0.5}, ${cW2} 0.5, ${actualWidth} 0.5
  `.trim()

  const bottomStroke = `
    M 0 ${actualHeight - 0.5}
    C ${cW1} ${actualHeight - 0.5}, ${cW1} ${waistBottom - 0.5}, ${halfW} ${waistBottom - 0.5}
    C ${cW2} ${waistBottom - 0.5}, ${cW2} ${actualHeight - 0.5}, ${actualWidth} ${actualHeight - 0.5}
  `.trim()

  return (
    <svg
      width={actualWidth}
      height={actualHeight}
      viewBox={`0 0 ${actualWidth} ${actualHeight}`}
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={`flex-shrink-0 -mx-[1px] relative z-10 pointer-events-none ${className}`}
      style={{
        width: `${actualWidth}px`,
        height: `${actualHeight}px`,
      }}
    >
      {/* Body fill */}
      <path
        d={fillPath}
        className="fill-dark-900"
        style={{ fill: 'rgb(var(--color-dark-900))' }}
      />
      {/* Top contour stroke */}
      <path
        d={topStroke}
        fill="none"
        strokeWidth="1"
        className="stroke-dark-700"
        style={{ stroke: 'rgb(var(--color-dark-700))' }}
      />
      {/* Bottom contour stroke */}
      <path
        d={bottomStroke}
        fill="none"
        strokeWidth="1"
        className="stroke-dark-700"
        style={{ stroke: 'rgb(var(--color-dark-700))' }}
      />
    </svg>
  )
}
