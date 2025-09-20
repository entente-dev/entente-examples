import { GraphQLClient, gql } from 'graphql-request'

export interface Ruler {
  id: string
  name: string
  title: string
  reignStart: number
  reignEnd?: number
  house: string
  castleIds: string[]
  description?: string
  achievements: string[]
}

export interface GraphQLResponse<T> {
  data: T
  errors?: Array<{
    message: string
    locations?: Array<{ line: number; column: number }>
    path?: string[]
  }>
}

export class RulersGraphQLClient {
  private client: GraphQLClient

  constructor(private readonly baseUrl: string) {
    this.client = new GraphQLClient(`${baseUrl}/graphql`)
  }

  async getRulersByCastle(castleId: string): Promise<Ruler[]> {
    const query = gql`
      query GetRulersByCastle($castleId: ID!) {
        getRulersByCastle(castleId: $castleId) {
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

    try {
      console.log(`[RulersGraphQLClient] Querying rulers for castle: ${castleId}`)
      const response = await this.client.request<{ getRulersByCastle: Ruler[] }>(query, { castleId })
      console.log(`[RulersGraphQLClient] Found ${response.getRulersByCastle.length} rulers for castle ${castleId}`)
      return response.getRulersByCastle
    } catch (error) {
      console.error(`[RulersGraphQLClient] Error getting rulers for castle ${castleId}:`, error)
      throw new Error(`Failed to get rulers for castle ${castleId}: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  async getRuler(id: string): Promise<Ruler | null> {
    const query = gql`
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

    try {
      console.log(`[RulersGraphQLClient] Querying ruler: ${id}`)
      const response = await this.client.request<{ getRuler: Ruler | null }>(query, { id })
      console.log(`[RulersGraphQLClient] Found ruler: ${response.getRuler?.name || 'null'}`)
      return response.getRuler
    } catch (error) {
      console.error(`[RulersGraphQLClient] Error getting ruler ${id}:`, error)
      throw new Error(`Failed to get ruler ${id}: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  async listRulers(): Promise<Ruler[]> {
    const query = gql`
      query ListRulers {
        listRulers {
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

    try {
      console.log('[RulersGraphQLClient] Querying all rulers')
      const response = await this.client.request<{ listRulers: Ruler[] }>(query)
      console.log(`[RulersGraphQLClient] Found ${response.listRulers.length} rulers`)
      return response.listRulers
    } catch (error) {
      console.error('[RulersGraphQLClient] Error getting all rulers:', error)
      throw new Error(`Failed to get all rulers: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  async getRulersByHouse(house: string): Promise<Ruler[]> {
    const query = gql`
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

    try {
      console.log(`[RulersGraphQLClient] Querying rulers by house: ${house}`)
      const response = await this.client.request<{ getRulersByHouse: Ruler[] }>(query, { house })
      console.log(`[RulersGraphQLClient] Found ${response.getRulersByHouse.length} rulers from house ${house}`)
      return response.getRulersByHouse
    } catch (error) {
      console.error(`[RulersGraphQLClient] Error getting rulers by house ${house}:`, error)
      throw new Error(`Failed to get rulers by house ${house}: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  async getRulersByPeriod(startYear: number, endYear: number): Promise<Ruler[]> {
    const query = gql`
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

    try {
      console.log(`[RulersGraphQLClient] Querying rulers by period: ${startYear}-${endYear}`)
      const response = await this.client.request<{ getRulersByPeriod: Ruler[] }>(query, { startYear, endYear })
      console.log(`[RulersGraphQLClient] Found ${response.getRulersByPeriod.length} rulers from period ${startYear}-${endYear}`)
      return response.getRulersByPeriod
    } catch (error) {
      console.error(`[RulersGraphQLClient] Error getting rulers by period ${startYear}-${endYear}:`, error)
      throw new Error(`Failed to get rulers by period ${startYear}-${endYear}: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  async health(): Promise<string> {
    const query = gql`
      query Health {
        health
      }
    `

    try {
      console.log('[RulersGraphQLClient] Checking health')
      const response = await this.client.request<{ health: string }>(query)
      console.log(`[RulersGraphQLClient] Health check response: ${response.health}`)
      return response.health
    } catch (error) {
      console.error('[RulersGraphQLClient] Health check failed:', error)
      throw new Error(`Health check failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }
}