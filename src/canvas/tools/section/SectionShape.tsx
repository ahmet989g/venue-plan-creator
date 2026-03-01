'use client'

// Section shape bileşeni — polygon (bezier destekli) veya rect render eder
//
// getSelfRect override (KRİTİK):
//   Transformer, bağlandığı node'un getSelfRect() metodunu çağırır.
//   react-konva prop olarak geçilen getSelfRect'i attrs'a yazar, metoda değil.
//   Bu yüzden Group ve Shape node'larına useEffect+ref ile imperatively override edilir.
//   Aksi takdirde Transformer bbox'ı (0,0) sanır → border canvas merkezinde çıkar.

import { memo, useCallback, useMemo, useRef, useEffect } from 'react'
import { Group, Shape, Rect, Text } from 'react-konva'
import type Konva from 'konva'
import type { KonvaEventObject } from 'konva/lib/Node'
import type { Section, SectionEdge, Row } from '@/store/types'
import { darkenColor, hexToRgba } from '@/lib/colorUtils'
import SectionRowStripe from '@/canvas/tools/section/SectionRowStripe'

function isDarkTheme(): boolean {
  return document.documentElement.getAttribute('data-theme') === 'dark'
}

function getBorderColor(
  isSelected: boolean,
  isEditing: boolean,
  fillColor?: string,   // Section fill rengi — border için otomatik koyulaştırılır
): string {
  const dark = isDarkTheme()
  if (isEditing) return dark ? 'rgba(230,180,100,0.9)' : 'rgba(180,120,40,0.9)'
  if (isSelected) return dark ? 'rgba(220,220,220,0.95)' : 'rgba(30,30,30,0.95)'
  // Fill rengi varsa → %25 karart, border rengi olarak kullan
  if (fillColor) return darkenColor(fillColor, 0.25)
  return dark ? 'rgba(100,110,130,0.7)' : 'rgba(130,140,160,0.65)'
}

function getBBox(section: Section) {
  if (section.shape === 'rect') {
    return { x: section.x ?? 0, y: section.y ?? 0, w: section.width ?? 0, h: section.height ?? 0 }
  }
  const pts = section.points ?? []
  if (pts.length === 0) return { x: 0, y: 0, w: 0, h: 0 }
  let minX = Infinity, maxX = -Infinity
  let minY = Infinity, maxY = -Infinity
  for (const p of pts) {
    minX = Math.min(minX, p.x); maxX = Math.max(maxX, p.x)
    minY = Math.min(minY, p.y); maxY = Math.max(maxY, p.y)
  }
  return { x: minX, y: minY, w: maxX - minX, h: maxY - minY }
}

interface SectionShapeProps {
  section: Section
  isSelected: boolean
  isEditing: boolean
  listening?: boolean
  blockRows?: Row[]
  isDark?: boolean
  onSelect: (sectionId: string) => void
  onEnter: (sectionId: string) => void
  onDragStart: (e: MouseEvent, sectionId: string) => void
}

function SectionShape({
  section,
  isSelected,
  isEditing,
  listening = true,
  blockRows = [],
  isDark = false,
  onSelect,
  onEnter,
  onDragStart,
}: SectionShapeProps) {
  const bbox = useMemo(() => getBBox(section), [section])

  // ─── getSelfRect imperative override ──────────────────────────────────────
  // Transformer, node.getSelfRect() metodunu direkt çağırır.
  // react-konva prop olarak geçileni node.attrs'a yazar, metodu override etmez.
  // Bu yüzden ref üzerinden node'un getSelfRect metodunu override ediyoruz.
  const groupRef = useRef<Konva.Group | null>(null)
  const shapeRef = useRef<Konva.Shape | null>(null)

  useEffect(() => {
    const selfRect = () => ({ x: bbox.x, y: bbox.y, width: bbox.w, height: bbox.h })
    // Group override — Transformer Group'a bağlandığı için burası kritik
    if (groupRef.current) {
      groupRef.current.getSelfRect = selfRect
    }
    // Shape override — Group.getClientRect() children'dan hesaplarken kullanır
    if (shapeRef.current) {
      shapeRef.current.getSelfRect = selfRect
    }
  }, [bbox])

  // ─── Görsel ───────────────────────────────────────────────────────────────

  const dark = isDarkTheme()
  const fillOpacity = isSelected ? 0.35 : isEditing ? 0.15 : 0.25
  // section.color varsa hexToRgba ile fill, yoksa tema default'u
  const fill = section.color
    ? hexToRgba(section.color, fillOpacity)
    : dark
      ? `rgba(255,255,255,${fillOpacity})`
      : `rgba(0,0,0,${fillOpacity})`
  const stroke = getBorderColor(isSelected, isEditing, section.color)
  const strokeWidth = isSelected ? 3.5 : 3

  // ─── Event handlers ───────────────────────────────────────────────────────

  const handleMouseDown = useCallback(
    (e: KonvaEventObject<MouseEvent>) => {
      if (section.isLocked) return
      e.cancelBubble = true
      onDragStart(e.evt, section.id)
    },
    [section.id, section.isLocked, onDragStart],
  )

  const handleClick = useCallback(
    (e: KonvaEventObject<MouseEvent>) => {
      e.cancelBubble = true
      onSelect(section.id)
    },
    [section.id, onSelect],
  )

  const handleDblClick = useCallback(
    (e: KonvaEventObject<MouseEvent>) => {
      e.cancelBubble = true
      onEnter(section.id)
    },
    [section.id, onEnter],
  )

  // ─── Bezier sceneFunc ─────────────────────────────────────────────────────

  const drawSceneFunc = useCallback(
    (ctx: Konva.Context, shape: Konva.Shape) => {
      const pts = section.points ?? []
      const edges = section.edges ?? []
      if (pts.length < 2) return

      ctx.beginPath()
      ctx.moveTo(pts[0].x, pts[0].y)

      for (let i = 0; i < pts.length; i++) {
        const next = pts[(i + 1) % pts.length]
        const edge: SectionEdge | undefined = edges[i]
        if (edge?.isCurved) {
          ctx.quadraticCurveTo(edge.cpx, edge.cpy, next.x, next.y)
        } else {
          ctx.lineTo(next.x, next.y)
        }
      }

      ctx.closePath()
      ctx.fillStrokeShape(shape)
    },
    [section.points, section.edges],
  )

  // ─── Label ────────────────────────────────────────────────────────────────

  const labelX = bbox.x + (bbox.w * (section.labelX ?? 50)) / 100
  const labelY = bbox.y + (bbox.h * (section.labelY ?? 50)) / 100

  if (!section.isVisible) return null

  return (
    <Group ref={groupRef} id={section.id} listening={listening}>

      {/* Polygon — bezier destekli */}
      {section.shape === 'polygon' && (section.points?.length ?? 0) >= 2 && (
        <Shape
          ref={shapeRef}
          sceneFunc={drawSceneFunc}
          fill={fill}
          stroke={stroke}
          strokeWidth={strokeWidth}
          onMouseDown={handleMouseDown}
          onClick={handleClick}
          onDblClick={handleDblClick}
          onTap={handleClick}
          perfectDrawEnabled={false}
        />
      )}

      {/* Rect */}
      {section.shape === 'rect' && (
        <Rect
          x={section.x}
          y={section.y}
          width={section.width}
          height={section.height}
          fill={fill}
          stroke={stroke}
          strokeWidth={strokeWidth}
          onMouseDown={handleMouseDown}
          onClick={handleClick}
          onDblClick={handleDblClick}
          onTap={handleClick}
          perfectDrawEnabled={false}
        />
      )}

      {/* Label — wrap="none" ile tek satır, fontSize büyüyünce taşmaz */}
      {(section.labelVisible !== false) && section.label && !isEditing ? (
        <Text
          x={labelX}
          y={labelY}
          text={section.label}
          fontSize={section.labelFontSize ?? 14}
          fontStyle="bold"
          // section.color varsa koyu tonu label'a ata, yoksa tema default'u
          fill={
            section.color
              ? darkenColor(section.color, 0.30)
              : dark ? 'rgba(220,220,220,0.9)' : 'rgba(20,20,20,0.9)'
          }
          rotation={section.labelRotation ?? 0}
          align="center"
          verticalAlign="middle"
          wrap="none"          // Satır kaymasını engelle
          width={400}          // Geniş alan — wrap="none" ile asla kullanılmaz
          offsetX={200}        // width/2 — yatay ortalama
          offsetY={(section.labelFontSize ?? 14) / 2}  // Dikey ortalama
          listening={false}
          perfectDrawEnabled={false}
        />
      ) : null}

      {/* Block mod stripe önizleme */}
      {blockRows.map((row) => (
        <SectionRowStripe key={row.id} row={row} isDark={isDark} />
      ))}

    </Group>
  )
}

export default memo(SectionShape)