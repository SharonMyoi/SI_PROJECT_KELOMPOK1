import { Hono } from 'hono'
import { supabaseAdmin } from '../lib/supabase.js'
import { authMiddleware, type AuthEnv } from '../middleware/auth.js'

const users = new Hono<AuthEnv>()
users.use('/*', authMiddleware)

users.put('/:id', async (c) => {
  const id = c.req.param('id')
  const body = await c.req.json() as any
  const dbPatch: Record<string, any> = { updated_at: new Date().toISOString() }
  
  if (body.username !== undefined) {
    const newUsername = String(body.username).trim().toLowerCase()
    dbPatch.username = newUsername
    const newEmail = `${newUsername}@prodify.local`
    try {
      const { error: authErr } = await supabaseAdmin.auth.admin.updateUserById(id, { email: newEmail })
      if (authErr && authErr.status !== 404) {
        console.warn('Gagal memperbarui email auth:', authErr.message)
      }
    } catch (e: any) {
      console.warn('Gagal memperbarui email auth (bukan UUID atau server error):', e.message)
    }
  }
  
  if (body.name !== undefined) dbPatch.name = String(body.name).trim()
  if (body.specializations !== undefined) dbPatch.specializations = body.specializations
  if (body.capacity !== undefined) dbPatch.capacity = body.capacity
  if (body.avatar !== undefined) dbPatch.avatar = body.avatar
  
  const { error } = await supabaseAdmin.from('users_app').update(dbPatch).eq('id', id)
  if (error) return c.json({ error: 'Gagal memperbarui user: ' + error.message }, 500)
  return c.json({ ok: true })
})

users.post('/:id/toggle-active', async (c) => {
  const id = c.req.param('id')
  const { data: target } = await supabaseAdmin.from('users_app').select('active').eq('id', id).single()
  if (!target) return c.json({ error: 'User tidak ditemukan' }, 404)

  if (target.active !== false) {
    const { count } = await supabaseAdmin.from('subtasks')
      .select('*', { count: 'exact', head: true })
      .eq('assigned_to', id)
      .neq('status', 'Selesai')
    if (count && count > 0) {
      return c.json({ error: 'Tidak dapat menonaktifkan: pengrajin masih memiliki tugas aktif. Selesaikan atau unassign tugas terlebih dahulu.' }, 400)
    }
  }

  const nextActive = !target.active
  const { error } = await supabaseAdmin.from('users_app').update({ active: nextActive }).eq('id', id)
  if (error) return c.json({ error: 'Gagal memperbarui status aktif' }, 500)
  return c.json({ ok: true, active: nextActive })
})

export { users }