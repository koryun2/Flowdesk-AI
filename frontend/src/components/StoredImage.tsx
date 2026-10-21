import { useEffect, useState } from 'react'
import styled from 'styled-components'
import { authorizedFetch } from '../services/authApi'

type ImageVariant = 'thumb' | 'preview' | 'tile'

const Picture = styled.img<{ $variant: ImageVariant }>`
  display: block;
  background: ${({ theme }) => theme.primarySoft};
  object-fit: ${({ $variant }) => ($variant === 'preview' ? 'contain' : 'cover')};
  border-radius: ${({ $variant }) => ($variant === 'thumb' ? '9px' : '10px')};
  ${({ $variant }) =>
    $variant === 'thumb'
      ? 'width: 36px; height: 36px;'
      : $variant === 'tile'
        ? 'width: 100%; height: 100%;'
        : 'width: auto; max-width: 100%; max-height: 280px;'}
`

const Placeholder = styled.span<{ $variant: ImageVariant }>`
  display: block;
  background: ${({ theme }) => theme.primarySoft};
  border-radius: ${({ $variant }) => ($variant === 'thumb' ? '9px' : '10px')};
  ${({ $variant }) =>
    $variant === 'thumb'
      ? 'width: 36px; height: 36px;'
      : $variant === 'tile'
        ? 'width: 100%; height: 100%;'
        : 'width: 100%; height: 120px;'}
`

export function StoredImage({
  path,
  alt,
  variant = 'thumb',
}: {
  path: string
  alt: string
  variant?: ImageVariant
}) {
  const [url, setUrl] = useState('')

  useEffect(() => {
    let cancelled = false
    let objectUrl = ''
    authorizedFetch(path)
      .then(async (response) => (response.ok ? response.blob() : null))
      .then((blob) => {
        if (!blob || cancelled) return
        objectUrl = URL.createObjectURL(blob)
        setUrl(objectUrl)
      })
      .catch(() => undefined)
    return () => {
      cancelled = true
      if (objectUrl) URL.revokeObjectURL(objectUrl)
    }
  }, [path])

  if (!url) return <Placeholder $variant={variant} />
  return <Picture $variant={variant} alt={alt} src={url} />
}

export async function downloadStoredFile(path: string, fileName: string) {
  const response = await authorizedFetch(path)
  if (!response.ok) return
  const url = URL.createObjectURL(await response.blob())
  const link = document.createElement('a')
  link.href = url
  link.download = fileName
  link.click()
  URL.revokeObjectURL(url)
}
