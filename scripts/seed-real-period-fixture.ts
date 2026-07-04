import { seedRealPeriodFixtureForTest } from "../apps/web/src/server/trial-run-db-workflow";

seedRealPeriodFixtureForTest()
  .then((result) => {
    console.log(`Real-period fixture generated for ${result.periodCode}: ${result.importBatchIds.length} import batches`);
  })
  .catch((error) => {
    console.error(error instanceof Error ? error.message : error);
    process.exit(1);
  });
