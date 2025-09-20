export interface Castle {
  id: string
  name: string
  region: string
  yearBuilt: number
}

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

export interface CastleWithRulers extends Castle {
  rulers: Ruler[]
}

export interface CreateCastleRequest {
  name: string
  region: string
  yearBuilt: number
}

export interface CastleApiError {
  error: string
  message: string
}

export class CastleApiClient {
  constructor(
    private readonly baseUrl: string,
    private readonly serviceBinding?: any,
    private readonly rulersApiUrl?: string
  ) {}

  async getAllCastles(): Promise<Castle[]> {
    try {
      // Try service binding first if available
      if (this.serviceBinding) {
        console.log(`[CastleApiClient] Using service binding`)
        const request = new Request('https://placeholder/castles')
        const response = await this.serviceBinding.fetch(request)
        console.log(`[CastleApiClient] Service binding response status: ${response.status} ${response.statusText}`)

        if (response.ok) {
          const data = await response.json() as Castle[]
          console.log(`[CastleApiClient] Service binding success: received ${Array.isArray(data) ? data.length : 'unknown'} castles`)
          return data
        }
      }

      // Fallback to HTTP call
      const url = `${this.baseUrl}/castles`
      console.log(`[CastleApiClient] Using HTTP call: ${url}`)

      const response = await fetch(url)
      console.log(`[CastleApiClient] HTTP response status: ${response.status} ${response.statusText}`)

      if (!response.ok) {
        let errorMessage = `HTTP ${response.status}: ${response.statusText}`
        try {
          const error: CastleApiError = await response.json()
          errorMessage = error.message || errorMessage
        } catch {
          // If response isn't JSON, use the raw text
          try {
            const text = await response.text()
            console.log(`[CastleApiClient] Error response text: ${text}`)
            errorMessage = text || errorMessage
          } catch {
            // If we can't read the response, use the status
          }
        }
        throw new Error(`Failed to get castles: ${errorMessage}`)
      }

      const data = await response.json() as Castle[]
      console.log(`[CastleApiClient] HTTP success: received ${Array.isArray(data) ? data.length : 'unknown'} castles`)
      return data
    } catch (error) {
      // Handle network errors or other fetch failures
      console.error(`[CastleApiClient] Network error:`, error)
      throw new Error(`Network error calling ${this.baseUrl}/castles: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  async getCastleById(id: string): Promise<Castle> {
    const response = await fetch(`${this.baseUrl}/castles/${id}`)

    if (!response.ok) {
      let errorMessage = `HTTP ${response.status}: ${response.statusText}`
      try {
        const error: CastleApiError = await response.json()
        errorMessage = error.message || errorMessage
      } catch {
        try {
          const text = await response.text()
          errorMessage = text || errorMessage
        } catch {
          // Use status message as fallback
        }
      }
      throw new Error(`Failed to get castle ${id}: ${errorMessage}`)
    }

    return await response.json() as Castle
  }

  async createCastle(castleData: CreateCastleRequest): Promise<Castle> {
    const response = await fetch(`${this.baseUrl}/castles`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(castleData),
    })

    if (!response.ok) {
      const error: CastleApiError = await response.json()
      throw new Error(`Failed to create castle: ${error.message}`)
    }

    return await response.json() as Castle
  }

  async deleteCastle(id: string): Promise<void> {
    const response = await fetch(`${this.baseUrl}/castles/${id}`, {
      method: 'DELETE',
    })

    if (!response.ok) {
      const error: CastleApiError = await response.json()
      throw new Error(`Failed to delete castle ${id}: ${error.message}`)
    }
  }

  async getCastlesByRegion(region: string): Promise<Castle[]> {
    const allCastles = await this.getAllCastles()
    return allCastles.filter(castle => castle.region.toLowerCase().includes(region.toLowerCase()))
  }

  async getOldestCastles(limit = 5): Promise<Castle[]> {
    const allCastles = await this.getAllCastles()
    return allCastles.sort((a, b) => a.yearBuilt - b.yearBuilt).slice(0, limit)
  }

  async getCastleWithRulers(castleId: string): Promise<CastleWithRulers> {
    if (!this.rulersApiUrl) {
      throw new Error('Rulers API URL not configured. Cannot fetch ruler data.')
    }

    // Get castle data from castle-service
    const castle = await this.getCastleById(castleId)

    // Get associated rulers from castle-graphql
    const { RulersGraphQLClient } = await import('./graphql-api.js')
    const rulersClient = new RulersGraphQLClient(this.rulersApiUrl)
    const rulers = await rulersClient.getRulersByCastle(castleId)

    return {
      ...castle,
      rulers
    }
  }

  async getAllCastlesWithRulers(): Promise<CastleWithRulers[]> {
    if (!this.rulersApiUrl) {
      throw new Error('Rulers API URL not configured. Cannot fetch ruler data.')
    }

    // Get all castles from castle-service
    const castles = await this.getAllCastles()

    // Get rulers for each castle from castle-graphql
    const { RulersGraphQLClient } = await import('./graphql-api.js')
    const rulersClient = new RulersGraphQLClient(this.rulersApiUrl)

    const castlesWithRulers: CastleWithRulers[] = []

    for (const castle of castles) {
      try {
        const rulers = await rulersClient.getRulersByCastle(castle.id)
        castlesWithRulers.push({
          ...castle,
          rulers
        })
      } catch (error) {
        console.error(`[CastleApiClient] Failed to get rulers for castle ${castle.id}:`, error)
        // Include castle with empty rulers array if rulers fetch fails
        castlesWithRulers.push({
          ...castle,
          rulers: []
        })
      }
    }

    return castlesWithRulers
  }

  async getCastlesByRegionWithRulers(region: string): Promise<CastleWithRulers[]> {
    if (!this.rulersApiUrl) {
      throw new Error('Rulers API URL not configured. Cannot fetch ruler data.')
    }

    // Get castles by region from castle-service
    const castles = await this.getCastlesByRegion(region)

    // Get rulers for each castle from castle-graphql
    const { RulersGraphQLClient } = await import('./graphql-api.js')
    const rulersClient = new RulersGraphQLClient(this.rulersApiUrl)

    const castlesWithRulers: CastleWithRulers[] = []

    for (const castle of castles) {
      try {
        const rulers = await rulersClient.getRulersByCastle(castle.id)
        castlesWithRulers.push({
          ...castle,
          rulers
        })
      } catch (error) {
        console.error(`[CastleApiClient] Failed to get rulers for castle ${castle.id}:`, error)
        // Include castle with empty rulers array if rulers fetch fails
        castlesWithRulers.push({
          ...castle,
          rulers: []
        })
      }
    }

    return castlesWithRulers
  }
}
