import 'dotenv/config'
import { serve } from '@hono/node-server'
import app from './index.js'

const port = Number.parseInt(process.env.PORT || '4002', 10)

console.log(`👑 Rulers GraphQL Service starting on port ${port}`)

serve(
  {
    fetch: app.fetch,
    port,
  },
  info => {
    console.log(`👑 Rulers GraphQL Service is running on http://localhost:${info.port}`)
    console.log(`🎮 GraphQL Playground: http://localhost:${info.port}/graphql`)
    console.log(`🔧 Health check: http://localhost:${info.port}/health`)
    console.log(`🚀 Root redirects to playground: http://localhost:${info.port}/`)
    console.log('')
    console.log('Sample GraphQL Queries:')
    console.log('  • listRulers')
    console.log('  • getRuler(id: "ruler-louis-xiv-001")')
    console.log('  • getRulersByCastle(castleId: "castle-versailles-001")')
    console.log('  • getRulersByHouse(house: "Bourbon")')
    console.log('  • getRulersByPeriod(startYear: 1600, endYear: 1700)')
  }
)