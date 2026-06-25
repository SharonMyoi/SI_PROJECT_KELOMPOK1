import { Hono } from 'hono'
import { z } from 'zod'
import { supabaseAdmin } from '../lib/supabase.js'
import { authMiddleware, type AuthEnv } from '../middleware/auth.js'

const orders = new Hono<AuthEnv>()
orders.use('/*', authMiddleware)

const newId = (prefix: string) => `${prefix}${Date.now()}${Math.floor(Math.random() * 1000)}`
const code = (n: number) => {
  const now = new Date()
  const year = String(now.getFullYear()).slice(-2)
  const month = String(now.getMonth() + 1).padStart(2, '0')
  return `ORD-${year}${month}-${String(n).padStart(4, '0')}`
}

orders.get('/', async (c) => {
  const { data: orderData } = await supabaseAdmin.from('orders').select('*').order('created_at', { ascending: true })
  const { data: subData } = await supabaseAdmin.from('subtasks').select('*')
  const { data: ptData } = await supabaseAdmin.from('point_entries').select('*')

  const subs = (subData ?? []).map((s: any) => ({
    id: s.id, orderId: s.order_id, productId: s.product_id, partName: s.part_name,
    point: s.point ?? 0, assignedTo: s.assigned_to ?? undefined,
    status: s.status, startedAt: s.started_at ?? undefined, finishedAt: s.finished_at ?? undefined,
  }))

  const result = (orderData ?? []).map((o: any) => ({
    id: o.id, code: o.code, type: o.type, productId: o.product_id, productName: o.product_name,
    quantity: o.quantity, customerName: o.customer_name, customerPhone: o.customer_phone,
    address: o.address, notes: o.notes ?? undefined, fastTrack: o.fast_track,
    status: o.status, createdAt: o.created_at, deadline: o.deadline,
    resi: o.resi ?? undefined, shippedAt: o.shipped_at ?? undefined, source: o.source ?? undefined,
    isOnline: o.is_online ?? true,
    subtasks: subs.filter((s: any) => s.orderId === o.id),
  }))

  return c.json({ orders: result, points: ptData ?? [] })
})

const orderCreateSchema = z.object({
  productId: z.string().min(1),
  quantity: z.number().min(1),
  customerName: z.string().min(1),
  customerPhone: z.string().optional().default(''),
  address: z.string().optional().default(''),
  notes: z.string().optional(),
  fastTrack: z.boolean().optional().default(false),
  type: z.enum(['custom', 'ready_stock']).optional(),
  source: z.string().optional(),
  deadline: z.string().optional(),
  locationName: z.string().optional(),
  isOnline: z.boolean().optional(),
})

orders.post('/', async (c) => {
  const body = await c.req.json()
  const parsed = orderCreateSchema.safeParse(body)
  if (!parsed.success) {
    const first = parsed.error.errors[0]
    return c.json({ error: `${first.path.join('.')}: ${first.message}` }, 400)
  }
  const { productId, type, quantity, customerName, customerPhone, address, notes, fastTrack, source, deadline, locationName, isOnline } = parsed.data

  const { data: product } = await supabaseAdmin.from('products').select('*').eq('id', productId).single()
  if (!product) return c.json({ error: 'Produk tidak ditemukan' }, 404)

  const { data: stocksList } = await supabaseAdmin.from('product_stocks').select('*')
  const stockValues = (stocksList ?? []).filter((s: any) => s.product_id === productId).map((s: any) => s.stock ?? 0)
  const totalStock = stockValues.reduce((a: number, b: number) => a + b, 0)
  let effType = type || 'custom'
  if (effType === 'ready_stock' && totalStock < quantity) effType = 'custom'
  const effFastTrack = effType === 'ready_stock' ? false : !!fastTrack

  const now = new Date()
  const prefix = `ORD-${String(now.getFullYear()).slice(-2)}${String(now.getMonth() + 1).padStart(2, '0')}-`
  const { data: existingOrders } = await supabaseAdmin.from('orders').select('code').like('code', `${prefix}%`)
  let nextNum = 1
  if (existingOrders && existingOrders.length > 0) {
    const nums = existingOrders.map((o: any) => {
      const n = parseInt(o.code.replace(prefix, ''), 10)
      return isNaN(n) ? 0 : n
    })
    nextNum = Math.max(...nums) + 1
  }

  const orderId = newId('o')
  const orderCode = code(nextNum)
  const orderStatus = effType === 'ready_stock' ? 'Siap Kirim' : 'Antrean'
  const nowIso = now.toISOString()
  const formattedDeadline = deadline ? new Date(deadline).toISOString() : nowIso

  const { error: oErr } = await supabaseAdmin.from('orders').insert({
    id: orderId, code: orderCode, type: effType,
    product_id: product.id, product_name: product.name,
    quantity, customer_name: customerName, customer_phone: customerPhone,
    address, notes: notes ?? '', fast_track: effFastTrack,
    status: orderStatus, source: source ?? null, deadline: formattedDeadline,
    is_online: isOnline ?? true, resi: null, shipped_at: null, created_at: nowIso, updated_at: nowIso,
  })
  if (oErr) return c.json({ error: 'Gagal membuat order: ' + oErr.message }, 500)

  let tempSubtasks: any[] = []
  if (effType !== 'ready_stock' && product.parts) {
    const subs = product.parts.map((part: any) => ({
      id: `${orderId}-${part.name}`, order_id: orderId,
      product_id: product.id, part_name: part.name,
      point: part.point ?? 0, status: 'Antrean' as const,
    }))
    if (subs.length) {
      const { error: subErr } = await supabaseAdmin.from('subtasks').insert(subs)
      if (!subErr) {
        tempSubtasks = subs.map((s: any) => ({
          id: s.id, orderId: s.order_id, productId: s.product_id,
          partName: s.part_name, point: s.point ?? 0, status: s.status,
        }))
      }
    }
  }

  if (effType === 'ready_stock') {
    const { data: locs } = await supabaseAdmin.from('locations').select('*')
    const matchedLoc = (locs ?? []).find((l: any) => l.name === locationName)
    const targetLocId = matchedLoc?.id ?? (locs?.[0]?.id ?? 'loc-default')
    const { data: existing } = await supabaseAdmin.from('product_stocks')
      .select('stock').eq('product_id', productId).eq('location_id', targetLocId).maybeSingle()
    const currentQty = existing ? (existing.stock ?? 0) : 0
    const { error: stockErr } = await supabaseAdmin.from('product_stocks').upsert({
      product_id: productId, location_id: targetLocId, stock: Math.max(0, currentQty - quantity),
    }, { onConflict: 'product_id,location_id' })
    if (stockErr) {
      await supabaseAdmin.from('orders').delete().eq('id', orderId)
      return c.json({ error: 'Gagal memperbarui stok: ' + stockErr.message }, 500)
    }
  }

  return c.json({ ok: true, id: orderId, code: orderCode, type: effType, status: orderStatus, subtasks: tempSubtasks })
})

orders.put('/:id', async (c) => {
  const id = c.req.param('id')
  const body = await c.req.json()
  const nowIso = new Date().toISOString()

  const { data: oldOrder } = await supabaseAdmin.from('orders').select('*').eq('id', id).single()
  if (!oldOrder) return c.json({ error: 'Order tidak ditemukan' }, 404)
  const { data: product } = await supabaseAdmin.from('products').select('*').eq('id', body.productId).single()
  const productName = product ? product.name : undefined

  const { data: locs } = await supabaseAdmin.from('locations').select('*')
  const matchedLoc = (locs ?? []).find((l: any) => l.name === body.locationName)
  const targetLocId = matchedLoc?.id ?? (locs?.[0]?.id ?? 'loc-default')

  const finalFastTrack = body.type === 'ready_stock' ? false : !!body.fastTrack
  let nextStatus = oldOrder.status
  if (oldOrder.type !== 'ready_stock' && body.type === 'ready_stock') nextStatus = 'Siap Kirim'
  else if (oldOrder.type === 'ready_stock' && body.type !== 'ready_stock') nextStatus = 'Antrean'

  const { error } = await supabaseAdmin.from('orders').update({
    product_id: body.productId, product_name: productName,
    quantity: body.quantity, customer_name: body.customerName,
    customer_phone: body.customerPhone, address: body.address,
    notes: body.notes ?? '', type: body.type,
    fast_track: finalFastTrack, deadline: body.deadline,
    source: body.source ?? null, is_online: body.isOnline ?? true,
    status: nextStatus, updated_at: nowIso,
  }).eq('id', id)
  if (error) return c.json({ error: 'Gagal memperbarui order' }, 500)

  if (oldOrder.type !== 'ready_stock' && body.type === 'ready_stock') {
    await supabaseAdmin.from('subtasks').delete().eq('order_id', id)
    const { data: existing } = await supabaseAdmin.from('product_stocks')
      .select('stock').eq('product_id', body.productId).eq('location_id', targetLocId).maybeSingle()
    const currentQty = existing ? (existing.stock ?? 0) : 0
    await supabaseAdmin.from('product_stocks').upsert({
      product_id: body.productId, location_id: targetLocId, stock: Math.max(0, currentQty - body.quantity),
    }, { onConflict: 'product_id,location_id' })
  } else if (oldOrder.type === 'ready_stock' && body.type !== 'ready_stock') {
    if (oldOrder.status !== 'Selesai') {
      const { data: existing } = await supabaseAdmin.from('product_stocks')
        .select('stock').eq('product_id', oldOrder.product_id).eq('location_id', targetLocId).maybeSingle()
      const currentQty = existing ? (existing.stock ?? 0) : 0
      await supabaseAdmin.from('product_stocks').upsert({
        product_id: oldOrder.product_id, location_id: targetLocId, stock: currentQty + oldOrder.quantity,
      }, { onConflict: 'product_id,location_id' })
    }
    if (product) {
      const newSubs = product.parts.map((part: any) => ({
        id: `${id}-${part.name}`, order_id: id, product_id: product.id,
        part_name: part.name, point: part.point ?? 0, status: 'Antrean' as const,
      }))
      await supabaseAdmin.from('subtasks').delete().eq('order_id', id)
      if (newSubs.length) await supabaseAdmin.from('subtasks').insert(newSubs)
    }
  } else if (oldOrder.type === 'ready_stock' && body.type === 'ready_stock') {
    if (oldOrder.product_id === body.productId) {
      const delta = oldOrder.quantity - body.quantity
      if (delta !== 0) {
        const { data: existing } = await supabaseAdmin.from('product_stocks')
          .select('stock').eq('product_id', body.productId).eq('location_id', targetLocId).maybeSingle()
        const currentQty = existing ? (existing.stock ?? 0) : 0
        await supabaseAdmin.from('product_stocks').upsert({
          product_id: body.productId, location_id: targetLocId, stock: Math.max(0, currentQty + delta),
        }, { onConflict: 'product_id,location_id' })
      }
    } else {
      if (oldOrder.status !== 'Selesai') {
        const { data: existing } = await supabaseAdmin.from('product_stocks')
          .select('stock').eq('product_id', oldOrder.product_id).eq('location_id', targetLocId).maybeSingle()
        const currentQty = existing ? (existing.stock ?? 0) : 0
        await supabaseAdmin.from('product_stocks').upsert({
          product_id: oldOrder.product_id, location_id: targetLocId, stock: currentQty + oldOrder.quantity,
        }, { onConflict: 'product_id,location_id' })
      }
      const { data: existing } = await supabaseAdmin.from('product_stocks')
        .select('stock').eq('product_id', body.productId).eq('location_id', targetLocId).maybeSingle()
      const currentQty = existing ? (existing.stock ?? 0) : 0
      await supabaseAdmin.from('product_stocks').upsert({
        product_id: body.productId, location_id: targetLocId, stock: Math.max(0, currentQty - body.quantity),
      }, { onConflict: 'product_id,location_id' })
    }
  } else if (oldOrder.type !== 'ready_stock' && body.type !== 'ready_stock') {
    if (oldOrder.product_id !== body.productId) {
      await supabaseAdmin.from('subtasks').delete().eq('order_id', id)
      if (product && product.parts) {
        const newSubs = product.parts.map((part: any) => ({
          id: `${id}-${part.name}`, order_id: id, product_id: product.id,
          part_name: part.name, point: part.point ?? 0, status: 'Antrean' as const,
        }))
        if (newSubs.length) await supabaseAdmin.from('subtasks').insert(newSubs)
      }
    }
  }

  return c.json({ ok: true })
})

orders.post('/:id/subtask/assign', async (c) => {
  const { subtaskId, userId } = await c.req.json() as any
  const { error } = await supabaseAdmin.from('subtasks').update({
    assigned_to: userId, status: 'Antrean', started_at: null,
  }).eq('id', subtaskId)
  if (error) return c.json({ error: 'Gagal assign subtask' }, 500)
  return c.json({ ok: true })
})

orders.post('/:id/subtask/unassign', async (c) => {
  const { subtaskId } = await c.req.json() as any
  const { error } = await supabaseAdmin.from('subtasks').update({
    assigned_to: null, status: 'Antrean', started_at: null,
  }).eq('id', subtaskId)
  if (error) return c.json({ error: 'Gagal unassign subtask' }, 500)
  return c.json({ ok: true })
})

orders.post('/:id/subtask/start', async (c) => {
  const orderId = c.req.param('id')
  const { subtaskId } = await c.req.json() as any
  const now = new Date().toISOString()
  const { error } = await supabaseAdmin.from('subtasks').update({
    status: 'Sedang Dikerjakan', started_at: now,
  }).eq('id', subtaskId)
  if (error) return c.json({ error: 'Gagal start subtask' }, 500)
  const { data: order } = await supabaseAdmin.from('orders').select('status').eq('id', orderId).single()
  if (order && order.status === 'Antrean') {
    await supabaseAdmin.from('orders').update({ status: 'Sedang Dikerjakan', updated_at: now }).eq('id', orderId)
  }
  return c.json({ ok: true })
})

orders.post('/:id/subtask/finish', async (c) => {
  const orderId = c.req.param('id')
  const { subtaskId } = await c.req.json() as any
  const now = new Date().toISOString()

  const { data: existingSub } = await supabaseAdmin.from('subtasks').select('status').eq('id', subtaskId).single()
  if (existingSub?.status === 'Selesai') {
    return c.json({ ok: true })
  }

  await supabaseAdmin.from('subtasks').update({ status: 'Selesai', finished_at: now }).eq('id', subtaskId)
  const { data: order } = await supabaseAdmin.from('orders').select('*').eq('id', orderId).single()
  const sub = order ? await supabaseAdmin.from('subtasks').select('*').eq('id', subtaskId).single() : null
  if (sub?.data?.assigned_to) {
    const ptId = newId('pt')
    const { error: ptErr } = await supabaseAdmin.from('point_entries').insert({
      id: ptId,
      user_id: sub.data.assigned_to,
      subtask_id: sub.data.id,
      order_id: orderId,
      order_code: order.code,
      product_name: order.product_name,
      part_name: sub.data.part_name,
      point: sub.data.point ?? 0,
      date: now,
      description: `Menyelesaikan part ${sub.data.part_name} produk ${order.product_name ?? ''}`,
    })
    if (ptErr) {
      console.error('Gagal menyimpan poin:', ptErr.message)
    }
  }
  const { data: allSubs } = await supabaseAdmin.from('subtasks').select('status').eq('order_id', orderId)
  const allDone = (allSubs ?? []).every((s: any) => s.status === 'Selesai')
  if (allDone) {
    const { data: currentOrder } = await supabaseAdmin.from('orders').select('status').eq('id', orderId).single()
    if (currentOrder && currentOrder.status !== 'Penyusunan' && currentOrder.status !== 'Selesai') {
      await supabaseAdmin.from('orders').update({ status: 'Penyusunan', updated_at: now }).eq('id', orderId)
    }
  }
  return c.json({ ok: true })
})

orders.post('/:id/finish', async (c) => {
  const id = c.req.param('id')
  const now = new Date().toISOString()

  const { data: currentOrder } = await supabaseAdmin.from('orders').select('status, is_online').eq('id', id).single()
  if (!currentOrder) return c.json({ error: 'Order tidak ditemukan' }, 404)
  if (currentOrder.status === 'Selesai') return c.json({ ok: true })

  const nextStatus = currentOrder.is_online ? 'Siap Kirim' : 'Selesai'
  await supabaseAdmin.from('orders').update({ status: nextStatus, updated_at: now }).eq('id', id)
  return c.json({ ok: true, status: nextStatus })
})

orders.post('/:id/set-resi', async (c) => {
  const id = c.req.param('id')
  const { resi } = await c.req.json() as any
  if (!resi || !resi.trim()) return c.json({ error: 'Nomor resi harus diisi' }, 400)
  const now = new Date().toISOString()
  await supabaseAdmin.from('orders').update({ status: 'Selesai', resi: resi.trim(), shipped_at: now, updated_at: now }).eq('id', id)
  return c.json({ ok: true })
})

orders.delete('/:id', async (c) => {
  const id = c.req.param('id')
  const { data: orderToDelete } = await supabaseAdmin.from('orders').select('*').eq('id', id).single()
  if (!orderToDelete) return c.json({ error: 'Order tidak ditemukan' }, 404)

  // Ready stock: hapus langsung, restore stok jika belum Selesai
  if (orderToDelete.type === 'ready_stock') {
    await supabaseAdmin.from('subtasks').delete().eq('order_id', id)
    await supabaseAdmin.from('orders').delete().eq('id', id)
    if (orderToDelete.status !== 'Selesai') {
      const { data: locs } = await supabaseAdmin.from('locations').select('*')
      const defaultLocId = locs?.[0]?.id ?? 'loc-default'
      const { data: existing } = await supabaseAdmin.from('product_stocks')
        .select('stock').eq('product_id', orderToDelete.product_id).eq('location_id', defaultLocId).maybeSingle()
      const currentQty = existing ? (existing.stock ?? 0) : 0
      await supabaseAdmin.from('product_stocks').upsert({
        product_id: orderToDelete.product_id, location_id: defaultLocId, stock: currentQty + orderToDelete.quantity,
      }, { onConflict: 'product_id,location_id' })
    }
    return c.json({ ok: true })
  }

  // Custom: jika sudah Selesai, hapus langsung tanpa cek assigned
  if (orderToDelete.status === 'Selesai') {
    await supabaseAdmin.from('subtasks').delete().eq('order_id', id)
    await supabaseAdmin.from('orders').delete().eq('id', id)
    return c.json({ ok: true })
  }

  // Custom: cek apakah ada subtask yang sudah ditugaskan ke pengrajin
  const { data: assignedSubtasks } = await supabaseAdmin
    .from('subtasks')
    .select('id')
    .eq('order_id', id)
    .not('assigned_to', 'is', null)
    .limit(1)

  if (assignedSubtasks && assignedSubtasks.length > 0) {
    return c.json({
      error: 'Tidak bisa dihapus, subtask sudah ditugaskan ke pengrajin. Unassign terlebih dahulu.'
    }, 400)
  }

  await supabaseAdmin.from('subtasks').delete().eq('order_id', id)
  await supabaseAdmin.from('orders').delete().eq('id', id)
  return c.json({ ok: true })
})

export { orders }
