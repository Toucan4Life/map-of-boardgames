export default function getHighContrastColor(colorin: string | undefined, alpha = 0xaa): number {
  let color = 0
  if (colorin !== undefined && colorin[0] === '#') {
    color = parseInt(colorin.slice(1), 16)
    color = (color << 8) | 0xff
  } else {
    console.error('getHighContrastColor: color must be a number or a hex string', colorin)
    return 0xff000022 // Return red as fallback
  }

  const r = (color >> 24) & 0xff
  const g = (color >> 16) & 0xff
  const b = (color >> 8) & 0xff

  // Calculate relative luminance of input color
  const inputLuminance = calculateLuminance(r, g, b)

  // Define blue and purple colors
  const blueHue = 0.67 // 240°
  const purpleHue = 0.83 // 300°

  // Use high saturation and appropriate lightness for contrast
  const contrastSaturation = 1.0 // Maximum saturation
  const contrastLightness = inputLuminance > 0.5 ? 0.2 : 0.8 // Dark for bright input, bright for dark input

  // Generate blue and purple candidates
  const [blueR, blueG, blueB] = hslToRgb(blueHue, contrastSaturation, contrastLightness)
  const [purpleR, purpleG, purpleB] = hslToRgb(purpleHue, contrastSaturation, contrastLightness)

  // Calculate luminance for both candidates
  const blueLuminance = calculateLuminance(blueR, blueG, blueB)
  const purpleLuminance = calculateLuminance(purpleR, purpleG, purpleB)

  // White luminance is 1.0
  const whiteLuminance = 1.0

  // Calculate contrast ratios against input color
  const blueInputContrast = calculateContrastRatio(blueLuminance, inputLuminance)
  const purpleInputContrast = calculateContrastRatio(purpleLuminance, inputLuminance)

  // Calculate contrast ratios against white
  const blueWhiteContrast = calculateContrastRatio(blueLuminance, whiteLuminance)
  const purpleWhiteContrast = calculateContrastRatio(purpleLuminance, whiteLuminance)

  // Calculate combined contrast scores (minimum of both contrasts for each color)
  const blueScore = Math.min(blueInputContrast, blueWhiteContrast)
  const purpleScore = Math.min(purpleInputContrast, purpleWhiteContrast)

  // Choose the color with the higher minimum contrast
  const [finalR, finalG, finalB] = blueScore > purpleScore ? [blueR, blueG, blueB] : [purpleR, purpleG, purpleB]

  return ((finalR << 24) | (finalG << 16) | (finalB << 8) | alpha) >>> 0
}

function calculateContrastRatio(luminance1: number, luminance2: number): number {
  // WCAG contrast ratio formula: (L1 + 0.05) / (L2 + 0.05)
  // where L1 is the lighter color and L2 is the darker color
  const lighter = Math.max(luminance1, luminance2)
  const darker = Math.min(luminance1, luminance2)
  return (lighter + 0.05) / (darker + 0.05)
}

function calculateLuminance(r: number, g: number, b: number): number {
  // Convert RGB to sRGB
  const rsRGB = r / 255
  const gsRGB = g / 255
  const bsRGB = b / 255

  // Apply gamma correction
  const rLinear = rsRGB <= 0.03928 ? rsRGB / 12.92 : Math.pow((rsRGB + 0.055) / 1.055, 2.4)
  const gLinear = gsRGB <= 0.03928 ? gsRGB / 12.92 : Math.pow((gsRGB + 0.055) / 1.055, 2.4)
  const bLinear = bsRGB <= 0.03928 ? bsRGB / 12.92 : Math.pow((bsRGB + 0.055) / 1.055, 2.4)

  // Calculate relative luminance using WCAG coefficients
  return 0.2126 * rLinear + 0.7152 * gLinear + 0.0722 * bLinear
}

function rgbToHsl(r: number, g: number, b: number): number[] {
  r /= 255
  g /= 255
  b /= 255

  const max = Math.max(r, g, b),
    min = Math.min(r, g, b)
  let h, s
  const l = (max + min) / 2

  if (max == min) {
    h = s = 0 // achromatic
  } else {
    const d = max - min
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min)
    switch (max) {
      case r:
        h = (g - b) / d + (g < b ? 6 : 0)
        break
      case g:
        h = (b - r) / d + 2
        break
      default:
        h = (r - g) / d + 4
        break
    }
    h /= 6
  }

  return [h, s, l]
}

function hslToRgb(h: number, s: number, l: number): number[] {
  let r, g, b

  if (s == 0) {
    r = g = b = l // achromatic
  } else {
    const q = l < 0.5 ? l * (1 + s) : l + s - l * s
    const p = 2 * l - q
    r = hue2rgb(p, q, h + 1 / 3)
    g = hue2rgb(p, q, h)
    b = hue2rgb(p, q, h - 1 / 3)
  }

  return [Math.round(r * 255), Math.round(g * 255), Math.round(b * 255)]
}

function hue2rgb(p: number, q: number, t: number): number {
  if (t < 0) t += 1
  if (t > 1) t -= 1
  if (t < 1 / 6) return p + (q - p) * 6 * t
  if (t < 1 / 2) return q
  if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6
  return p
}
