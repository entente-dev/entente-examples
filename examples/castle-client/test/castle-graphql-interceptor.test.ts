import 'dotenv/config'
import { createClient } from '@entente/consumer'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { RulersGraphQLClient } from '../src/graphql-api.js'
import { createGraphQLMockServer, type GraphQLMockServer } from './graphql-mock-server.js'

describe('Castle GraphQL Interceptor Tests', () => {
  let entente: Awaited<ReturnType<typeof createClient>>
  let mockServer: GraphQLMockServer
  let rulersApi: RulersGraphQLClient

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
  })

  afterAll(async () => {
    if (mockServer) {
      await mockServer.close()
    }
  })

  describe('Interceptor-based GraphQL API Tests', () => {
    it('should intercept and record GraphQL query for rulers by house', async () => {
      // Reset data before test
      mockServer.resetData()

      // Set up request interceptor for castle-graphql service
      using interceptor = await entente.patchRequests('castle-graphql', '0.1.0', {
        recording: true,
        filter: (url) => url.includes(mockServer.url), // Only intercept calls to our mock server
      })

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

      // Check interceptor statistics
      const stats = interceptor.getStats()
      expect(stats.total).toBeGreaterThan(0)
      console.log(`📊 Intercepted ${stats.total} requests (${stats.fetch} fetch, ${stats.http} http)`)

      // Check intercepted calls
      const calls = interceptor.getInterceptedCalls()
      expect(calls.length).toBeGreaterThan(0)

      const graphqlCall = calls.find(call => call.request.url.includes('/graphql'))
      expect(graphqlCall).toBeDefined()
      expect(graphqlCall!.operation).toBe('Query.getRulersByHouse')
      expect(graphqlCall!.response.status).toBe(200)

      console.log(`🔍 GraphQL operation detected: ${graphqlCall!.operation}`)
      console.log(`✅ Response status: ${graphqlCall!.response.status}`)
    })

    it('should intercept GraphQL query for rulers by time period', async () => {
      mockServer.resetData()

      using interceptor = await entente.patchRequests('castle-graphql', '0.1.0', {
        recording: true,
        filter: (url) => url.includes(mockServer.url),
      })

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

      const calls = interceptor.getInterceptedCalls()
      const graphqlCall = calls.find(call => call.operation === 'Query.getRulersByPeriod')
      expect(graphqlCall).toBeDefined()
      expect(graphqlCall!.response.status).toBe(200)

      console.log(`🕐 Period query intercepted: ${graphqlCall!.operation}`)
    })

    it('should intercept GraphQL mutation for creating a ruler', async () => {
      mockServer.resetData()

      using interceptor = await entente.patchRequests('castle-graphql', '0.1.0', {
        recording: true,
        filter: (url) => url.includes(mockServer.url),
      })

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

      const calls = interceptor.getInterceptedCalls()
      const mutationCall = calls.find(call => call.operation === 'Mutation.createRuler')
      expect(mutationCall).toBeDefined()
      expect(mutationCall!.response.status).toBe(200)

      console.log(`✏️ Mutation intercepted: ${mutationCall!.operation}`)
      console.log(`👑 Created ruler: ${result.data.createRuler.name}`)
    })

    it('should intercept GraphQL mutation for updating a ruler', async () => {
      mockServer.resetData()

      using interceptor = await entente.patchRequests('castle-graphql', '0.1.0', {
        recording: true,
        filter: (url) => url.includes(mockServer.url),
      })

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

      const calls = interceptor.getInterceptedCalls()
      const mutationCall = calls.find(call => call.operation === 'Mutation.updateRuler')
      expect(mutationCall).toBeDefined()
      expect(mutationCall!.response.status).toBe(200)

      console.log(`📝 Update mutation intercepted: ${mutationCall!.operation}`)
    })

    it('should intercept GraphQL mutation for deleting a ruler', async () => {
      mockServer.resetData()

      using interceptor = await entente.patchRequests('castle-graphql', '0.1.0', {
        recording: true,
        filter: (url) => url.includes(mockServer.url),
      })

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

      const calls = interceptor.getInterceptedCalls()
      const mutationCall = calls.find(call => call.operation === 'Mutation.deleteRuler')
      expect(mutationCall).toBeDefined()
      expect(mutationCall!.response.status).toBe(200)

      console.log(`🗑️ Delete mutation intercepted: ${mutationCall!.operation}`)
    })

    it('should provide detailed statistics about intercepted calls', async () => {
      mockServer.resetData()

      using interceptor = await entente.patchRequests('castle-graphql', '0.1.0', {
        recording: true,
        filter: (url) => url.includes(mockServer.url),
      })

      // Make multiple GraphQL calls using fetch directly
      const queries = [
        {
          query: 'query { listRulers { id name title house } }',
          operation: 'Query.listRulers'
        },
        {
          query: 'query { getRuler(id: "ruler-louis-xiv-001") { id name title } }',
          operation: 'Query.getRuler'
        },
        {
          query: 'query { health }',
          operation: 'Query.health'
        }
      ]

      for (const { query } of queries) {
        await fetch(`${mockServer.url}/graphql`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ query }),
        })
      }

      const stats = interceptor.getStats()
      const calls = interceptor.getInterceptedCalls()

      expect(stats.total).toBe(3)
      expect(calls.length).toBe(3)

      // Check that all operations were detected
      const operations = calls.map(call => call.operation)
      expect(operations).toContain('Query.listRulers')
      expect(operations).toContain('Query.getRuler')
      expect(operations).toContain('Query.health')

      console.log('📋 Intercepted operations summary:')
      for (const call of calls) {
        console.log(`  - ${call.operation}: ${call.response.status} (${call.duration}ms)`)
      }

      // Verify match context is populated
      for (const call of calls) {
        expect(call.matchContext).toBeDefined()
        expect(call.matchContext.selectedOperationId).toBe(call.operation)
      }
    })
  })

  describe('Interceptor Features', () => {
    it('should demonstrate automatic cleanup with Symbol.dispose', async () => {
      mockServer.resetData()

      let interceptor: any
      {
        using _interceptor = await entente.patchRequests('castle-graphql', '0.1.0')
        interceptor = _interceptor

        // Make a health check call using fetch directly
        await fetch(`${mockServer.url}/graphql`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ query: 'query { health }' }),
        })

        expect(interceptor.isPatched()).toBe(true)
        expect(interceptor.getStats().total).toBe(1)
      } // Automatic cleanup happens here

      // After the using block, interceptor should be cleaned up
      expect(interceptor.isPatched()).toBe(false)
    })

    it('should handle errors gracefully when GraphQL service is unavailable', async () => {
      using interceptor = await entente.patchRequests('castle-graphql', '0.1.0', {
        recording: true,
        filter: (url) => url.includes('http://localhost:9999'), // Non-existent server
      })

      // Try to make a call to non-existent server - should fail but not crash interceptor
      try {
        await fetch('http://localhost:9999/graphql', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ query: '{ health }' }),
        })
      } catch (error) {
        // Expected to fail
        expect(error).toBeDefined()
      }

      // Interceptor should still be functional
      expect(interceptor.isPatched()).toBe(true)
    })
  })
})