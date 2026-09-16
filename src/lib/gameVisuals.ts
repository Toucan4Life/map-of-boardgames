/** Pure formatting/visual-mapping helpers for rendering game search results. */

export function formatCompactCount(value: number): string {
  return value >= 1000 ? `${Math.round(value / 1000).toString()}k` : value.toString()
}

export type WeightShape = 'circle' | 'triangle' | 'diamond' | 'star'

export function getShapeForWeight(weight?: number): WeightShape {
  if (!weight || weight < 2) return 'circle'
  if (weight < 3) return 'triangle'
  if (weight < 4) return 'diamond'
  return 'star'
}

// Rating -> CSS variable, in ascending threshold order.
const RATING_COLOR_THRESHOLDS: [threshold: number, color: string][] = [
  [5.1, 'var(--rating-1)'],
  [5.6, 'var(--rating-2)'],
  [5.9, 'var(--rating-3)'],
  [6.2, 'var(--rating-4)'],
  [6.4, 'var(--rating-5)'],
  [6.7, 'var(--rating-6)'],
  [6.9, 'var(--rating-7)'],
  [7.2, 'var(--rating-8)'],
  [7.6, 'var(--rating-9)'],
]

export function getColorForRating(rating?: number): string {
  if (!rating) return 'var(--rating-1)'
  for (const [threshold, color] of RATING_COLOR_THRESHOLDS) {
    if (rating < threshold) return color
  }
  return 'var(--rating-10)'
}
