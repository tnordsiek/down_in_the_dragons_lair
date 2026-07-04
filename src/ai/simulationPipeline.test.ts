import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';

import { afterEach, describe, expect, it } from 'vitest';

import {
  parseSimulationPipelineCliArgs,
  runSimulationPipeline,
} from './simulationPipeline';

const tempDirs: string[] = [];

describe('simulation pipeline', () => {
  afterEach(async () => {
    await Promise.all(
      tempDirs.splice(0).map((directory) =>
        rm(directory, { recursive: true, force: true }),
      ),
    );
  });

  it('parses the required cli file paths for the full pipeline run', () => {
    expect(
      parseSimulationPipelineCliArgs([
        '--config=scripts/template.csv',
        '--raw=scripts/out/raw.csv',
        '--summary=scripts/out/summary.csv',
        '--analysis=scripts/out/analysis.csv',
        '--report=scripts/out/report.html',
      ]),
    ).toEqual({
      configPath: 'scripts/template.csv',
      rawPath: 'scripts/out/raw.csv',
      summaryPath: 'scripts/out/summary.csv',
      analysisPath: 'scripts/out/analysis.csv',
      reportPath: 'scripts/out/report.html',
    });
  });

  it('writes all four pipeline artifacts in a single run', async () => {
    const directory = await mkdtemp(join(tmpdir(), 'dragon-pipeline-'));
    tempDirs.push(directory);

    const configPath = join(directory, 'config.csv');
    const rawPath = join(directory, 'raw.csv');
    const summaryPath = join(directory, 'summary.csv');
    const analysisPath = join(directory, 'analysis.csv');
    const reportPath = join(directory, 'report.html');

    await writeFile(
      configPath,
      [
        'scenarioId,games,baseSeed,difficulty,poolScale,heroes',
        'pipeline_smoke,1,pipeline-seed,normal,0.5,hero_mage|hero_blade',
      ].join('\n'),
      'utf8',
    );

    const result = await runSimulationPipeline({
      configPath,
      rawPath,
      summaryPath,
      analysisPath,
      reportPath,
    });

    expect(result.scenarioCount).toBe(1);
    expect(result.gameCount).toBe(1);
    expect(result.analysisRowCount).toBeGreaterThan(0);

    const [rawCsv, summaryCsv, analysisCsv, reportHtml] = await Promise.all([
      readFile(rawPath, 'utf8'),
      readFile(summaryPath, 'utf8'),
      readFile(analysisPath, 'utf8'),
      readFile(reportPath, 'utf8'),
    ]);

    expect(rawCsv).toContain('terminationReason');
    expect(summaryCsv).toContain('timeoutGames');
    expect(analysisCsv).toContain('problemTitle');
    expect(reportHtml).toContain('Simulation Diagnostics Report');
    expect(reportHtml).toContain('Problems To Fix');
  });
});
