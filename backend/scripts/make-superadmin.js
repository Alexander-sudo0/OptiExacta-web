const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function main() {
  // Find Alexandra by email
  const users = await prisma.user.findMany({
    select: {
      id: true,
      email: true,
      systemRole: true,
    },
  })

  console.log('Current users:')
  console.table(users)

  if (users.length === 0) {
    console.log('No users found')
    return
  }

  // Update the first user (Alexandra) to SUPER_ADMIN
  const alexandra = users[0]
  console.log(`\nUpdating ${alexandra.email} to SUPER_ADMIN...`)

  const updated = await prisma.user.update({
    where: { id: alexandra.id },
    data: { systemRole: 'SUPER_ADMIN' },
  })

  console.log('Updated:', updated)
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
