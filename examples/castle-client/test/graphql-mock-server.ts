import { createYoga, createSchema } from 'graphql-yoga'
import { createServer, type Server } from 'node:http'

// Simple in-memory data store for testing
interface Ruler {
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

let rulers: Ruler[] = [
  {
    id: 'ruler-louis-xiv-001',
    name: 'Louis XIV',
    title: 'The Sun King',
    reignStart: 1643,
    reignEnd: 1715,
    house: 'Bourbon',
    castleIds: ['550e8400-e29b-41d4-a716-446655440000'], // Versailles
    description: 'Known as the Sun King, Louis XIV was a monarch of the House of Bourbon.',
    achievements: ['Built Palace of Versailles', 'Longest reigning monarch in European history'],
  },
  {
    id: 'ruler-louis-xiii-001',
    name: 'Louis XIII',
    title: 'The Just',
    reignStart: 1610,
    reignEnd: 1643,
    house: 'Bourbon',
    castleIds: ['550e8400-e29b-41d4-a716-446655440001'], // Louvre
    description: 'Father of Louis XIV and king during the rise of absolute monarchy.',
    achievements: ['Strengthened royal authority', 'Supported Cardinal Richelieu'],
  },
  {
    id: 'ruler-henry-iv-001',
    name: 'Henry IV',
    title: 'The Good King Henry',
    reignStart: 1589,
    reignEnd: 1610,
    house: 'Bourbon',
    castleIds: ['550e8400-e29b-41d4-a716-446655440002'], // Fontainebleau
    description: 'First Bourbon king of France, ended the French Wars of Religion.',
    achievements: ['Edict of Nantes', 'Economic recovery of France'],
  },
]

// GraphQL Schema
const typeDefs = /* GraphQL */ `
  type Ruler {
    id: ID!
    name: String!
    title: String!
    reignStart: Int!
    reignEnd: Int
    house: String!
    castleIds: [ID!]!
    description: String
    achievements: [String!]
  }

  input CreateRulerInput {
    name: String!
    title: String!
    reignStart: Int!
    reignEnd: Int
    house: String!
    castleIds: [ID!]
    description: String
    achievements: [String!]
  }

  input UpdateRulerInput {
    name: String
    title: String
    reignStart: Int
    reignEnd: Int
    house: String
    description: String
    achievements: [String!]
  }

  type DeleteResponse {
    success: Boolean!
    message: String
  }

  type Query {
    listRulers: [Ruler!]!
    getRuler(id: ID!): Ruler
    getRulersByCastle(castleId: ID!): [Ruler!]!
    getRulersByHouse(house: String!): [Ruler!]!
    getRulersByPeriod(startYear: Int!, endYear: Int!): [Ruler!]!
    health: String!
  }

  type Mutation {
    createRuler(input: CreateRulerInput!): Ruler!
    updateRuler(id: ID!, input: UpdateRulerInput!): Ruler!
    deleteRuler(id: ID!): DeleteResponse!
    addCastleToRuler(rulerId: ID!, castleId: ID!): Ruler!
    removeCastleFromRuler(rulerId: ID!, castleId: ID!): Ruler!
  }
`

// GraphQL Resolvers
const resolvers = {
  Query: {
    listRulers: () => rulers,
    getRuler: (_: any, { id }: { id: string }) => {
      return rulers.find(ruler => ruler.id === id) || null
    },
    getRulersByCastle: (_: any, { castleId }: { castleId: string }) => {
      return rulers.filter(ruler => ruler.castleIds.includes(castleId))
    },
    getRulersByHouse: (_: any, { house }: { house: string }) => {
      return rulers.filter(ruler => ruler.house === house)
    },
    getRulersByPeriod: (_: any, { startYear, endYear }: { startYear: number; endYear: number }) => {
      return rulers.filter(ruler => {
        const reignEnd = ruler.reignEnd || new Date().getFullYear()
        return ruler.reignStart <= endYear && reignEnd >= startYear
      })
    },
    health: () => 'Rulers GraphQL mock service is healthy! 👑',
  },

  Mutation: {
    createRuler: (_: any, { input }: { input: Omit<Ruler, 'id'> }) => {
      const newRuler: Ruler = {
        id: `ruler-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        ...input,
        castleIds: input.castleIds || [],
        achievements: input.achievements || [],
      }
      rulers.push(newRuler)
      return newRuler
    },

    updateRuler: (_: any, { id, input }: { id: string; input: Partial<Ruler> }) => {
      const rulerIndex = rulers.findIndex(ruler => ruler.id === id)
      if (rulerIndex === -1) {
        throw new Error(`Ruler with ID ${id} not found`)
      }

      rulers[rulerIndex] = { ...rulers[rulerIndex], ...input }
      return rulers[rulerIndex]
    },

    deleteRuler: (_: any, { id }: { id: string }) => {
      const rulerIndex = rulers.findIndex(ruler => ruler.id === id)
      if (rulerIndex === -1) {
        throw new Error(`Ruler with ID ${id} not found`)
      }

      rulers.splice(rulerIndex, 1)
      return {
        success: true,
        message: `Ruler ${id} has been successfully deleted`,
      }
    },

    addCastleToRuler: (_: any, { rulerId, castleId }: { rulerId: string; castleId: string }) => {
      const ruler = rulers.find(r => r.id === rulerId)
      if (!ruler) {
        throw new Error(`Ruler with ID ${rulerId} not found`)
      }

      if (!ruler.castleIds.includes(castleId)) {
        ruler.castleIds.push(castleId)
      }
      return ruler
    },

    removeCastleFromRuler: (_: any, { rulerId, castleId }: { rulerId: string; castleId: string }) => {
      const ruler = rulers.find(r => r.id === rulerId)
      if (!ruler) {
        throw new Error(`Ruler with ID ${rulerId} not found`)
      }

      ruler.castleIds = ruler.castleIds.filter(id => id !== castleId)
      return ruler
    },
  },
}

// Create GraphQL schema
const schema = createSchema({
  typeDefs,
  resolvers,
})

// Create GraphQL Yoga instance
const yoga = createYoga({
  schema,
  graphqlEndpoint: '/graphql',
  landingPage: false,
})

export interface GraphQLMockServer {
  url: string
  port: number
  close: () => Promise<void>
  resetData: () => void
}

export async function createGraphQLMockServer(port = 0): Promise<GraphQLMockServer> {
  const server: Server = createServer(yoga)

  await new Promise<void>((resolve, reject) => {
    server.listen(port, (err?: any) => {
      if (err) reject(err)
      else resolve()
    })
  })

  const address = server.address()
  const actualPort = typeof address === 'object' && address ? address.port : port
  const url = `http://localhost:${actualPort}`

  return {
    url,
    port: actualPort,
    close: async () => {
      await new Promise<void>((resolve) => {
        server.close(() => resolve())
      })
    },
    resetData: () => {
      // Reset to original test data
      rulers = [
        {
          id: 'ruler-louis-xiv-001',
          name: 'Louis XIV',
          title: 'The Sun King',
          reignStart: 1643,
          reignEnd: 1715,
          house: 'Bourbon',
          castleIds: ['550e8400-e29b-41d4-a716-446655440000'],
          description: 'Known as the Sun King, Louis XIV was a monarch of the House of Bourbon.',
          achievements: ['Built Palace of Versailles', 'Longest reigning monarch in European history'],
        },
        {
          id: 'ruler-louis-xiii-001',
          name: 'Louis XIII',
          title: 'The Just',
          reignStart: 1610,
          reignEnd: 1643,
          house: 'Bourbon',
          castleIds: ['550e8400-e29b-41d4-a716-446655440001'],
          description: 'Father of Louis XIV and king during the rise of absolute monarchy.',
          achievements: ['Strengthened royal authority', 'Supported Cardinal Richelieu'],
        },
        {
          id: 'ruler-henry-iv-001',
          name: 'Henry IV',
          title: 'The Good King Henry',
          reignStart: 1589,
          reignEnd: 1610,
          house: 'Bourbon',
          castleIds: ['550e8400-e29b-41d4-a716-446655440002'],
          description: 'First Bourbon king of France, ended the French Wars of Religion.',
          achievements: ['Edict of Nantes', 'Economic recovery of France'],
        },
      ]
    },
  }
}