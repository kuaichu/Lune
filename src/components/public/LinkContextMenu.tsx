'use client'

import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuTrigger,
} from '@/components/ui/context-menu'
import { LinkContextData } from './LinkCard'
import { ExternalLink, Trash2, Copy } from 'lucide-react'
import { toast } from 'sonner'

interface LinkContextMenuProps {
  children: React.ReactNode
  linkData: LinkContextData
  isLoggedIn: boolean
  onOpen?: (data: LinkContextData) => void
  onDelete?: (data: LinkContextData) => void
}

export function LinkContextMenu({
  children,
  linkData,
  isLoggedIn,
  onOpen,
  onDelete,
}: LinkContextMenuProps) {
  async function handleCopy() {
    try {
      if (!navigator.clipboard?.writeText) {
        toast.error('复制失败')
        return
      }

      await navigator.clipboard.writeText(linkData.url)
      toast.success('链接已复制')
    } catch {
      toast.error('复制失败')
    }
  }

  return (
    <ContextMenu>
      <ContextMenuTrigger>
        {children}
      </ContextMenuTrigger>
      <ContextMenuContent className="w-48">
        <ContextMenuItem onClick={() => onOpen?.(linkData)}>
          <ExternalLink className="mr-2 h-4 w-4" />
          打开
        </ContextMenuItem>
        {isLoggedIn && (
          <>
            <ContextMenuSeparator />
            <ContextMenuItem onClick={() => onDelete?.(linkData)} className="text-red-500 focus:text-red-500">
              <Trash2 className="mr-2 h-4 w-4" />
              删除
            </ContextMenuItem>
          </>
        )}
        <ContextMenuSeparator />
        <ContextMenuItem onClick={() => void handleCopy()}>
          <Copy className="mr-2 h-4 w-4" />
          复制链接
        </ContextMenuItem>
      </ContextMenuContent>
    </ContextMenu>
  )
}
