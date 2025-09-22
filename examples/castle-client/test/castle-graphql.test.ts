import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { createClient } from '@entente/consumer'
import type { LocalMockData } from '@entente/types'
import dotenv from 'dotenv'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { RulersGraphQLClient } from '../src/graphql-api.js'

dotenv.config()

describe('Castle GraphQL Consumer Contract Tests', () => {
  let client: ReturnType<typeof createClient>
  let graphqlMock: Awaited<ReturnType<typeof client.createMock>>
  let rulersApi: RulersGraphQLClient

  beforeAll(async () => {
    const graphqlMockDataPath = join(process.cwd(), 'mocks', 'castle-graphql.json')
    const graphqlLocalMockData: LocalMockData = JSON.parse(readFileSync(graphqlMockDataPath, 'utf-8'))

    client = await createClient({
      serviceUrl: process.env.ENTENTE_SERVICE_URL || '',
      apiKey: process.env.ENTENTE_API_KEY || '',
      consumer: 'castle-client',
      environment: 'test',
      recordingEnabled: process.env.CI === 'true',
    })

    graphqlMock = await client.createMock('castle-graphql', '0.1.0', {
      useFixtures: true,
      validateRequests: true,
      validateResponses: true,
      localMockData: graphqlLocalMockData,
    })

    rulersApi = new RulersGraphQLClient(graphqlMock.url)
  })

  afterAll(async () => {
    if (graphqlMock) {
      await graphqlMock.close()
    }
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

  describe('Mock Server Features', () => {
    it('should use fixtures if available for graphql service', () => {
      const fixtures = graphqlMock.getFixtures()

      expect(fixtures).toBeDefined()
      expect(Array.isArray(fixtures)).toBe(true)
    })
  })
})