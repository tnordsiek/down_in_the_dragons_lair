import {
  parseSimulationPipelineCliArgs,
  runSimulationPipeline,
} from '../src/ai/simulationPipeline';

async function main(): Promise<void> {
  const options = parseSimulationPipelineCliArgs(process.argv.slice(2));
  const result = await runSimulationPipeline(options);

  console.log(
    `Processed ${result.gameCount} games across ${result.scenarioCount} scenarios.`,
  );
  console.log(`Raw results: ${result.rawPath}`);
  console.log(`Summary results: ${result.summaryPath}`);
  console.log(`Analysis summary: ${result.analysisPath}`);
  console.log(`HTML report: ${result.reportPath}`);
}

main().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : String(error);
  console.error(message);
  process.exitCode = 1;
});
