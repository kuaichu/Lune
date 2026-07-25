import type { Category, Link, Option } from '@prisma/client'

export type { Category, Link, Option }

export interface CategoryWithChildren extends Category {
  children: CategoryWithChildren[]
  links: Link[]
}

export interface SiteSettings {
  title: string
  logo: string
  subtitle: string
  keywords: string
  description: string
  custom_header: string
  custom_footer: string
  link_model: string
  link_num: number
}

export interface ThemeSettings {
  pc_theme: string
  mobile_theme: string
}
