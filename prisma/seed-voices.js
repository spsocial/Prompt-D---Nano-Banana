const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

// เสียง ElevenLabs ทั้งหมด 7 เสียง (ชาย 4 หญิง 3)
const ELEVENLABS_VOICES = [
  // เสียงชาย (4 เสียง)
  {
    voiceId: 'AXw7rxvMAEe68vknaJRv',
    name: 'เสียงกวนทีน',
    gender: 'male',
    description: 'เสียงโคลนพิเศษ - สไตล์กวนๆ สนุกสนาน',
    sortOrder: 1
  },
  {
    voiceId: 'oKIE62mvU7YR0KSC6cjd',
    name: 'เสียงพี่ชิล',
    gender: 'male',
    description: 'เสียงผู้ชายสบายๆ - โทนสบายๆ กันเอง ฟังง่าย',
    sortOrder: 2
  },
  {
    voiceId: 'gkEgy6IJoIagFuyBcxDu',
    name: 'เสียงบอส',
    gender: 'male',
    description: 'เสียงผู้ชายห้วนๆ - โทนผู้ใหญ่ มีน้ำหนัก',
    sortOrder: 3
  },
  {
    voiceId: 'fJnvnbC7A9PHKFt2Zi5I',
    name: 'เสียงนักพูด',
    gender: 'male',
    description: 'เสียงผู้ชายกลางๆ - พูดเก่ง ชัดเจน เหมาะกับนำเสนอ',
    sortOrder: 4
  },
  // เสียงหญิง (3 เสียง)
  {
    voiceId: 'ocXeZcpfl3y8l2JH0Dyv',
    name: 'เสียงน้องมิ้นท์',
    gender: 'female',
    description: 'เสียงผู้หญิงน่ารัก - น้ำเสียงหวาน เป็นกันเอง',
    sortOrder: 5
  },
  {
    voiceId: 'yvV1FSiWQfVfAv6TKN2O',
    name: 'เสียงพี่พอด',
    gender: 'female',
    description: 'เสียงผู้หญิงโทนต่ำ - สไตล์ podcast มีน้ำหนัก เป็นผู้ใหญ่',
    sortOrder: 6
  },
  {
    voiceId: 'GYFXpkcXjA3N82uHvHn3',
    name: 'เสียงสบายหู',
    gender: 'female',
    description: 'เสียงผู้หญิงน่าฟัง - ฟังสบาย ไพเราะ เหมาะกับเนื้อหายาว',
    sortOrder: 7
  }
]

async function main() {
  console.log('🎙️ Starting voice seeding...')

  for (const voice of ELEVENLABS_VOICES) {
    const result = await prisma.voice.upsert({
      where: { voiceId: voice.voiceId },
      update: {
        name: voice.name,
        gender: voice.gender,
        description: voice.description,
        sortOrder: voice.sortOrder
      },
      create: {
        voiceId: voice.voiceId,
        name: voice.name,
        provider: 'elevenlabs',
        gender: voice.gender,
        description: voice.description,
        sortOrder: voice.sortOrder,
        isActive: true
      }
    })

    console.log(`✅ ${result.name} (${result.gender}) - ${result.voiceId}`)
  }

  console.log('\n🎉 Voice seeding completed!')
  console.log(`📊 Total voices: ${ELEVENLABS_VOICES.length}`)
}

main()
  .catch((e) => {
    console.error('❌ Error seeding voices:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
