import { MessageCircle } from 'lucide-react'
import { Brand } from '@/components/brand'
import { ThemeToggle } from '@/components/theme-toggle'
import { buttonVariants } from '@/components/ui/button'
import { whatsappLink } from '@/lib/whatsapp'

export function SiteHeader({ whatsapp }: { whatsapp?: string | null }) {
  return (
    <header className="site-header">
      <div className="site-header__inner">
        <Brand />
        <div className="site-header__actions">
          {whatsapp && (
            <a
              href={whatsappLink(whatsapp, 'Olá! Gostaria de falar sobre um pedido.')}
              target="_blank"
              rel="noopener noreferrer"
              className={buttonVariants({ variant: 'outline', size: 'sm', className: 'border-foreground/30!' })}
              aria-label="Chamar no WhatsApp"
              title="Chamar no WhatsApp"
            >
              <MessageCircle />
              <span className="sm:hidden">WhatsApp</span>
              <span className="hidden sm:inline">Chamar no WhatsApp</span>
            </a>
          )}
          <ThemeToggle />
        </div>
      </div>
    </header>
  )
}
