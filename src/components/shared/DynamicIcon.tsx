import { type LucideProps } from 'lucide-react'
import { Bookmark } from 'lucide-react'
import { Monitor } from 'lucide-react'
import { Film } from 'lucide-react'
import { Compass } from 'lucide-react'
import { Briefcase } from 'lucide-react'
import { Newspaper } from 'lucide-react'
import { Image } from 'lucide-react'
import { LayoutGrid } from 'lucide-react'
import { Wrench } from 'lucide-react'
import { Cloud } from 'lucide-react'
import { Smartphone } from 'lucide-react'
import { Rss } from 'lucide-react'
import { Share2 } from 'lucide-react'
import { MessagesSquare } from 'lucide-react'
import { Box } from 'lucide-react'
import { Sun } from 'lucide-react'
import { FolderOpen } from 'lucide-react'
import { Link } from 'lucide-react'
import { Home } from 'lucide-react'
import { Settings } from 'lucide-react'
import { Upload } from 'lucide-react'
import { Gamepad2 } from 'lucide-react'
import { Lock } from 'lucide-react'
import type { ComponentType } from 'react'

const ICON_MAP: Record<string, ComponentType<LucideProps>> = {
  Bookmark, Monitor, Film, Compass, Briefcase, Newspaper, Image,
  LayoutGrid, Wrench, Cloud, Smartphone, Rss, Share2, MessagesSquare,
  Box, Sun, FolderOpen, Link, Home, Settings, Upload, Gamepad2, Lock,
}

interface DynamicIconProps extends LucideProps {
  name: string
}

export function DynamicIcon({ name, ...props }: DynamicIconProps) {
  const Icon = ICON_MAP[name] || Bookmark
  return <Icon {...props} />
}
