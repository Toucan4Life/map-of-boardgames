export default function generateShortRandomId(): string {
  return Math.random().toString(36).substring(2, 5)
}
