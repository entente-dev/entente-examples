import { createYoga, createSchema } from 'graphql-yoga'
import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { typeDefs } from './schema.js'
import { resolvers } from './resolvers.js'

// Create GraphQL Schema
const schema = createSchema({
  typeDefs,
  resolvers,
})

// Create GraphQL Yoga instance
const yoga = createYoga({
  schema,
  graphqlEndpoint: '/graphql',
  landingPage: false, // Disable default landing page to show GraphQL Playground
})

// Create Hono app
const app = new Hono()

// Enable CORS
app.use('*', cors({
  origin: ['http://localhost:3000', 'http://localhost:4001', 'http://localhost:4002'],
  allowHeaders: ['Content-Type', 'Authorization'],
  allowMethods: ['GET', 'POST', 'OPTIONS'],
}))

// Health check endpoint
app.get('/health', (c) => {
  console.log('🔧 Health check requested')
  return c.json({
    status: 'healthy',
    service: 'castle-graphql',
    version: '0.1.0',
    timestamp: new Date().toISOString(),
    endpoints: {
      graphql: '/graphql',
      health: '/health',
    },
  })
})

// Root endpoint redirects to GraphQL playground
app.get('/', (c) => {
  console.log('🏠 Root endpoint accessed, redirecting to GraphQL playground')
  return c.redirect('/graphql')
})

// GraphQL endpoint
app.all('/graphql', async (c) => {
  const response = await yoga.fetch(c.req.raw, {
    // Add any Cloudflare Workers environment variables here if needed
  })
  return response
})

// 404 handler
app.notFound((c) => {
  console.log(`❌ Not found: ${c.req.method} ${c.req.path}`)
  return c.json({
    error: 'Not Found',
    message: `Endpoint ${c.req.method} ${c.req.path} not found`,
    availableEndpoints: {
      graphql: '/graphql (GET, POST)',
      health: '/health (GET)',
      root: '/ (GET - redirects to /graphql)',
    },
  }, 404)
})

// Error handler
app.onError((err, c) => {
  console.error('💥 Application error:', err)
  return c.json({
    error: 'Internal Server Error',
    message: 'An unexpected error occurred',
    timestamp: new Date().toISOString(),
  }, 500)
})

export default app