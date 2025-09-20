import 'dotenv/config'
import { createProvider } from "@entente/provider";
import { serve } from "@hono/node-server";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { resetRulers, setRulers } from "../src/db.js";
import app from "../src/index.js";

describe("Rulers GraphQL Service Provider Verification", () => {
  let server: ReturnType<typeof serve>;
  const testPort = 4002;

  beforeEach(async () => {
    resetRulers();

    server = serve({
      fetch: app.fetch,
      port: testPort,
    });
  });

  afterEach(async () => {
    if (server) {
      server.close();
    }
  });

  it("should verify GraphQL provider against recorded consumer interactions", async () => {
    const provider = createProvider({
      serviceUrl: process.env.ENTENTE_SERVICE_URL,
      apiKey: process.env.ENTENTE_API_KEY,
      provider: "castle-graphql",
      specType: "graphql", // Specify GraphQL spec type
      useNormalizedFixtures: true,

      // Provide database setup callback for rulers
      dataSetupCallback: async (fixtures) => {
        console.log(`🔧 [DEBUG] Normalized fixtures received:`)
        console.log(`  Available entity types:`, Object.keys(fixtures.entities))
        console.log(`  Total fixtures metadata:`, fixtures.metadata)

        // Extract ruler entities from normalized fixtures
        const rulerEntities = fixtures.entities.Ruler || [];
        console.log(`  Ruler entities found:`, rulerEntities.length)

        if (rulerEntities.length > 0) {
          console.log(`  First ruler entity:`, JSON.stringify(rulerEntities[0], null, 2))
        }

        // Transform fixture format to Ruler interface
        const rulers = rulerEntities.map(entity => ({
          id: entity.data.id,
          name: entity.data.name,
          title: entity.data.title,
          reignStart: entity.data.reignStart,
          reignEnd: entity.data.reignEnd,
          house: entity.data.house,
          castleIds: entity.data.castleIds || [],
          description: entity.data.description || "",
          achievements: entity.data.achievements || [],
        }));

        // Set the ruler data for the virtual database
        setRulers(rulers);

        console.log(`👑 Initialized virtual database with ${rulers.length} rulers from fixtures`);
      },
    });

    const results = await provider.verify({
      baseUrl: `http://localhost:${testPort}`,
      environment: "test", // Verification context (where verification runs)

      // GraphQL state handlers for different operations
      stateHandlers: {
        listRulers: async () => {
          console.log("🔄 Resetting rulers to default state");
          resetRulers();
        },
        getRuler: async () => {
          console.log("🔄 Resetting rulers to default state");
          resetRulers();
        },
        getRulersByCastle: async () => {
          console.log("🔄 Resetting rulers to default state");
          resetRulers();
        },
        getRulersByHouse: async () => {
          console.log("🔄 Resetting rulers to default state");
          resetRulers();
        },
        getRulersByPeriod: async () => {
          console.log("🔄 Resetting rulers to default state");
          resetRulers();
        },
        createRuler: async () => {
          console.log("🔄 Resetting rulers to default state");
          resetRulers();
        },
        updateRuler: async () => {
          console.log("🔄 Resetting rulers to default state");
          resetRulers();
        },
        deleteRuler: async () => {
          console.log("🔄 Resetting rulers to default state");
          resetRulers();
        },
        addCastleToRuler: async () => {
          console.log("🔄 Resetting rulers to default state");
          resetRulers();
        },
        removeCastleFromRuler: async () => {
          console.log("🔄 Resetting rulers to default state");
          resetRulers();
        },
      },
      cleanup: async () => {
        resetRulers();
      },
    });

    console.log("\n📊 GraphQL Provider verification completed");
    console.log(`📋 Total interactions tested: ${results.results.length}`);

    const successfulResults = results.results.filter((r) => r.success);
    const failedResults = results.results.filter((r) => !r.success);

    console.log(`✅ Successful verifications: ${successfulResults.length}`);
    console.log(`❌ Failed verifications: ${failedResults.length}`);

    if (failedResults.length > 0) {
      console.log("\n❌ Failed verifications:");
      for (const result of failedResults) {
        console.log(`  - ${result.interactionId}: ${result.error}`);
      }
    }

    // Better assertions
    expect(results.results).toBeDefined();

    // All verifications should pass if the provider correctly implements the contract
    if (failedResults.length > 0) {
      console.log(
        "\n⚠️  Some verifications failed - this indicates the provider doesn't match consumer expectations",
      );
    }

    expect(failedResults.length).toBe(0);
  });
});