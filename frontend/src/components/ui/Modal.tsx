import { X } from 'lucide-react'
import { type ReactNode, useEffect } from 'react'
import styled, { keyframes } from 'styled-components'
import { IconButton } from './Button'

const fadeIn = keyframes`
  from {
    opacity: 0;
  }
`

const modalIn = keyframes`
  from {
    opacity: 0;
    transform: translateY(8px) scale(0.98);
  }
`

const Backdrop = styled.div`
  position: fixed;
  z-index: 100;
  inset: 0;
  display: grid;
  place-items: center;
  padding: 18px;
  background: rgba(26, 29, 43, 0.5);
  backdrop-filter: blur(3px);
  animation: ${fadeIn} 150ms ease;
`

const Dialog = styled.section<{ $width: 'sm' | 'md' | 'lg' }>`
  width: 100%;
  max-width: ${({ $width }) => ($width === 'sm' ? '430px' : $width === 'lg' ? '820px' : '600px')};
  max-height: calc(100vh - 36px);
  overflow: auto;
  border: 1px solid rgba(255, 255, 255, 0.5);
  border-radius: 15px;
  background: #fff;
  box-shadow: 0 24px 80px rgba(20, 23, 38, 0.28);
  animation: ${modalIn} 180ms ease;
`

const DialogHeader = styled.header`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 20px;
  padding: 18px 20px;
  border-bottom: 1px solid ${({ theme }) => theme.border};

  h2 {
    font-size: 16px;
  }

  p {
    margin-top: 4px;
    color: ${({ theme }) => theme.textSecondary};
    font-size: 10px;
  }
`

const DialogBody = styled.div`
  padding: 20px;
`

const DialogFooter = styled.footer`
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 20px;
  padding: 18px 20px;
  border-top: 1px solid ${({ theme }) => theme.border};
  background: #fafbfc;
`

export function Modal({
  open,
  onClose,
  title,
  description,
  children,
  footer,
  width = 'md',
}: {
  open: boolean
  onClose: () => void
  title: string
  description?: string
  children: ReactNode
  footer?: ReactNode
  width?: 'sm' | 'md' | 'lg'
}) {
  useEffect(() => {
    if (!open) return
    const handleKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', handleKey)
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', handleKey)
      document.body.style.overflow = ''
    }
  }, [onClose, open])

  if (!open) return null

  return (
    <Backdrop onMouseDown={onClose}>
      <Dialog
        $width={width}
        aria-describedby={description ? 'modal-description' : undefined}
        aria-labelledby="modal-title"
        aria-modal="true"
        onMouseDown={(event) => event.stopPropagation()}
        role="dialog"
      >
        <DialogHeader>
          <div>
            <h2 id="modal-title">{title}</h2>
            {description ? <p id="modal-description">{description}</p> : null}
          </div>
          <IconButton label="Close dialog" onClick={onClose}>
            <X size={18} />
          </IconButton>
        </DialogHeader>
        <DialogBody>{children}</DialogBody>
        {footer ? <DialogFooter>{footer}</DialogFooter> : null}
      </Dialog>
    </Backdrop>
  )
}
