import { readFile } from 'node:fs/promises';

import {
  buildAnalysisSummary,
  parseAnalysisCliArgs,
  parseRawCsv,
  parseSummaryCsv,
  serializeAnalysisSummary,
  writeAnalysisSummary,
} from '../src/ai/simulationAnalysis';

async function main(): Promise<void> {
  const options = parseAnalysisCliArgs(process.argv.slice(2));
  const [summaryCsv, rawCsv] = await Promise.all([
    readFile(options.summaryPath, 'utf8'),
    readFile(options.rawPath, 'utf8'),
  ]);
  const summaryRows = parseSummaryCsv(summaryCsv);
  const rawRows = parseRawCsv(rawCsv);
  const analysisRows = buildAnalysisSummary(summaryRows, rawRows);
  const analysisCsv = serializeAnalysisSummary(analysisRows);

  await writeAnalysisSummary(options.outputPath, analysisCsv);

  console.log(
    `Analyzed ${analysisRows.length} hero rows across ${new Set(analysisRows.map((row) => row.scenarioId)).size} scenarios.`,
  );
  console.log(`Analysis summary: ${options.outputPath}`);
}

main().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : String(error);
  console.error(message);
  process.exitCode = 1;
});
