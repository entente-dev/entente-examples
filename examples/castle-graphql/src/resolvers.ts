import {
  getAllRulers,
  getRulerById,
  getRulersByCastle,
  getRulersByHouse,
  getRulersByPeriod,
  createRuler,
  updateRuler,
  deleteRuler,
  addCastleToRuler,
  removeCastleFromRuler,
  type CreateRulerRequest,
  type UpdateRulerRequest,
} from './db.js'

export const resolvers = {
  Query: {
    listRulers: () => {
      console.log('🔍 GraphQL Query: listRulers')
      return getAllRulers()
    },

    getRuler: (_: any, { id }: { id: string }) => {
      console.log(`🔍 GraphQL Query: getRuler(${id})`)
      const ruler = getRulerById(id)
      if (!ruler) {
        throw new Error(`Ruler with ID ${id} not found`)
      }
      return ruler
    },

    getRulersByCastle: (_: any, { castleId }: { castleId: string }) => {
      console.log(`🔍 GraphQL Query: getRulersByCastle(${castleId})`)
      return getRulersByCastle(castleId)
    },

    getRulersByHouse: (_: any, { house }: { house: string }) => {
      console.log(`🔍 GraphQL Query: getRulersByHouse(${house})`)
      return getRulersByHouse(house)
    },

    getRulersByPeriod: (_: any, { startYear, endYear }: { startYear: number; endYear: number }) => {
      console.log(`🔍 GraphQL Query: getRulersByPeriod(${startYear}, ${endYear})`)
      return getRulersByPeriod(startYear, endYear)
    },

    health: () => {
      console.log('🔍 GraphQL Query: health')
      return 'Rulers GraphQL service is healthy! 👑'
    },
  },

  Mutation: {
    createRuler: (_: any, { input }: { input: CreateRulerRequest }) => {
      console.log('✍️ GraphQL Mutation: createRuler', input)

      // Validate required fields
      if (!input.name || !input.title || !input.house || !input.reignStart) {
        throw new Error('Missing required fields: name, title, house, and reignStart are required')
      }

      // Validate reign dates
      if (input.reignEnd && input.reignEnd < input.reignStart) {
        throw new Error('reignEnd cannot be before reignStart')
      }

      const ruler = createRuler(input)
      console.log(`✅ Created ruler: ${ruler.name} (${ruler.id})`)
      return ruler
    },

    updateRuler: (_: any, { id, input }: { id: string; input: UpdateRulerRequest }) => {
      console.log(`✍️ GraphQL Mutation: updateRuler(${id})`, input)

      // Validate reign dates if both are provided
      if (input.reignStart && input.reignEnd && input.reignEnd < input.reignStart) {
        throw new Error('reignEnd cannot be before reignStart')
      }

      const ruler = updateRuler(id, input)
      if (!ruler) {
        throw new Error(`Ruler with ID ${id} not found`)
      }

      console.log(`✅ Updated ruler: ${ruler.name} (${ruler.id})`)
      return ruler
    },

    deleteRuler: (_: any, { id }: { id: string }) => {
      console.log(`✍️ GraphQL Mutation: deleteRuler(${id})`)

      const success = deleteRuler(id)
      if (!success) {
        throw new Error(`Ruler with ID ${id} not found`)
      }

      console.log(`✅ Deleted ruler: ${id}`)
      return {
        success: true,
        message: `Ruler ${id} has been successfully deleted`,
      }
    },

    addCastleToRuler: (_: any, { rulerId, castleId }: { rulerId: string; castleId: string }) => {
      console.log(`✍️ GraphQL Mutation: addCastleToRuler(${rulerId}, ${castleId})`)

      const ruler = addCastleToRuler(rulerId, castleId)
      if (!ruler) {
        throw new Error(`Ruler with ID ${rulerId} not found`)
      }

      console.log(`✅ Added castle ${castleId} to ruler ${ruler.name}`)
      return ruler
    },

    removeCastleFromRuler: (_: any, { rulerId, castleId }: { rulerId: string; castleId: string }) => {
      console.log(`✍️ GraphQL Mutation: removeCastleFromRuler(${rulerId}, ${castleId})`)

      const ruler = removeCastleFromRuler(rulerId, castleId)
      if (!ruler) {
        throw new Error(`Ruler with ID ${rulerId} not found`)
      }

      console.log(`✅ Removed castle ${castleId} from ruler ${ruler.name}`)
      return ruler
    },
  },
}