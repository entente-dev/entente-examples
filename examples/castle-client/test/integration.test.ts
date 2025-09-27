import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { createClient } from '@entente/consumer'
import type { LocalMockData } from '@entente/types'
import dotenv from 'dotenv'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { CastleApiClient } from '../src/castle-api.js'
import { RulersGraphQLClient } from '../src/graphql-api.js'
import { createGraphQLMockServer, type GraphQLMockServer } from './graphql-mock-server.js'

dotenv.config()

describe('Castle-Ruler Integration Tests', () => {
  let client: ReturnType<typeof createClient>
  let castleMock: Awaited<ReturnType<typeof client.createMock>>
  let graphqlMockServer: GraphQLMockServer
  let graphqlInterceptor: Awaited<ReturnType<typeof client.patchRequests>> | null = null
  let castleApi: CastleApiClient
  let rulersApi: RulersGraphQLClient

  beforeAll(async () => {
    const castleMockDataPath = join(process.cwd(), 'mocks', 'castle-service.json')
    const castleLocalMockData: LocalMockData = JSON.parse(readFileSync(castleMockDataPath, 'utf-8'))

    client = await createClient({
      serviceUrl: process.env.ENTENTE_SERVICE_URL || '',
      apiKey: process.env.ENTENTE_API_KEY || '',
      consumer: 'castle-client',
      environment: 'test',
      recordingEnabled: process.env.CI === 'true',
    })

    // Create REST API mock using entente
    castleMock = await client.createMock('castle-service', '0.1.0', {
      useFixtures: true,
      validateRequests: true,
      validateResponses: true,
      localMockData: castleLocalMockData,
    })

    // Create GraphQL mock server (standalone) and use interceptor
    graphqlMockServer = await createGraphQLMockServer()
    console.log(`📡 GraphQL mock server started at ${graphqlMockServer.url}`)

    // Set up request interceptor for castle-graphql service
    graphqlInterceptor = await client.patchRequests('castle-graphql', '0.1.0', {
      recording: true,
      filter: (url) => url.includes(graphqlMockServer.url),
    })

    castleApi = new CastleApiClient(castleMock.url, undefined, graphqlMockServer.url)
    rulersApi = new RulersGraphQLClient(graphqlMockServer.url)
  })

  afterAll(async () => {
    if (castleMock) {
      await castleMock.close()
    }
    if (graphqlInterceptor) {
      await graphqlInterceptor.unpatch()
      graphqlInterceptor = null
    }
    if (graphqlMockServer) {
      await graphqlMockServer.close()
    }
  })

  it('should fetch castle and its associated rulers', async () => {
    const castles = await castleApi.getAllCastles()
    expect(castles.length).toBeGreaterThan(0)

    const castle = castles[0]
    expect(castle).toHaveProperty('id')

    const rulers = await rulersApi.getRulersByCastle(castle.id)

    expect(Array.isArray(rulers)).toBe(true)

    if (rulers.length > 0) {
      const ruler = rulers[0]
      expect(ruler.castleIds).toContain(castle.id)
    }
  })

  it('should verify data consistency between services', async () => {
    const versaillesCastle = await castleApi.getCastleById('550e8400-e29b-41d4-a716-446655440000')
    expect(versaillesCastle.name).toBe('Château de Versailles')

    const versaillesRulers = await rulersApi.getRulersByCastle(versaillesCastle.id)
    expect(versaillesRulers.length).toBeGreaterThan(0)

    for (const ruler of versaillesRulers) {
      expect(ruler.castleIds).toContain(versaillesCastle.id)
    }

    const louisXIV = versaillesRulers.find(r => r.id === 'ruler-louis-xiv-001')
    expect(louisXIV).toBeDefined()
    expect(louisXIV!.name).toBe('Louis XIV')
    expect(louisXIV!.title).toBe('The Sun King')
  })

  it('should handle multiple castle associations correctly', async () => {
    const versaillesCastle = await castleApi.getCastleById('550e8400-e29b-41d4-a716-446655440000')
    expect(versaillesCastle.name).toBe('Château de Versailles')

    const versaillesRulers = await rulersApi.getRulersByCastle(versaillesCastle.id)
    expect(versaillesRulers.length).toBeGreaterThan(0)

    const louisXIV = versaillesRulers.find(r => r.id === 'ruler-louis-xiv-001')
    expect(louisXIV).toBeDefined()
    expect(louisXIV!.castleIds).toContain(versaillesCastle.id)
    expect(louisXIV!.name).toBe('Louis XIV')
  })

  it('should get castle with rulers using integrated method', async () => {
    const castleId = '550e8400-e29b-41d4-a716-446655440000'
    const castleWithRulers = await castleApi.getCastleWithRulers(castleId)

    expect(castleWithRulers.id).toBe(castleId)
    expect(castleWithRulers.name).toBe('Château de Versailles')
    expect(castleWithRulers.region).toBe('Île-de-France')
    expect(castleWithRulers.yearBuilt).toBe(1623)

    expect(Array.isArray(castleWithRulers.rulers)).toBe(true)
    expect(castleWithRulers.rulers.length).toBeGreaterThan(0)

    for (const ruler of castleWithRulers.rulers) {
      expect(ruler.castleIds).toContain(castleId)
    }

    const louisXIV = castleWithRulers.rulers.find(r => r.id === 'ruler-louis-xiv-001')
    expect(louisXIV).toBeDefined()
    expect(louisXIV!.name).toBe('Louis XIV')
  })

  it('should get all castles with rulers', async () => {
    const castlesWithRulers = await castleApi.getAllCastlesWithRulers()

    expect(Array.isArray(castlesWithRulers)).toBe(true)
    expect(castlesWithRulers.length).toBeGreaterThan(0)

    const castleWithRulers = castlesWithRulers[0]
    expect(castleWithRulers).toHaveProperty('id')
    expect(castleWithRulers).toHaveProperty('name')
    expect(castleWithRulers).toHaveProperty('region')
    expect(castleWithRulers).toHaveProperty('yearBuilt')
    expect(castleWithRulers).toHaveProperty('rulers')
    expect(Array.isArray(castleWithRulers.rulers)).toBe(true)
  })

  it('should get castles by region with rulers', async () => {
    const region = 'Île-de-France'
    const castlesWithRulers = await castleApi.getCastlesByRegionWithRulers(region)

    expect(Array.isArray(castlesWithRulers)).toBe(true)
    expect(castlesWithRulers.length).toBeGreaterThan(0)

    for (const castleWithRulers of castlesWithRulers) {
      expect(castleWithRulers.region.toLowerCase()).toContain(region.toLowerCase())
      expect(Array.isArray(castleWithRulers.rulers)).toBe(true)
    }
  })
})