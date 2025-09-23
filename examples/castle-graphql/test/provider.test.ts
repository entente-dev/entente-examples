import "dotenv/config";
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

  it(
    "should verify GraphQL provider against recorded consumer interactions",
    async () => {
      const provider = await createProvider({
        serviceUrl: process.env.ENTENTE_SERVICE_URL,
        apiKey: process.env.ENTENTE_API_KEY,
        provider: "castle-graphql",
        specType: "graphql", // Specify GraphQL spec type
        useNormalizedFixtures: true,

        // Provide database setup callback for rulers
        dataSetupCallback: async (fixtures) => {
          console.log(`🔧 [DEBUG] Normalized fixtures received:`);
          console.log(
            `  Available entity types:`,
            Object.keys(fixtures.entities),
          );
          console.log(`  Total fixtures metadata:`, fixtures.metadata);

          // Extract ruler entities from normalized fixtures
          const rulerEntities = fixtures.entities.Ruler || [];
          console.log(`  Ruler entities found:`, rulerEntities.length);

          if (rulerEntities.length > 0) {
            console.log(
              `  First ruler entity:`,
              JSON.stringify(rulerEntities[0], null, 2),
            );
          }

          // Transform fixture format to Ruler interface - only load complete entities
          const rulers = rulerEntities
            .map((entity) => {
              // Only load entities that have ALL required fields (complete entities)
              // This filters out partial entities from update mutations
              if (!entity.data.id ||
                  !entity.data.name ||
                  !entity.data.title ||
                  !entity.data.house ||
                  typeof entity.data.reignStart !== 'number') {
                console.warn(`⚠️  Skipping incomplete ruler entity ${entity.data.id || 'unknown'} - missing required fields:`, {
                  hasId: !!entity.data.id,
                  hasName: !!entity.data.name,
                  hasTitle: !!entity.data.title,
                  hasHouse: !!entity.data.house,
                  hasValidReignStart: typeof entity.data.reignStart === 'number',
                  source: entity.source
                });
                return null;
              }

              // Only create ruler with valid complete data
              const ruler = {
                id: entity.data.id,
                name: entity.data.name,
                title: entity.data.title,
                reignStart: entity.data.reignStart,
                ...(typeof entity.data.reignEnd === 'number' ? { reignEnd: entity.data.reignEnd } : {}),
                house: entity.data.house,
                castleIds: Array.isArray(entity.data.castleIds) ? entity.data.castleIds : [],
                description: typeof entity.data.description === 'string' ? entity.data.description : "",
                achievements: Array.isArray(entity.data.achievements) ? entity.data.achievements : [],
              };

              console.log(`✅ Loaded complete ruler entity: ${ruler.name} (${ruler.id})`);
              return ruler;
            })
            .filter((ruler) => ruler !== null); // Remove incomplete entries

          // Set the ruler data for the virtual database
          setRulers(rulers);

          console.log(
            `👑 Initialized virtual database with ${rulers.length} rulers from fixtures`,
          );
          console.log(
            `📋 Ruler IDs loaded: ${rulers.map((r) => r.id).join(", ")}`,
          );
        },
      });

      const results = await provider.verify({
        baseUrl: `http://localhost:${testPort}`,
        environment: "test", // Verification context (where verification runs)

        // GraphQL state handlers for different operations
        stateHandlers: {
          "Query.listRulers": async () => {
            resetRulers();
          },
          "Query.getRuler": async () => {
            resetRulers();
          },
          "Query.getRulersByCastle": async () => {
            resetRulers();
          },
          "Query.getRulersByHouse": async () => {
            resetRulers();
          },
          "Query.getRulersByPeriod": async () => {
            resetRulers();
          },
          "Mutation.createRuler": async () => {
            resetRulers();
          },
          "Mutation.updateRuler": async () => {
            resetRulers();
          },
          "Mutation.deleteRuler": async () => {
            resetRulers();
          },
          "Mutation.addCastleToRuler": async () => {
            resetRulers();
          },
          "Mutation.removeCastleFromRuler": async () => {
            resetRulers();
          },
        },
        cleanup: async () => {
          resetRulers();
        },
        logger: (level, message) => {
          if (level === 'error') {
            console.error(`\n[PROVIDER VERIFICATION ERROR]\n${message}\n`)
          } else if (level === 'warn') {
            console.warn(`\n[PROVIDER VERIFICATION WARN]\n${message}\n`)
          } else {
            console.log(`\n[PROVIDER VERIFICATION INFO]\n${message}\n`)
          }
        }
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
    },
    { timeout: 10000 },
  );
});
