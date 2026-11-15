import { Lock } from 'lucide-react'
import { LinkCheckStatus } from '@/lib/link-check'
import { SiteIcon } from './SiteIcon'

interface LinkCardProps {
  title: string
  url: string
  property: number
  description?: string
  checkStatus?: number
}

const BROKEN_LABEL = '链接可能已失效'

export interface LinkContextData {
  id: number
  title: string
  url: string
}

export function LinkCard({ title, url, property, description, checkStatus }: LinkCardProps) {
  const isPrivate = property === 1
  // Only failures are flagged: healthy is the norm, and "unknown" is mostly WAF-blocked sites that open fine in a browser.
  const isBroken = checkStatus === LinkCheckStatus.Broken

  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      title={description?.trim() ? `${title}\n${description.trim()}` : undefined}
      className="block min-w-0 no-underline text-inherit hover:text-inherit focus:text-inherit visited:text-inherit"
    >
      <div className="link-line relative h-14 w-full px-4 flex items-center gap-3 overflow-visible">
        {isPrivate && <div className="angle"><span /></div>}
        <span className="relative flex shrink-0">
          <SiteIcon title={title} url={url} />
          {isBroken && (
            <span
              title={BROKEN_LABEL}
              className="absolute -bottom-[3px] -right-[3px] h-[7px] w-[7px] rounded-full bg-red-500 ring-2 ring-[var(--surface-card-solid)]"
            >
              <span className="sr-only">{BROKEN_LABEL}</span>
            </span>
          )}
        </span>
        <span className="text-[15px] font-semibold text-ink-body whitespace-nowrap overflow-hidden text-ellipsis flex-1">
          {title}
        </span>
        {isPrivate && (
          <Lock className="w-3.5 h-3.5 text-[#5fb878] shrink-0" />
        )}
      </div>
    </a>
  )
}
