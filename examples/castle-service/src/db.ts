export interface Castle {
  id: string;
  name: string;
  region: string;
  yearBuilt: number;
  description: string;
}

export interface CreateCastleRequest {
  name: string;
  region: string;
  yearBuilt: number;
  description?: string;
}

let castles: Castle[] = [];
let sourceCastles: Castle[] = [];

export const getAllCastles = (): Castle[] => {
  return [...castles];
};

export const getCastleById = (id: string): Castle | undefined => {
  return castles.find((castle) => castle.id === id);
};

export const createCastle = (castleData: CreateCastleRequest): Castle => {
  const newCastle: Castle = {
    id: generateId(),
    ...castleData,
    description: castleData.description || "A beautiful castle",
  };

  castles.push(newCastle);
  return newCastle;
};

export const deleteCastle = (id: string): boolean => {
  const index = castles.findIndex((castle) => castle.id === id);
  if (index === -1) {
    return false;
  }

  castles.splice(index, 1);
  return true;
};

export const setCastles = (data: Castle[]): void => {
  sourceCastles = [...data];
  castles = [...data];
};

export const resetCastles = (): void => {
  castles = [...sourceCastles];
};

const generateId = (): string => {
  return `castle_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
};
