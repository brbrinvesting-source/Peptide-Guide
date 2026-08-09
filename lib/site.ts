export function siteUrl(): string {
  return (
    process.env.NEXT_PUBLIC_SITE_URL ||
    process.env.URL || // Netlify
    'http://localhost:3000'
  ).replace(/\/$/, '')
}

export function absoluteUrl(pathname: string): string {
  return `${siteUrl()}${pathname.startsWith('/') ? pathname : `/${pathname}`}`
}
