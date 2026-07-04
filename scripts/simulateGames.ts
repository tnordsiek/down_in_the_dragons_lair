import { readFile } from 'node:fs/promises';

import {
  parseSimulationCliArgs,
  parseSimulationConfigCsv,
  runBatchSimulation,
  serializeRawSimulationResults,
  serializeSummarySimulationResults,
  writeSimulationOutputs,
} from '../src/ai/batchSimulation';

async function main(): Promise<void> {
  const options = parseSimulationCliArgs(process.argv.slice(2));
  const configCsv = await readFile(options.configPath, 'utf8');
  const scenarios = parseSimulationConfigCsv(configCsv);
  const results = runBatchSimulation(scenarios);
  const rawCsv = serializeRawSimulationResults(results.rawResults);
  const summaryCsv = serializeSummarySimulationResults(results.summaryResults);

  await writeSimulationOutputs(
    options.rawPath,
    rawCsv,
    options.summaryPath,
    summaryCsv,
  );

  console.log(
    `Simulated ${results.rawResults.length} games across ${scenarios.length} scenarios.`,
  );
  console.log(`Raw results: ${options.rawPath}`);
  console.log(`Summary results: ${options.summaryPath}`);
}

main().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : String(error);
  console.error(message);
  process.exitCode = 1;
});
