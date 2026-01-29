'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Switch } from '@/components/ui/switch'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { 
  Plus, 
  Tag,
  Percent,
  DollarSign,
  History,
  Loader2,
  Crown,
  Calendar,
  Trash2,
} from 'lucide-react'
import { toast } from 'sonner'
import { formatCurrency, formatDate } from '@/lib/utils'
import { Offer, OfferHistory, Product, Combo } from '@/types/database'

const offerSchema = z.object({
  name: z.string().min(1, 'Nome é obrigatório'),
  offer_type: z.enum(['sazonal', 'clube_desconto']),
  target_type: z.enum(['product', 'combo']),
  target_id: z.string().min(1, 'Selecione um produto ou combo'),
  discount_type: z.enum(['percentage', 'fixed']),
  discount_value: z.number().min(0.01, 'Valor deve ser maior que 0'),
  start_date: z.string().optional(),
  end_date: z.string().optional(),
  is_active: z.boolean(),
})

type OfferForm = {
  name: string
  offer_type: 'sazonal' | 'clube_desconto'
  target_type: 'product' | 'combo'
  target_id: string
  discount_type: 'percentage' | 'fixed'
  discount_value: number
  start_date?: string
  end_date?: string
  is_active: boolean
}

interface OffersClientProps {
  initialOffers: (Offer & { products?: Product; combos?: Combo })[]
  products: Pick<Product, 'id' | 'name' | 'sale_price'>[]
  combos: Pick<Combo, 'id' | 'name' | 'combo_price'>[]
  offerHistory: OfferHistory[]
}

export function OffersClient({ initialOffers, products, combos, offerHistory }: OffersClientProps) {
  const router = useRouter()
  const supabase = createClient()
  const [offers, setOffers] = useState(initialOffers)
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [selectedTarget, setSelectedTarget] = useState<{ type: 'product' | 'combo'; id: string } | null>(null)

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    reset,
    formState: { errors },
  } = useForm<OfferForm>({
    defaultValues: {
      name: '',
      offer_type: 'sazonal',
      target_type: 'product',
      target_id: '',
      discount_type: 'percentage',
      discount_value: 0,
      is_active: true,
    },
  })

  const targetType = watch('target_type')
  const targetId = watch('target_id')
  const discountType = watch('discount_type')
  const discountValue = watch('discount_value')

  // Calcular preço final
  const getOriginalPrice = () => {
    if (targetType === 'product') {
      return products.find(p => p.id === targetId)?.sale_price || 0
    }
    return combos.find(c => c.id === targetId)?.combo_price || 0
  }

  const originalPrice = getOriginalPrice()
  const finalPrice = discountType === 'percentage'
    ? originalPrice * (1 - (discountValue || 0) / 100)
    : originalPrice - (discountValue || 0)

  // Filtrar histórico por produto/combo selecionado
  const filteredHistory = offerHistory.filter(h => {
    if (targetType === 'product') return h.product_id === targetId
    return h.combo_id === targetId
  })

  const handleNewOffer = () => {
    reset({
      name: '',
      offer_type: 'sazonal',
      target_type: 'product',
      target_id: '',
      discount_type: 'percentage',
      discount_value: 0,
      start_date: '',
      end_date: '',
      is_active: true,
    })
    setIsDialogOpen(true)
  }

  const applyFromHistory = (history: OfferHistory) => {
    setValue('name', history.offer_name)
    setValue('discount_type', history.discount_type as 'percentage' | 'fixed')
    setValue('discount_value', history.discount_value)
    toast.success('Oferta do histórico aplicada!')
  }

  const onSubmit = async (data: OfferForm) => {
    setIsLoading(true)
    try {
      const offerData = {
        name: data.name,
        offer_type: data.offer_type,
        product_id: data.target_type === 'product' ? data.target_id : null,
        combo_id: data.target_type === 'combo' ? data.target_id : null,
        original_price: originalPrice,
        discount_type: data.discount_type,
        discount_value: data.discount_value,
        final_price: Math.max(0, finalPrice),
        start_date: data.start_date || null,
        end_date: data.end_date || null,
        is_active: data.is_active,
      }

      const { data: newOffer, error } = await supabase
        .from('offers')
        .insert(offerData)
        .select(`
          *,
          products (id, name, sale_price),
          combos (id, name, combo_price)
        `)
        .single()

      if (error) throw error

      setOffers([newOffer, ...offers])
      toast.success('Oferta criada com sucesso!')
      setIsDialogOpen(false)
      router.refresh()
    } catch (error: any) {
      toast.error(error.message || 'Erro ao criar oferta')
    } finally {
      setIsLoading(false)
    }
  }

  const toggleOfferStatus = async (offer: Offer) => {
    try {
      const { error } = await supabase
        .from('offers')
        .update({ is_active: !offer.is_active })
        .eq('id', offer.id)

      if (error) throw error

      setOffers(offers.map(o => 
        o.id === offer.id ? { ...o, is_active: !o.is_active } : o
      ))
      toast.success('Status atualizado!')
    } catch (error: any) {
      toast.error(error.message || 'Erro ao atualizar status')
    }
  }

  const deleteOffer = async (offer: Offer) => {
    if (!confirm('Deseja excluir esta oferta?')) return

    try {
      const { error } = await supabase
        .from('offers')
        .delete()
        .eq('id', offer.id)

      if (error) throw error

      setOffers(offers.filter(o => o.id !== offer.id))
      toast.success('Oferta excluída!')
    } catch (error: any) {
      toast.error(error.message || 'Erro ao excluir oferta')
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-3xl font-bold">Ofertas</h1>
          <p className="text-muted-foreground">
            Gerencie as promoções da sua loja
          </p>
        </div>
        <Button onClick={handleNewOffer}>
          <Plus className="mr-2 h-4 w-4" />
          Nova Oferta
        </Button>
      </div>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Calendar className="h-4 w-4" />
              Ofertas Sazonais
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {offers.filter(o => o.offer_type === 'sazonal' && o.is_active).length}
            </div>
            <p className="text-xs text-muted-foreground">Ativas</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Crown className="h-4 w-4" />
              Clube de Desconto
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {offers.filter(o => o.offer_type === 'clube_desconto' && o.is_active).length}
            </div>
            <p className="text-xs text-muted-foreground">Ativas</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Tag className="h-4 w-4" />
              Total de Ofertas
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{offers.length}</div>
            <p className="text-xs text-muted-foreground">Cadastradas</p>
          </CardContent>
        </Card>
      </div>

      {/* Table */}
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Oferta</TableHead>
              <TableHead>Produto/Combo</TableHead>
              <TableHead className="text-center">Tipo</TableHead>
              <TableHead className="text-right">Original</TableHead>
              <TableHead className="text-right">Desconto</TableHead>
              <TableHead className="text-right">Final</TableHead>
              <TableHead className="text-center">Status</TableHead>
              <TableHead className="w-[50px]"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {offers.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} className="text-center py-8">
                  <Tag className="mx-auto h-12 w-12 text-muted-foreground mb-2" />
                  <p className="text-muted-foreground">Nenhuma oferta cadastrada</p>
                </TableCell>
              </TableRow>
            ) : (
              offers.map((offer) => (
                <TableRow key={offer.id}>
                  <TableCell>
                    <div>
                      <p className="font-medium">{offer.name}</p>
                      {offer.end_date && (
                        <p className="text-xs text-muted-foreground">
                          Até {formatDate(offer.end_date)}
                        </p>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    {offer.products?.name || offer.combos?.name}
                  </TableCell>
                  <TableCell className="text-center">
                    <Badge variant={offer.offer_type === 'sazonal' ? 'default' : 'secondary'}>
                      {offer.offer_type === 'sazonal' ? (
                        <><Calendar className="mr-1 h-3 w-3" /> Sazonal</>
                      ) : (
                        <><Crown className="mr-1 h-3 w-3" /> Clube</>
                      )}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right text-muted-foreground line-through">
                    {formatCurrency(offer.original_price)}
                  </TableCell>
                  <TableCell className="text-right text-green-600">
                    {offer.discount_type === 'percentage' ? (
                      <>{offer.discount_value}%</>
                    ) : (
                      <>-{formatCurrency(offer.discount_value)}</>
                    )}
                  </TableCell>
                  <TableCell className="text-right font-bold">
                    {formatCurrency(offer.final_price)}
                  </TableCell>
                  <TableCell className="text-center">
                    <Switch
                      checked={offer.is_active}
                      onCheckedChange={() => toggleOfferStatus(offer)}
                    />
                  </TableCell>
                  <TableCell>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => deleteOffer(offer)}
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Nova Oferta</DialogTitle>
          </DialogHeader>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label>Nome da Oferta *</Label>
                <Input
                  {...register('name')}
                  placeholder="Ex: Promoção de Verão"
                />
                {errors.name && (
                  <p className="text-sm text-destructive">{errors.name.message}</p>
                )}
              </div>
              <div className="space-y-2">
                <Label>Tipo de Oferta</Label>
                <Select
                  value={watch('offer_type')}
                  onValueChange={(v) => setValue('offer_type', v as any)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="sazonal">
                      <div className="flex items-center gap-2">
                        <Calendar className="h-4 w-4" />
                        Oferta Sazonal
                      </div>
                    </SelectItem>
                    <SelectItem value="clube_desconto">
                      <div className="flex items-center gap-2">
                        <Crown className="h-4 w-4" />
                        Clube de Desconto
                      </div>
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label>Aplicar em</Label>
                <Select
                  value={watch('target_type')}
                  onValueChange={(v) => {
                    setValue('target_type', v as any)
                    setValue('target_id', '')
                  }}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="product">Produto</SelectItem>
                    <SelectItem value="combo">Combo</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>{targetType === 'product' ? 'Produto' : 'Combo'} *</Label>
                <Select
                  value={watch('target_id')}
                  onValueChange={(v) => setValue('target_id', v)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione..." />
                  </SelectTrigger>
                  <SelectContent>
                    {targetType === 'product' 
                      ? products.map((p) => (
                          <SelectItem key={p.id} value={p.id}>
                            {p.name} - {formatCurrency(p.sale_price)}
                          </SelectItem>
                        ))
                      : combos.map((c) => (
                          <SelectItem key={c.id} value={c.id}>
                            {c.name} - {formatCurrency(c.combo_price)}
                          </SelectItem>
                        ))
                    }
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Histórico de ofertas */}
            {targetId && filteredHistory.length > 0 && (
              <Card>
                <CardHeader className="py-2">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <History className="h-4 w-4" />
                    Histórico de Ofertas
                  </CardTitle>
                </CardHeader>
                <CardContent className="py-2">
                  <div className="flex gap-2 flex-wrap">
                    {filteredHistory.slice(0, 5).map((h) => (
                      <Button
                        key={h.id}
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => applyFromHistory(h)}
                      >
                        {h.offer_name} ({h.discount_type === 'percentage' ? `${h.discount_value}%` : formatCurrency(h.discount_value)})
                      </Button>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            <div className="grid gap-4 md:grid-cols-3">
              <div className="space-y-2">
                <Label>Tipo de Desconto</Label>
                <Select
                  value={watch('discount_type')}
                  onValueChange={(v) => setValue('discount_type', v as any)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="percentage">
                      <div className="flex items-center gap-2">
                        <Percent className="h-4 w-4" />
                        Porcentagem
                      </div>
                    </SelectItem>
                    <SelectItem value="fixed">
                      <div className="flex items-center gap-2">
                        <DollarSign className="h-4 w-4" />
                        Valor Fixo
                      </div>
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Valor do Desconto *</Label>
                <Input
                  type="number"
                  step={discountType === 'percentage' ? '1' : '0.01'}
                  {...register('discount_value')}
                  placeholder={discountType === 'percentage' ? '10' : '5.00'}
                />
              </div>
              <div className="space-y-2">
                <Label>Preço Final</Label>
                <div className="p-2 rounded-md bg-green-100 text-green-700 text-center font-bold">
                  {formatCurrency(Math.max(0, finalPrice))}
                </div>
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label>Data Início</Label>
                <Input type="date" {...register('start_date')} />
              </div>
              <div className="space-y-2">
                <Label>Data Fim</Label>
                <Input type="date" {...register('end_date')} />
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Switch
                id="is_active"
                checked={watch('is_active')}
                onCheckedChange={(v) => setValue('is_active', v)}
              />
              <Label htmlFor="is_active">Oferta Ativa</Label>
            </div>

            <div className="flex justify-end gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsDialogOpen(false)}
                disabled={isLoading}
              >
                Cancelar
              </Button>
              <Button type="submit" disabled={isLoading}>
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Criando...
                  </>
                ) : (
                  'Criar Oferta'
                )}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
