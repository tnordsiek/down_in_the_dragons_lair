import { readFile } from 'node:fs/promises';

import {
  parseAnalysisSummaryCsv,
  parseReportCliArgs,
  renderSimulationReport,
  writeSimulationReport,
} from '../src/ai/simulationReport';

async function main(): Promise<void> {
  const options = parseReportCliArgs(process.argv.slice(2));
  const analysisCsv = await readFile(options.analysisPath, 'utf8');
  const rows = parseAnalysisSummaryCsv(analysisCsv);
  const html = renderSimulationReport(rows);

  await writeSimulationReport(options.outputPath, html);

  console.log(
    `Rendered report for ${new Set(rows.map((row) => row.scenarioId)).size} scenarios.`,
  );
  console.log(`HTML report: ${options.outputPath}`);
}

main().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : String(error);
  console.error(message);
  process.exitCode = 1;
});
