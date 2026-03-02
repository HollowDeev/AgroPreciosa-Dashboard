/**
 * Thermal Receipt Printer Utility — 72mm roll (48 characters per line)
 * Generates HTML markup optimised for thermal printers and triggers window.print()
 */

import type { OrderWithDetails, StoreConfig } from '@/types/database'

const COLS = 40
const SECTION_LINE = '─'.repeat(COLS)
const DOUBLE_LINE = '═'.repeat(COLS)

function pad(left: string, right: string, width: number = COLS): string {
  const total = left.length + right.length
  if (total >= width) return left + ' ' + right
  return left + ' '.repeat(width - total) + right
}

function center(text: string, width: number = COLS): string {
  const len = text.length
  if (len >= width) return text
  const paddingLeft = Math.floor((width - len) / 2)
  return ' '.repeat(paddingLeft) + text
}

function wrapText(text: string, width: number = COLS): string[] {
  const words = text.split(' ')
  const lines: string[] = []
  let current = ''
  for (const word of words) {
    if ((current + (current ? ' ' : '') + word).length <= width) {
      current += (current ? ' ' : '') + word
    } else {
      if (current) lines.push(current)
      current = word
    }
  }
  if (current) lines.push(current)
  return lines
}

function formatBRL(value: number): string {
  return 'R$ ' + value.toFixed(2).replace('.', ',')
}

function formatDate(dateStr: string): string {
  const d = new Date(dateStr)
  return d.toLocaleString('pt-BR', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  })
}

const PAYMENT_LABELS: Record<string, string> = {
  cash: 'Dinheiro',
  credit_card: 'Cartão de Crédito',
  debit_card: 'Cartão de Débito',
  pix: 'Pix',
}

export function printThermalReceipt(order: OrderWithDetails, storeConfig?: StoreConfig | null) {
  const storeName = storeConfig?.store_name || 'AgroPreciosa'
  const storePhone = storeConfig?.store_phone || ''
  const storeAddress = storeConfig?.store_address || ''

  const isDelivery = order.delivery_type === 'delivery'
  const addr = order.delivery_address

  let lines: string[] = []
  const addLine = (text: string = '') => lines.push(text)
  const addCenter = (text: string) => addLine(center(text))
  const addPad = (l: string, r: string) => addLine(pad(l, r))
  const addSection = () => addLine(SECTION_LINE)
  const addDouble = () => addLine(DOUBLE_LINE)

  addDouble()
  addCenter(storeName.toUpperCase())
  if (storeAddress) {
    for (const l of wrapText(storeAddress)) addCenter(l)
  }
  if (storePhone) addCenter(`Tel: ${storePhone}`)
  addDouble()

  addCenter(`PEDIDO #${order.order_number}`)
  addCenter(formatDate(order.created_at))
  addSection()

  addCenter(isDelivery ? '*** ENTREGA ***' : '*** RETIRADA NA LOJA ***')
  addLine()

  addLine(`Cliente: ${order.customer?.name || 'Não identificado'}`)
  if (order.customer?.phone) addLine(`Tel: ${order.customer.phone}`)
  if (order.customer?.email) {
    for (const l of wrapText(`Email: ${order.customer.email}`)) addLine(l)
  }
  addSection()

  if (isDelivery && addr) {
    addLine('ENDEREÇO DE ENTREGA:')
    const street = [addr.street, addr.number].filter(Boolean).join(', ')
    if (street) for (const l of wrapText(street)) addLine(l)
    if (addr.complement) addLine(addr.complement)
    const cityLine = [addr.neighborhood, addr.city, addr.state].filter(Boolean).join(', ')
    if (cityLine) addLine(cityLine)
    if (addr.zipcode) addLine(`CEP: ${addr.zipcode}`)
    addSection()
  }

  addLine('ITENS DO PEDIDO:')
  addLine()
  if (order.items && order.items.length > 0) {
    for (const item of order.items) {
      const nameLines = wrapText(item.product_name)
      addLine(nameLines[0])
      for (let i = 1; i < nameLines.length; i++) addLine('  ' + nameLines[i])
      addPad(`  ${item.quantity}x ${formatBRL(item.unit_price)}`, formatBRL(item.total))
      if ((item as any).notes) {
        for (const l of wrapText(`  Obs: ${(item as any).notes}`)) addLine(l)
      }
    }
  } else {
    addLine('(Itens não carregados)')
  }
  addSection()

  addPad('Subtotal:', formatBRL(order.subtotal))
  if (order.discount_amount > 0) {
    addPad('Desconto:', `-${formatBRL(order.discount_amount)}`)
  }
  if (order.delivery_fee > 0) {
    addPad('Taxa de Entrega:', formatBRL(order.delivery_fee))
  }
  if ((order as any).installments && (order as any).installments > 1) {
    const ic = (order as any).installments
    const iv = (order as any).installment_value
    addPad('Parcelamento:', `${ic}x ${formatBRL(iv)}`)
  }
  addDouble()
  addPad('TOTAL:', formatBRL(order.total))
  addDouble()
  addLine()

  const payLabel = PAYMENT_LABELS[order.payment_method || ''] || order.payment_method || 'Não informado'
  const installInfo = (order as any).installments > 1 ? ` (${(order as any).installments}x)` : ''
  addLine(`Pagamento: ${payLabel}${installInfo}`)
  if (order.notes) {
    addLine()
    for (const l of wrapText(`Obs: ${order.notes}`)) addLine(l)
  }
  addLine()
  addSection()
  addLine()
  addCenter('Obrigado pela preferencia!')
  addCenter('Volte sempre :)')
  addLine()
  addDouble()

  const textContent = lines.join('\n')

  const printWindow = window.open('', '_blank', 'width=400,height=600')
  if (!printWindow) {
    alert('Permita pop-ups para imprimir a nota!')
    return
  }

  printWindow.document.write(`<!DOCTYPE html>
<html lang="pt-BR">
<head>
<meta charset="UTF-8" />
<title>Pedido #${order.order_number} - ${storeName}</title>
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body {
    font-family: 'Courier New', Courier, monospace;
    font-size: 12px;
    line-height: 1.2;
    color: #000;
    background: #fff;
    max-width: 80mm;
    margin: 0 auto;
    padding: 2mm;
  }
  pre {
    font-family: inherit;
    font-size: inherit;
    white-space: pre-wrap;
    word-break: break-word;
  }
  @media print {
    @page { margin: 0; }
    body { width: 100%; max-width: none; padding: 0 1mm; }
  }
</style>
</head>
<body>
<pre>${textContent}</pre>
<script>
  window.onload = function() {
    setTimeout(function() { window.print(); window.close(); }, 300);
  };
<\/script>
</body>
</html>`)
  printWindow.document.close()
}
