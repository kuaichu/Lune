import Image from 'next/image'
import { Lock } from 'lucide-react'
import { faviconUrl } from '@/lib/icons'

interface LinkCardProps {
  id: number
  title: string
  url: string
  description: string
  property: number
  onContextMenu?: (e: React.MouseEvent, linkData: LinkContextData) => void
}

export interface LinkContextData {
  id: number
  title: string
  url: string
}

export function LinkCard({ id, title, url, description, property, onContextMenu }: LinkCardProps) {
  const isPrivate = property === 1
  const favicon = faviconUrl(url)

  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      className="block min-w-0 no-underline text-inherit hover:text-inherit focus:text-inherit visited:text-inherit"
      onContextMenu={(e) => {
        onContextMenu?.(e, { id, title, url })
      }}
    >
      <div className="link-line relative h-14 w-full px-4 flex items-center gap-3 overflow-visible">
        {isPrivate && <div className="angle"><span /></div>}
        {favicon && (
          <Image
            src={favicon}
            alt=""
            width={16}
            height={16}
            className="w-4 h-4 rounded shrink-0"
            unoptimized
          />
        )}
        <span className="text-[15px] font-semibold text-[#3d446f] whitespace-nowrap overflow-hidden text-ellipsis flex-1">
          {title}
        </span>
        {isPrivate && (
          <Lock className="w-3.5 h-3.5 text-[#5fb878] shrink-0" />
        )}
      </div>
    </a>
  )
}
