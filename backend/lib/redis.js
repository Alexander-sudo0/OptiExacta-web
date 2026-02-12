const { createClient } = require('redis')

let client

async function getRedisClient() {
  if (client) {
    return client
  }

  const url = process.env.REDIS_URL
  if (!url) {
    throw new Error('REDIS_URL is not set')
  }

  client = createClient({ url })
  client.on('error', (error) => {
    console.error('Redis client error', error)
  })

  await client.connect()
  return client
}

module.exports = {
  getRedisClient
}
