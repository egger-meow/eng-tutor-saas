import { useRef, useState, type KeyboardEvent } from 'react'

export function useNavigationMenu() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const toggleRef = useRef<HTMLButtonElement>(null)
  function handleMenuKeyDown(event: KeyboardEvent<HTMLElement>) {
    if (event.key !== 'Escape' || !mobileMenuOpen) return
    event.preventDefault()
    setMobileMenuOpen(false)
    toggleRef.current?.focus()
  }
  return { mobileMenuOpen, setMobileMenuOpen, toggleRef, handleMenuKeyDown }
}
