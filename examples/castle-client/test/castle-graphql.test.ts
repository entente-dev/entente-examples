import 'dotenv/config'
import { createClient } from '@entente/consumer'
import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest'
import { RulersGraphQLClient } from '../src/graphql-api.js'
import { createGraphQLMockServer, type GraphQLMockServer } from './graphql-mock-server.js'

describe('Castle GraphQL Consumer Contract Tests', () => {
  let entente: Awaited<ReturnType<typeof createClient>>
  let mockServer: GraphQLMockServer
  let rulersApi: RulersGraphQLClient
  let interceptor: Awaited<ReturnType<typeof entente.patchRequests>> | null = null

  beforeAll(async () => {
    // Create the entente client for intercepting requests
    entente = await createClient({
      serviceUrl: process.env.ENTENTE_SERVICE_URL || '',
      apiKey: process.env.ENTENTE_API_KEY || '',
      consumer: 'castle-client',
      consumerVersion: '0.1.5',
      environment: 'test',
      recordingEnabled: process.env.CI === 'true',
    })

    // Create a GraphQL mock server (not using Entente mock - using interceptor instead)
    mockServer = await createGraphQLMockServer()
    console.log(`📡 GraphQL mock server started at ${mockServer.url}`)

    // Create the GraphQL client pointing to our mock server
    rulersApi = new RulersGraphQLClient(mockServer.url)

    // Set up request interceptor for castle-graphql service
    interceptor = await entente.patchRequests('castle-graphql', '0.1.0', {
      recording: true,
      filter: (url) => url.includes(mockServer.url), // Only intercept calls to our mock server
    })
  })

  afterEach(() => {
    // Reset data before each test
    mockServer.resetData()
  })

  afterAll(async () => {
    if (interceptor) {
      await interceptor.unpatch()
      interceptor = null
    }
    if (mockServer) {
      await mockServer.close()
    }
    // Give a moment for any final uploads to complete
    await new Promise(resolve => setTimeout(resolve, 100))
  })

  describe('GraphQL Rulers API Contract Tests', () => {
    it('should get rulers by castle ID', async () => {
      const castleId = '550e8400-e29b-41d4-a716-446655440000' // Versailles
      const rulers = await rulersApi.getRulersByCastle(castleId)

      expect(Array.isArray(rulers)).toBe(true)
      expect(rulers.length).toBeGreaterThan(0)

      const ruler = rulers[0]
      expect(ruler).toHaveProperty('id')
      expect(ruler).toHaveProperty('name')
      expect(ruler).toHaveProperty('title')
      expect(ruler).toHaveProperty('reignStart')
      expect(ruler).toHaveProperty('house')
      expect(ruler).toHaveProperty('castleIds')

      expect(typeof ruler.id).toBe('string')
      expect(typeof ruler.name).toBe('string')
      expect(typeof ruler.title).toBe('string')
      expect(typeof ruler.reignStart).toBe('number')
      expect(typeof ruler.house).toBe('string')
      expect(Array.isArray(ruler.castleIds)).toBe(true)
      expect(ruler.castleIds).toContain(castleId)
    })

    it('should get a specific ruler by ID', async () => {
      const rulerId = 'ruler-louis-xiv-001'
      const ruler = await rulersApi.getRuler(rulerId)

      expect(ruler).not.toBeNull()
      expect(ruler!.id).toBe(rulerId)
      expect(ruler!.name).toBe('Louis XIV')
      expect(ruler!.title).toBe('The Sun King')
      expect(ruler!.house).toBe('Bourbon')
    })

    it('should return null for non-existent ruler', async () => {
      const ruler = await rulersApi.getRuler('non-existent-ruler')
      expect(ruler).toBeNull()
    })

    it('should get all rulers', async () => {
      const rulers = await rulersApi.listRulers()

      expect(Array.isArray(rulers)).toBe(true)
      expect(rulers.length).toBeGreaterThan(0)

      const ruler = rulers[0]
      expect(ruler).toHaveProperty('id')
      expect(ruler).toHaveProperty('name')
      expect(ruler).toHaveProperty('title')
      expect(ruler).toHaveProperty('reignStart')
      expect(ruler).toHaveProperty('house')
      expect(ruler).toHaveProperty('castleIds')
    })

    it('should return empty array for castle with no rulers', async () => {
      const castleId = '550e8400-e29b-41d4-a716-446655440003' // Test castle
      const rulers = await rulersApi.getRulersByCastle(castleId)

      expect(Array.isArray(rulers)).toBe(true)
      expect(rulers.length).toBe(0)
    })

    it('should check health endpoint', async () => {
      const health = await rulersApi.health()

      expect(typeof health).toBe('string')
      expect(health).toContain('healthy')
    })
  })

  describe('Interceptor Features', () => {
    it('should record interactions when interceptor is enabled', () => {
      expect(interceptor).toBeDefined()
      expect(typeof interceptor?.unpatch).toBe('function')
    })
  })
})