'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Plus, Trash2, Upload, X, Image as ImageIcon } from 'lucide-react'
import { ProductVariation } from '@/types/database'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'
import { formatCurrency } from '@/lib/utils'

interface VariationFormData extends Partial<ProductVariation> {
  tempId: string
  imageFile?: File | null
  imagePreview?: string | null
  imageUrl?: string | null
  is_default?: boolean
}

export interface VariationGroupData {
  tempId: string;
  name: string;
  hasImage?: boolean; // New field to support toggling block images
  options: VariationFormData[];
}

interface ProductVariationsEditorProps {
  groups: VariationGroupData[]
  onChange: (groups: VariationGroupData[]) => void
  baseSalePrice: number
  baseCostPrice: number
}

export function ProductVariationsEditor({ groups, onChange, baseSalePrice, baseCostPrice }: ProductVariationsEditorProps) {
  
  const handleAddGroup = () => {
    onChange([
      ...groups,
      {
        tempId: Date.now().toString() + Math.random(),
        name: '',
        hasImage: true,
        options: []
      }
    ])
  }

  const handleRemoveGroup = (gIndex: number) => {
    const newGrps = [...groups]
    newGrps.splice(gIndex, 1)
    onChange(newGrps)
  }

  const handleGroupNameChange = (gIndex: number, name: string) => {
    const newGrps = [...groups]
    newGrps[gIndex] = { ...newGrps[gIndex], name }
    onChange(newGrps)
  }

  const handleGroupToggleImage = (gIndex: number, hasImage: boolean) => {
    const newGrps = [...groups]
    newGrps[gIndex] = { ...newGrps[gIndex], hasImage }
    onChange(newGrps)
  }

  const handleAddOption = (gIndex: number) => {
    const newGrps = [...groups]
    newGrps[gIndex].options.push({
      tempId: Date.now().toString() + Math.random(),
      name: '',
      cost_price: 0,
      sale_price: 0,
      stock_quantity: 0,
      min_stock_alert: 5,
      is_active: true,
      is_default: newGrps[gIndex].options.length === 0, // First one is default
    })
    onChange(newGrps)
  }

  const handleRemoveOption = (gIndex: number, oIndex: number) => {
    const newGrps = [...groups]
    newGrps[gIndex].options.splice(oIndex, 1)
    onChange(newGrps)
  }

  const handleOptionChange = (gIndex: number, oIndex: number, field: keyof VariationFormData, value: any) => {
    const newGrps = [...groups]
    
    // If setting default, unset others in the same group
    if (field === 'is_default' && value === true) {
      newGrps[gIndex].options = newGrps[gIndex].options.map((opt, i) => ({
        ...opt,
        is_default: i === oIndex
      }))
    } else {
      newGrps[gIndex].options[oIndex] = { ...newGrps[gIndex].options[oIndex], [field]: value }
    }
    
    onChange(newGrps)
  }

  const handleImageChange = (gIndex: number, oIndex: number, e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      const reader = new FileReader()
      reader.onloadend = () => {
        const newGrps = [...groups]
        newGrps[gIndex].options[oIndex] = { 
            ...newGrps[gIndex].options[oIndex], 
            imageFile: file,
            imagePreview: reader.result as string 
        }
        onChange(newGrps)
      }
      reader.readAsDataURL(file)
    }
  }

  if (groups.length === 0) {
    return (
      <div className="border border-dashed rounded-lg p-6 flex flex-col items-center justify-center text-center gap-2">
        <p className="text-muted-foreground text-sm">Este produto não possui blocos de variações personalizados.</p>
        <Button type="button" variant="outline" size="sm" onClick={handleAddGroup}>
          <Plus className="mr-2 h-4 w-4" />
          Adicionar Bloco de Variação
        </Button>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h4 className="text-sm font-medium">Blocos de Variações</h4>
        <Button type="button" variant="outline" size="sm" onClick={handleAddGroup}>
          <Plus className="mr-2 h-4 w-4" />
          Adicionar Bloco
        </Button>
      </div>
      
      <div className="space-y-6">
        {groups.map((g, gIndex) => (
          <div key={g.tempId} className="border border-indigo-100 rounded-lg overflow-hidden bg-white shadow-sm">
            {/* Cabecalho do Grupo */}
            <div className="bg-indigo-50/50 p-4 border-b border-indigo-100 flex items-center justify-between gap-4">
               <div className="flex-1 space-y-1">
                 <Label className="text-indigo-900">Nome do Bloco (ex: Tamanho, Cor, Voltagem) *</Label>
                 <Input 
                   className="bg-white border-indigo-200 focus-visible:ring-indigo-500 font-medium" 
                   value={g.name} 
                   onChange={(e) => handleGroupNameChange(gIndex, e.target.value)} 
                   placeholder="Nome do bloco" 
                   required 
                 />
               </div>
               <div className="flex flex-col items-center justify-center space-y-1 pt-1 ml-4 bg-white/50 px-3 py-1.5 rounded border border-indigo-100/50">
                 <Label htmlFor={`group-img-${gIndex}`} className="text-xs text-indigo-900 font-semibold cursor-pointer whitespace-nowrap">Exigir Fotos?</Label>
                 <Switch 
                   id={`group-img-${gIndex}`}
                   checked={g.hasImage ?? true} 
                   onCheckedChange={(c) => handleGroupToggleImage(gIndex, c)} 
                   className="data-[state=checked]:bg-indigo-600 scale-90"
                 />
               </div>
               <div className="flex items-end self-end mb-1 ml-4">
                 <Button type="button" variant="outline" size="sm" className="mr-2 border-indigo-200 text-indigo-700 hover:bg-indigo-100" onClick={() => handleAddOption(gIndex)}>
                   <Plus className="mr-1 h-4 w-4" /> Nova Opção
                 </Button>
                 <Button type="button" variant="destructive" size="icon" className="h-9 w-9" onClick={() => handleRemoveGroup(gIndex)} title="Remover Bloco">
                   <Trash2 className="h-4 w-4" />
                 </Button>
               </div>
            </div>

            {/* Opções do Grupo */}
            <div className="p-4 space-y-4">
              {g.options.length === 0 && (
                <div className="text-center p-4 text-sm text-muted-foreground bg-slate-50 rounded border border-dashed">
                   Nenhuma opção adicionada. Adicione as variações (ex: P, M, ou Azul, Verde).
                </div>
              )}
              {g.options.map((v, oIndex) => (
                <div key={v.id || v.tempId} className="border border-slate-200 rounded-md p-4 relative bg-slate-50 flex flex-col gap-4">
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="absolute top-2 right-2 h-6 w-6 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                    onClick={() => handleRemoveOption(gIndex, oIndex)}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                  
                  <div className={`flex flex-wrap gap-x-4 gap-y-4 items-end pr-8 w-full`}>
                    {/* Imagem (Conditional) */}
                    {g.hasImage !== false && (
                      <div className="col-span-1 flex justify-center">
                         {v.is_default ? (
                             <div className="flex flex-col items-center justify-center w-12 h-12 border border-dashed text-primary/50 border-primary/20 rounded bg-indigo-50/30 text-[9px] font-medium text-center leading-tight">
                               Foto<br/>Principal
                             </div>
                         ) : v.imagePreview || v.imageUrl ? (
                             <div className="relative w-12 h-12">
                               <img src={v.imagePreview || v.imageUrl!} alt="Variação" className="w-full h-full object-cover rounded border" />
                               <button type="button" className="absolute -top-1 -right-1 bg-destructive text-white rounded-full p-0.5" 
                                       onClick={() => { handleOptionChange(gIndex, oIndex, 'imagePreview', null); handleOptionChange(gIndex, oIndex, 'imageFile', null); handleOptionChange(gIndex, oIndex, 'imageUrl', null); }}>
                                 <X className="h-3 w-3 " />
                               </button>
                             </div>
                         ) : (
                             <Label className="cursor-pointer flex flex-col items-center justify-center w-12 h-12 border border-dashed rounded bg-white hover:bg-slate-100 text-[10px] text-muted-foreground">
                               <ImageIcon className="h-4 w-4 mb-0.5" />
                               <span>Foto</span>
                               <input type="file" accept="image/*" className="hidden" onChange={(e) => handleImageChange(gIndex, oIndex, e)} />
                             </Label>
                         )}
                      </div>
                    )}
                    
                    <div className="space-y-1.5 flex-1 min-w-[120px]">
                      <Label className="text-xs">Opção (ex: P, Azul) *</Label>
                      <Input
                        className="h-9 text-sm"
                        value={v.name || ''}
                        onChange={(e) => handleOptionChange(gIndex, oIndex, 'name', e.target.value)}
                        placeholder="Nome"
                        required
                      />
                    </div>
                    
                    <div className="space-y-1.5 flex-1 min-w-[120px]">
                      <Label className="text-xs">Valor Final Desejado *</Label>
                      <Input
                        type="number"
                        className="h-9 text-sm"
                        step="0.01"
                        value={v.is_default ? baseSalePrice : (baseSalePrice + (v.sale_price || 0))}
                        disabled={v.is_default}
                        onChange={(e) => {
                          let desired = parseFloat(e.target.value);
                          if (isNaN(desired)) desired = 0;
                          handleOptionChange(gIndex, oIndex, 'sale_price', desired - baseSalePrice);
                        }}
                        required
                      />
                      {!v.is_default && (v.sale_price || 0) !== 0 && (
                        <div className="text-[10px] text-muted-foreground leading-tight">
                          {(v.sale_price || 0) > 0 ? '+' : '-'} {formatCurrency(Math.abs(v.sale_price || 0))} no valor base
                        </div>
                      )}
                      {v.is_default && (
                        <div className="text-[10px] text-muted-foreground leading-tight">
                          Igual ao valor base
                        </div>
                      )}
                    </div>

                    <div className="space-y-1.5 flex-1 min-w-[100px]">
                      <Label className="text-xs">Estoque</Label>
                      <Input
                        type="number"
                        className="h-9 text-sm"
                        value={v.stock_quantity || 0}
                        onChange={(e) => handleOptionChange(gIndex, oIndex, 'stock_quantity', parseInt(e.target.value) || 0)}
                      />
                    </div>

                    <div className="space-y-1.5 flex-1 min-w-[100px]">
                      <Label className="text-xs">SKU</Label>
                      <Input
                        className="h-9 text-sm"
                        value={v.sku || ''}
                        onChange={(e) => handleOptionChange(gIndex, oIndex, 'sku', e.target.value)}
                        placeholder="Opcional"
                      />
                    </div>

                    <div className="flex flex-col gap-2 pt-2 min-w-[80px]">
                       <div className="flex items-center gap-2">
                         <Switch 
                           id={`default-${gIndex}-${oIndex}`}
                           checked={v.is_default || false} 
                           onCheckedChange={(c) => handleOptionChange(gIndex, oIndex, 'is_default', c)} 
                           className="data-[state=checked]:bg-indigo-600 scale-75 origin-left"
                         />
                         <Label htmlFor={`default-${gIndex}-${oIndex}`} className="text-xs font-medium cursor-pointer whitespace-nowrap">Padrão</Label>
                       </div>
                       <div className="flex items-center gap-2">
                         <Switch 
                           id={`active-${gIndex}-${oIndex}`}
                           checked={v.is_active ?? true} 
                           onCheckedChange={(c) => handleOptionChange(gIndex, oIndex, 'is_active', c)} 
                           className="scale-75 origin-left"
                         />
                         <Label htmlFor={`active-${gIndex}-${oIndex}`} className="text-xs font-medium cursor-pointer whitespace-nowrap">Ativo</Label>
                       </div>
                    </div>

                  </div>
                </div>
              ))}
            </div>
            
          </div>
        ))}
      </div>
    </div>
  )
}
