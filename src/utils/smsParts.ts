// Standard GSM-7 and Unicode estimates. Providers may transform the final text.
const basic = new Set(Array.from('@£$¥èéùìòÇ\nØø\rÅåΔ_ΦΓΛΩΠΨΣΘΞÆæßÉ !"#¤%&\'()*+,-./0123456789:;<=>?¡ABCDEFGHIJKLMNOPQRSTUVWXYZÄÖÑÜ§¿abcdefghijklmnopqrstuvwxyzäöñüà'))
const extended = new Set(Array.from('\f^{}\\[~]|€'))
export function smsParts(text: string) {
  const chars = Array.from(text)
  const gsm = chars.every(char => basic.has(char) || extended.has(char))
  const cost = (char: string) => gsm ? (extended.has(char) ? 2 : 1) : char.length
  const units = chars.reduce((sum, char) => sum + cost(char), 0)
  const capacity = units <= (gsm ? 160 : 70) ? (gsm ? 160 : 70) : (gsm ? 153 : 67)
  const parts: { text: string; units: number }[] = []
  for (const char of chars) {
    if (!parts.length || parts[parts.length - 1].units + cost(char) > capacity) parts.push({ text: '', units: 0 })
    const part = parts[parts.length - 1]
    part.text += char; part.units += cost(char)
  }
  return { parts, units, capacity, encoding: gsm ? 'GSM-7' : 'Unicode', remaining: capacity - (parts.at(-1)?.units || 0) }
}
