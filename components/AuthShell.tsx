import { LogoImage, Tagline } from './Logo'

export function AuthShell({
  title,
  subtitle,
  children,
}: {
  title: string
  subtitle?: React.ReactNode
  children: React.ReactNode
}) {
  return (
    <div className="hex-texture flex min-h-[70vh] items-center justify-center px-4 py-16">
      <div className="w-full max-w-md">
        <div className="mb-8 text-center">
          <div className="mx-auto mb-3 flex justify-center">
            <LogoImage height={72} priority />
          </div>
          <Tagline className="mb-3" />
          <h1 className="text-2xl font-bold tracking-tight">{title}</h1>
          {subtitle && <div className="mt-2 text-sm text-muted">{subtitle}</div>}
        </div>
        <div className="panel p-6 sm:p-8">{children}</div>
      </div>
    </div>
  )
}
