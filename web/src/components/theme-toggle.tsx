import { useState } from 'react'
import { Moon, Sun } from 'lucide-react'
import { Button } from '@/components/ui/button'

const KEY = 'delivery:theme'

function initialDark() {
  try {
    const saved = localStorage.getItem(KEY)
    if (saved) return saved === 'dark'
  } catch {  }
  return false
}

export function applyInitialTheme() {
  document.documentElement.classList.toggle('dark', initialDark())
}

export function ThemeToggle({ className }: { className?: string }) {
  const [dark, setDark] = useState(() => document.documentElement.classList.contains('dark'))

  function toggle() {
    const next = !dark
    setDark(next)
    document.documentElement.classList.toggle('dark', next)
    try { localStorage.setItem(KEY, next ? 'dark' : 'light') } catch {  }
  }

  return (
    <Button variant="ghost" size="icon" onClick={toggle} className={className} aria-label="Alternar tema">
      {dark ? <Sun /> : <Moon />}
    </Button>
  )
}
