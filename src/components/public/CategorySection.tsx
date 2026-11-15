import { LinkCard, LinkContextData } from './LinkCard'
import { LinkContextMenu } from './LinkContextMenu'
import { Lock } from 'lucide-react'

interface CategoryData {
  id: number
  name: string
  property: number
  fontIcon: string | null
  links: LinkData[]
}

interface LinkData {
  id: number
  title: string
  url: string
  description: string
  property: number
  checkStatus?: number
}

interface CategorySectionProps {
  category: CategoryData
  showTitle?: boolean
  accent: string
  isLoggedIn: boolean
  onLinkOpen?: (data: LinkContextData) => void
  onLinkDelete?: (data: LinkContextData) => void
}

export function CategorySection({
  category,
  showTitle = true,
  accent,
  isLoggedIn,
  onLinkOpen,
  onLinkDelete,
}: CategorySectionProps) {
  const { id, name, property, links } = category
  if (!links || links.length === 0) return null

  const isPrivate = property === 1

  return (
    <section>
      {showTitle && (
        <div id={`category-${id}`} className="flex items-center gap-2.5 mb-3.5">
          <span className="h-1.5 w-1.5 shrink-0 rounded-full" style={{ backgroundColor: accent }} />
          <h3 className="text-[16px] font-bold text-ink-title">{name}</h3>
          {isPrivate && <Lock className="w-3.5 h-3.5 text-[#5fb878]" />}
          <span className="text-xs font-semibold text-ink-muted">{links.length}</span>
          <span className="h-px flex-1 bg-line" />
        </div>
      )}
      <div className="grid grid-cols-6 max-[1500px]:grid-cols-6 max-[1320px]:grid-cols-5 max-[1160px]:grid-cols-4 max-[960px]:grid-cols-[repeat(auto-fit,minmax(150px,1fr))] gap-4 items-stretch">
        {links.map((link) => (
          <LinkContextMenu
            key={link.id}
            linkData={{ id: link.id, title: link.title, url: link.url }}
            isLoggedIn={isLoggedIn}
            onOpen={onLinkOpen}
            onDelete={onLinkDelete}
          >
            <LinkCard
              title={link.title}
              url={link.url}
              property={link.property}
              description={link.description}
              checkStatus={link.checkStatus}
            />
          </LinkContextMenu>
        ))}
      </div>
    </section>
  )
}
