import rulerData from './rulers.json' assert { type: 'json' }

export interface Ruler {
  id: string
  name: string
  title: string
  reignStart: number
  reignEnd?: number | undefined
  house: string
  castleIds: string[]
  description?: string | undefined
  achievements: string[]
}

export interface CreateRulerRequest {
  name: string
  title: string
  reignStart: number
  reignEnd?: number
  house: string
  castleIds?: string[]
  description?: string
  achievements?: string[]
}

export interface UpdateRulerRequest {
  name?: string
  title?: string
  reignStart?: number
  reignEnd?: number
  house?: string
  description?: string
  achievements?: string[]
}

let rulers: Ruler[] = [...rulerData]
let sourceRulers: Ruler[] = [...rulerData]

export const getAllRulers = (): Ruler[] => {
  return [...rulers]
}

export const getRulerById = (id: string): Ruler | undefined => {
  return rulers.find((ruler) => ruler.id === id)
}

export const getRulersByCastle = (castleId: string): Ruler[] => {
  return rulers.filter((ruler) => ruler.castleIds.includes(castleId))
}

export const getRulersByHouse = (house: string): Ruler[] => {
  return rulers.filter((ruler) => ruler.house.toLowerCase().includes(house.toLowerCase()))
}

export const getRulersByPeriod = (startYear: number, endYear: number): Ruler[] => {
  return rulers.filter((ruler) => {
    const rulerStart = ruler.reignStart
    const rulerEnd = ruler.reignEnd || new Date().getFullYear() // Current year if still reigning

    // Check if ruler's reign overlaps with the requested period
    return rulerStart <= endYear && rulerEnd >= startYear
  })
}

export const createRuler = (rulerData: CreateRulerRequest): Ruler => {
  const newRuler: Ruler = {
    id: generateId(),
    ...rulerData,
    castleIds: rulerData.castleIds || [],
    description: rulerData.description || '',
    achievements: rulerData.achievements || [],
  }

  rulers.push(newRuler)
  return newRuler
}

export const updateRuler = (id: string, updates: UpdateRulerRequest): Ruler | null => {
  const index = rulers.findIndex((ruler) => ruler.id === id)
  if (index === -1) {
    return null
  }

  const existingRuler = rulers[index]!
  const updatedRuler: Ruler = {
    id: existingRuler.id,
    name: updates.name ?? existingRuler.name,
    title: updates.title ?? existingRuler.title,
    reignStart: updates.reignStart ?? existingRuler.reignStart,
    reignEnd: updates.reignEnd ?? existingRuler.reignEnd,
    house: updates.house ?? existingRuler.house,
    castleIds: existingRuler.castleIds,
    description: updates.description ?? existingRuler.description,
    achievements: updates.achievements ?? existingRuler.achievements,
  }

  rulers[index] = updatedRuler
  return updatedRuler
}

export const deleteRuler = (id: string): boolean => {
  const index = rulers.findIndex((ruler) => ruler.id === id)
  if (index === -1) {
    return false
  }

  rulers.splice(index, 1)
  return true
}

export const addCastleToRuler = (rulerId: string, castleId: string): Ruler | null => {
  const ruler = getRulerById(rulerId)
  if (!ruler) {
    return null
  }

  // Add castle if not already associated
  if (!ruler.castleIds.includes(castleId)) {
    ruler.castleIds.push(castleId)
  }

  return ruler
}

export const removeCastleFromRuler = (rulerId: string, castleId: string): Ruler | null => {
  const ruler = getRulerById(rulerId)
  if (!ruler) {
    return null
  }

  // Remove castle if associated
  const index = ruler.castleIds.indexOf(castleId)
  if (index !== -1) {
    ruler.castleIds.splice(index, 1)
  }

  return ruler
}

export const setRulers = (data: Ruler[]): void => {
  sourceRulers = [...data]
  rulers = [...data]
}

export const resetRulers = (): void => {
  rulers = [...sourceRulers]
}

const generateId = (): string => {
  return `ruler_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
}