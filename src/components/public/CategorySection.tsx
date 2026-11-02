import { LinkCard, LinkContextData } from './LinkCard'
import { LinkContextMenu } from './LinkContextMenu'
import { getIconForCategory } from '@/lib/icons'
import { Lock } from 'lucide-react'
import { DynamicIcon } from '@/components/shared/DynamicIcon'

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
}

interface CategorySectionProps {
  category: CategoryData
  showTitle?: boolean
  isChild?: boolean
  isLoggedIn: boolean
  onLinkOpen?: (data: LinkContextData) => void
  onLinkDelete?: (data: LinkContextData) => void
}

export function CategorySection({
  category,
  showTitle = true,
  isChild = false,
  isLoggedIn,
  onLinkOpen,
  onLinkDelete,
}: CategorySectionProps) {
  const { id, name, property, fontIcon, links } = category
  if (!links || links.length === 0) return null

  const icon = getIconForCategory(fontIcon, name)
  const isPrivate = property === 1

  return (
    <section className={isChild ? 'mt-7' : ''}>
      {showTitle && (
        <div
          id={isChild ? `category-${id}` : undefined}
          className="flex items-center gap-2.5 mb-4"
        >
          <div className="cat-title-bar" />
          <DynamicIcon name={icon} className="w-5 h-5 text-purple-primary" />
          <span className="text-[17px] font-bold text-ink-title">{name}</span>
          {isPrivate && <Lock className="w-3.5 h-3.5 text-[#5fb878]" />}
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
            />
          </LinkContextMenu>
        ))}
      </div>
    </section>
  )
}
