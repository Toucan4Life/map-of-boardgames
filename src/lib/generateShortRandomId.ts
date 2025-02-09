export default function generateShortRandomId(): string {
  return Math.random().toString(36).substr(2, 5)
}
