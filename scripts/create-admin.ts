import { createClient } from '@supabase/supabase-js'
import { createInterface } from 'node:readline/promises'
import { stdin, stdout } from 'node:process'

process.loadEnvFile(new URL('../.env', import.meta.url))

const supabaseUrl = process.env.VITE_SUPABASE_URL as string
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY as string

if (!supabaseUrl || !serviceRoleKey) {
  throw new Error('VITE_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY missing in .env')
}

const supabase = createClient(supabaseUrl, serviceRoleKey)

async function main() {
  const rl = createInterface({ input: stdin, output: stdout })
  const email = (await rl.question('Admin e-posta adresi: ')).trim()
  const password = await rl.question('Admin şifresi: ')
  rl.close()

  if (!email || password.length < 6) {
    throw new Error('Geçerli bir e-posta ve en az 6 karakterlik bir şifre girin.')
  }

  const { data, error } = await supabase.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  })
  if (error) throw error

  console.log(`\nAdmin kullanıcı oluşturuldu: ${data.user?.email} (id: ${data.user?.id})`)
}

main().catch((err) => {
  console.error(err.message ?? err)
  process.exit(1)
})
