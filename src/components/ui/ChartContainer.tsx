import { useEffect, useRef, useState, type ReactNode } from 'react'

type ChartSize = {
  width: number
  height: number
}

type ChartContainerProps = {
  className?: string
  children: ReactNode | ((size: ChartSize) => ReactNode)
}

export function ChartContainer({ className, children }: ChartContainerProps) {
  const containerRef = useRef<HTMLDivElement | null>(null)
  const [size, setSize] = useState<ChartSize>({ width: 0, height: 0 })

  useEffect(() => {
    const element = containerRef.current
    if (!element) {
      return
    }

    const update = () => {
      setSize({ width: element.clientWidth, height: element.clientHeight })
    }

    update()

    const observer = new ResizeObserver(() => update())
    observer.observe(element)

    return () => observer.disconnect()
  }, [])

  const isReady = size.width > 0 && size.height > 0

  return <div ref={containerRef} className={className}>{isReady ? typeof children === 'function' ? children(size) : children : null}</div>
}