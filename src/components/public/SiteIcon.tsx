'use client'

import { useEffect, useRef, useState } from 'react'
import Image from 'next/image'
import { iconFallback, siteIconSrc } from '@/lib/favicon'

interface SiteIconProps {
  title: string
  url: string
}

export function SiteIcon({ title, url }: SiteIconProps) {
  const src = siteIconSrc(url)
  const [failed, setFailed] = useState(false)
  const imageRef = useRef<HTMLImageElement>(null)

  // The server-rendered <img> can fail before hydration, so its error event is already gone.
  useEffect(() => {
    const image = imageRef.current
    if (image?.complete && image.naturalWidth === 0) setFailed(true)
  }, [])

  if (src && !failed) {
    return (
      <Image
        ref={imageRef}
        src={src}
        alt=""
        width={16}
        height={16}
        className="w-4 h-4 rounded shrink-0"
        unoptimized
        onError={() => setFailed(true)}
      />
    )
  }

  const { letter, color } = iconFallback(title, url)
  return (
    <span
      aria-hidden="true"
      className="flex h-4 w-4 shrink-0 items-center justify-center rounded text-[10px] font-extrabold leading-none"
      style={{ color, backgroundColor: `color-mix(in srgb, ${color} 16%, transparent)` }}
    >
      {letter}
    </span>
  )
}
