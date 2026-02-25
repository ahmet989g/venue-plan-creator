'use client'

// Canvas origin noktası — (0,0) koordinatını ince crosshair ile işaretler
// Scale prop olarak alınır, zoom'da görsel boyut sabit kalır

import { Group, Line } from 'react-konva';
import { useTheme } from '@/hooks/useTheme';

const ARM_LENGTH = 12

interface CenterMarkProps {
  scale: number
}

export default function CenterMark({ scale }: CenterMarkProps) {
  const arm = ARM_LENGTH / scale;
  const sw = 1 / scale;

  const { theme } = useTheme()
  const COLOR = theme === 'dark'
    ? 'rgba(255,255,255,0.3)'
    : 'rgba(0,0,0,0.3)'

  return (
    <Group listening={false} x={0} y={0}>
      <Line
        points={[-arm, 0, arm, 0]}
        stroke={COLOR}
        strokeWidth={sw}
        perfectDrawEnabled={false}
      />
      <Line
        points={[0, -arm, 0, arm]}
        stroke={COLOR}
        strokeWidth={sw}
        perfectDrawEnabled={false}
      />
    </Group>
  )
}