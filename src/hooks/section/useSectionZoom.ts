'use client'

// Section zoom animasyonu
// editingContext değişince stage'i section bbox'ına smooth animate eder
// Context çıkınca previousViewport'a döner

import { useEffect, useRef } from 'react'
import type Konva from 'konva'
import { useEditorStore } from '@/store/editor.store'
import type { Section, Point } from '@/store/types'

const ZOOM_PADDING  = 80   // Etrafında bırakılan boşluk (px)
const ANIM_DURATION = 380  // ms
const ANIM_EASING   = cubicOut

// ─── Yardımcı ────────────────────────────────────────────────────────────────

function cubicOut(t: number): number {
  return 1 - Math.pow(1 - t, 3)
}

/** Section'ın dünya koordinatındaki bounding box'ını hesapla */
function getSectionBBox(section: Section): { x: number; y: number; w: number; h: number } {
  if (section.shape === 'rect') {
    return {
      x: section.x ?? 0,
      y: section.y ?? 0,
      w: section.width  ?? 100,
      h: section.height ?? 100,
    }
  }

  // Polygon
  const pts = section.points ?? []
  if (pts.length === 0) return { x: 0, y: 0, w: 100, h: 100 }

  let minX = Infinity, maxX = -Infinity
  let minY = Infinity, maxY = -Infinity
  for (const p of pts) {
    minX = Math.min(minX, p.x)
    maxX = Math.max(maxX, p.x)
    minY = Math.min(minY, p.y)
    maxY = Math.max(maxY, p.y)
  }

  return { x: minX, y: minY, w: maxX - minX, h: maxY - minY }
}

/** Section bbox'ını stage'in merkezine getiren viewport değerlerini hesapla */
function computeTargetViewport(
  section: Section,
  stageW:  number,
  stageH:  number,
): { x: number; y: number; scale: number } {
  const bbox = getSectionBBox(section)

  const scaleX = (stageW - ZOOM_PADDING * 2) / bbox.w
  const scaleY = (stageH - ZOOM_PADDING * 2) / bbox.h
  const scale  = Math.min(scaleX, scaleY, 4)  // max zoom 4x

  const x = stageW / 2 - (bbox.x + bbox.w / 2) * scale
  const y = stageH / 2 - (bbox.y + bbox.h / 2) * scale

  return { x, y, scale }
}

// ─── Hook ────────────────────────────────────────────────────────────────────

export function useSectionZoom(
  stageRef: React.RefObject<Konva.Stage | null>,
) {
  const animRef = useRef<{ raf: number; startTime: number } | null>(null)

  useEffect(() => {
    return useEditorStore.subscribe(
      (s) => s.editingContext,
      (context, prev) => {
        const stage = stageRef.current
        if (!stage) return

        // Devam eden animasyonu durdur
        if (animRef.current) {
          cancelAnimationFrame(animRef.current.raf)
          animRef.current = null
        }

        if (context?.type === 'section') {
          // Context girişi → section'a zoom in
          const floor = useEditorStore.getState().chart?.floors.find(
            (f) => f.id === context.floorId,
          )
          const section = floor?.sections.find((s) => s.id === context.sectionId)
          if (!section) return

          const target  = computeTargetViewport(section, stage.width(), stage.height())
          const fromX   = stage.x()
          const fromY   = stage.y()
          const fromS   = stage.scaleX()

          animate(stage, { x: fromX, y: fromY, scale: fromS }, target, animRef)

        } else if (!context && prev?.type === 'section') {
          // Context çıkışı → previousViewport'a zoom out
          const prevVP = prev.previousViewport
          const fromX  = stage.x()
          const fromY  = stage.y()
          const fromS  = stage.scaleX()

          animate(
            stage,
            { x: fromX, y: fromY, scale: fromS },
            { x: prevVP.x, y: prevVP.y, scale: prevVP.scale },
            animRef,
          )
        }
      },
    )
  }, [stageRef])
}

// ─── Animasyon Fonksiyonu ─────────────────────────────────────────────────────

function animate(
  stage:    Konva.Stage,
  from:     { x: number; y: number; scale: number },
  to:       { x: number; y: number; scale: number },
  animRef:  React.MutableRefObject<{ raf: number; startTime: number } | null>,
) {
  const startTime = performance.now()

  const tick = (now: number) => {
    const elapsed = now - startTime
    const t       = Math.min(elapsed / ANIM_DURATION, 1)
    const ease    = ANIM_EASING(t)

    const x     = from.x     + (to.x     - from.x)     * ease
    const y     = from.y     + (to.y     - from.y)     * ease
    const scale = from.scale + (to.scale - from.scale) * ease

    stage.scale({ x: scale, y: scale })
    stage.position({ x, y })
    stage.getLayers().forEach((l) => l.batchDraw())

    if (t < 1) {
      animRef.current = {
        raf:       requestAnimationFrame(tick),
        startTime,
      }
    } else {
      // Animasyon bitti — store'u güncelle
      useEditorStore.getState().setViewport({ x: to.x, y: to.y, scale: to.scale })
      animRef.current = null
    }
  }

  animRef.current = { raf: requestAnimationFrame(tick), startTime }
}