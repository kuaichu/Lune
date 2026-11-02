export const FA_TO_LUCIDE: Record<string, string> = {
  'fa fa-television': 'Monitor',
  'fa fa-film': 'Film',
  'fa fa-compass': 'Compass',
  'fa fa-briefcase': 'Briefcase',
  'fa fa-gamepad': 'Gamepad2',
  'fa fa-newspaper-o': 'Newspaper',
  'fa fa-picture-o': 'Image',
  'fa fa-th-large': 'LayoutGrid',
  'fa fa-wrench': 'Wrench',
  'fa fa-cloud': 'Cloud',
  'fa fa-mobile': 'Smartphone',
  'fa fa-rss': 'Rss',
  'fa fa-sitemap': 'Share2',
  'fa fa-comments': 'MessagesSquare',
  'fa fa-cube': 'Box',
  'fa fa-sun-o': 'Sun',
  'fa fa-bookmark-o': 'Bookmark',
  'fa fa-folder-open-o': 'FolderOpen',
  'fa fa-link': 'Link',
  'fa fa-home': 'Home',
  'fa fa-cog': 'Settings',
  'fa fa-upload': 'Upload',
  'fa fa-list-ul': 'List',
  'fa fa-dashboard': 'LayoutDashboard',
  'fa fa-sign-out': 'LogOut',
  'fa fa-file-code-o': 'FileCode',
  'fa fa-search': 'Search',
  'fa fa-qrcode': 'QrCode',
  'fa fa-copy': 'Copy',
  'fa fa-external-link': 'ExternalLink',
  'fa fa-edit': 'Pencil',
  'fa fa-trash': 'Trash',
  'fa fa-expeditedssl': 'Lock',
  'fa fa-plus': 'Plus',
  'fa fa-arrow-up': 'ArrowUp',
}

export const ICON_FOR_CATEGORY: Record<string, string> = {
  'ACG': 'Monitor',
  '影音': 'Film',
  '导航': 'Compass',
  '软件': 'Briefcase',
  '游戏': 'Gamepad2',
  '资讯': 'Newspaper',
  '图片': 'Image',
  '系统': 'LayoutGrid',
  '工具': 'Wrench',
  '网盘': 'Cloud',
  '手机': 'Smartphone',
  '博客': 'Rss',
  '网络': 'Share2',
  '论坛': 'MessagesSquare',
  '其它': 'Box',
  '18R': 'Sun',
}

export const ICON_COLORS = [
  '#6f60ff', '#5367d8', '#12a6c8', '#3d7be0', '#39b980',
  '#ff8a3d', '#7b6ff0', '#f04f86', '#ef5b78', '#2f82df',
  '#5040a7', '#ff982e', '#28b86f', '#625ee8', '#5d51e8', '#ff6a3a',
]

export function getIconForCategory(fontIcon: string | null, name: string): string {
  if (fontIcon && fontIcon.trim() && fontIcon !== 'fa') {
    const lucide = FA_TO_LUCIDE[fontIcon.trim()]
    if (lucide) return lucide
  }
  for (const [key, icon] of Object.entries(ICON_FOR_CATEGORY)) {
    if (name.includes(key)) return icon
  }
  return 'Bookmark'
}
