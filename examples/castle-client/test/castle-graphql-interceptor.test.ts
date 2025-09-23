import 'dotenv/config'
import { createClient } from '@entente/consumer'
import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest'
import { RulersGraphQLClient } from '../src/graphql-api.js'
import { createGraphQLMockServer, type GraphQLMockServer } from './graphql-mock-server.js'

describe('Castle GraphQL Interceptor Tests', () => {
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
      recordingEnabled: true, // Enable recording to test the interceptor
    })

    // Create a simple GraphQL mock server (not using Entente)
    mockServer = await createGraphQLMockServer()
    console.log(`📡 GraphQL mock server started at ${mockServer.url}`)

    // Create the GraphQL client pointing to our mock server
    rulersApi = new RulersGraphQLClient(mockServer.url)

    // Set up request interceptor for castle-graphql service ONCE for all tests
    interceptor = await entente.patchRequests('castle-graphql', '0.1.0', {
      recording: true,
      filter: (url) => url.includes(mockServer.url), // Only intercept calls to our mock server
    })
  })

  afterAll(async () => {
    if (interceptor) {
      await interceptor.unpatch()
      interceptor = null
    }
    if (mockServer) {
      await mockServer.close()
    }
  })

  describe('GraphQL API Tests', () => {
    it('should query rulers by house', async () => {
      // Reset data before test
      mockServer.resetData()

      // Make real GraphQL call using fetch directly to avoid graphql-request compatibility issues
      const query = `
        query GetRulersByHouse($house: String!) {
          getRulersByHouse(house: $house) {
            id
            name
            title
            reignStart
            reignEnd
            house
            castleIds
            description
            achievements
          }
        }
      `

      const response = await fetch(`${mockServer.url}/graphql`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          query,
          variables: { house: 'Bourbon' },
        }),
      })

      const result = await response.json()
      const bourbonRulers = result.data.getRulersByHouse


      // Verify the response
      expect(Array.isArray(bourbonRulers)).toBe(true)
      expect(bourbonRulers.length).toBeGreaterThan(0)

      const ruler = bourbonRulers[0]
      expect(ruler).toHaveProperty('id')
      expect(ruler).toHaveProperty('name')
      expect(ruler).toHaveProperty('house')
      expect(ruler.house).toBe('Bourbon')
    })

    it('should query rulers by time period', async () => {
      mockServer.resetData()


      // Query rulers from 1600-1700 period using fetch directly
      const query = `
        query GetRulersByPeriod($startYear: Int!, $endYear: Int!) {
          getRulersByPeriod(startYear: $startYear, endYear: $endYear) {
            id
            name
            title
            reignStart
            reignEnd
            house
            castleIds
            description
            achievements
          }
        }
      `

      const response = await fetch(`${mockServer.url}/graphql`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          query,
          variables: { startYear: 1600, endYear: 1700 },
        }),
      })

      const result = await response.json()
      const rulers = result.data.getRulersByPeriod

      expect(Array.isArray(rulers)).toBe(true)
      expect(rulers.length).toBeGreaterThan(0)

      // Should include Louis XIV (1643-1715) and Louis XIII (1610-1643)
      const louisXIV = rulers.find(r => r.name === 'Louis XIV')
      expect(louisXIV).toBeDefined()
    })

    it('should query a specific ruler (henry-iv)', async () => {
      mockServer.resetData()


      // Query for ruler-henry-iv-001 specifically to capture this ruler in fixtures
      const query = `
        query GetRuler($id: ID!) {
          getRuler(id: $id) {
            id
            name
            title
            reignStart
            reignEnd
            house
            castleIds
            description
            achievements
          }
        }
      `

      const response = await fetch(`${mockServer.url}/graphql`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          query,
          variables: { id: 'ruler-henry-iv-001' },
        }),
      })

      const result = await response.json()
      expect(result.data.getRuler).toBeDefined()
      expect(result.data.getRuler.id).toBe('ruler-henry-iv-001')
      expect(result.data.getRuler.name).toBe('Henry IV')
      expect(result.data.getRuler.house).toBe('Bourbon')
    })

    it('should create a new ruler via GraphQL mutation', async () => {
      mockServer.resetData()


      // Create new ruler via GraphQL mutation
      const newRulerData = {
        name: 'Napoleon I',
        title: 'Emperor of the French',
        reignStart: 1804,
        reignEnd: 1814,
        house: 'Bonaparte',
        castleIds: ['550e8400-e29b-41d4-a716-446655440010'],
        achievements: ['Napoleonic Code', 'Continental System'],
      }

      // Note: We need to create a mutation method in our GraphQL client
      // For now, let's use a direct GraphQL request
      const createRulerMutation = `
        mutation CreateRuler($input: CreateRulerInput!) {
          createRuler(input: $input) {
            id
            name
            title
            reignStart
            reignEnd
            house
            castleIds
            achievements
          }
        }
      `

      const response = await fetch(`${mockServer.url}/graphql`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          query: createRulerMutation,
          variables: { input: newRulerData },
        }),
      })

      const result = await response.json()
      expect(result.data.createRuler).toBeDefined()
      expect(result.data.createRuler.name).toBe('Napoleon I')
    })

    it('should update a ruler via GraphQL mutation', async () => {
      mockServer.resetData()


      const updateRulerMutation = `
        mutation UpdateRuler($id: ID!, $input: UpdateRulerInput!) {
          updateRuler(id: $id, input: $input) {
            id
            name
            title
            description
          }
        }
      `

      const response = await fetch(`${mockServer.url}/graphql`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          query: updateRulerMutation,
          variables: {
            id: 'ruler-louis-xiv-001',
            input: {
              description: 'Updated: The most famous Sun King who built Versailles and established absolute monarchy.',
            },
          },
        }),
      })

      const result = await response.json()
      expect(result.data.updateRuler).toBeDefined()
      expect(result.data.updateRuler.description).toContain('Updated:')
    })

    it('should delete a ruler via GraphQL mutation', async () => {
      mockServer.resetData()


      const deleteRulerMutation = `
        mutation DeleteRuler($id: ID!) {
          deleteRuler(id: $id) {
            success
            message
          }
        }
      `

      const response = await fetch(`${mockServer.url}/graphql`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          query: deleteRulerMutation,
          variables: { id: 'ruler-henry-iv-001' },
        }),
      })

      const result = await response.json()
      expect(result.data.deleteRuler.success).toBe(true)
      expect(result.data.deleteRuler.message).toContain('successfully deleted')
    })

  })
})