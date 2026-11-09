import { useState } from 'react'
import { MapPinCheck } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'

export function AvisoEntrega() {
  const [aberto, setAberto] = useState(true)

  return (
    <Dialog open={aberto} onOpenChange={setAberto}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <MapPinCheck className="size-5" /> Entregas apenas em Paiçandu, PR
          </DialogTitle>
          <DialogDescription>
            No momento só entregamos em Paiçandu. Se você mora em outra cidade, pode fazer o pedido e retirar com a gente.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <DialogClose render={<Button />}>Entendi</DialogClose>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
