// src/scripts/create-admin.ts
import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

async function main() {
    const email = 'admin@daksend.com'
    const password = 'password123'

    const hashedPassword = await bcrypt.hash(password, 10)

    const user = await prisma.user.upsert({
        where: { email },
        update: {
            role: 'admin'
        },
        create: {
            email,
            name: 'Admin User',
            password: hashedPassword,
            role: 'admin',
        },
    })

    console.log(`✅ Admin user created!`)
    console.log(`Email: ${email}`)
    console.log(`Password: ${password}`)
}

main()
    .catch((e) => {
        console.error(e)
        process.exit(1)
    })
    .finally(async () => {
        await prisma.$disconnect()
    })
