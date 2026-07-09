export function getDriveImageUrl(url?: string | null) {
  if (!url) return ''

  const trimmed = url.trim()
  const fileMatch = trimmed.match(/\/file\/d\/([^/]+)/)
  const idParamMatch = trimmed.match(/[?&]id=([^&]+)/)
  const id = fileMatch?.[1] || idParamMatch?.[1]

  if (id) {
    return `https://drive.google.com/uc?export=view&id=${id}`
  }

  return trimmed
}
