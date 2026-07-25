'use client'

import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuTrigger,
} from '@/components/ui/context-menu'
import { LinkContextData } from './LinkCard'
import { ExternalLink, Pencil, Trash2, QrCode, Copy } from 'lucide-react'

interface LinkContextMenuProps {
  children?: React.ReactNode
  linkData: LinkContextData | null
  isLoggedIn: boolean
  onOpen?: (data: LinkContextData) => void
  onEdit?: (data: LinkContextData) => void
  onDelete?: (data: LinkContextData) => void
  onShowQR?: (data: LinkContextData) => void
}

export function LinkContextMenu({
  children,
  linkData,
  isLoggedIn,
  onOpen,
  onEdit,
  onDelete,
  onShowQR,
}: LinkContextMenuProps) {
  if (!linkData) {
    return <>{children}</>
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
            <ContextMenuItem onClick={() => onEdit?.(linkData)}>
              <Pencil className="mr-2 h-4 w-4" />
              编辑
            </ContextMenuItem>
            <ContextMenuItem onClick={() => onDelete?.(linkData)} className="text-red-500 focus:text-red-500">
              <Trash2 className="mr-2 h-4 w-4" />
              删除
            </ContextMenuItem>
          </>
        )}
        <ContextMenuSeparator />
        <ContextMenuItem onClick={() => onShowQR?.(linkData)}>
          <QrCode className="mr-2 h-4 w-4" />
          二维码
        </ContextMenuItem>
        <ContextMenuItem onClick={() => {
          navigator.clipboard.writeText(linkData.url)
        }}>
          <Copy className="mr-2 h-4 w-4" />
          复制链接
        </ContextMenuItem>
      </ContextMenuContent>
    </ContextMenu>
  )
}
