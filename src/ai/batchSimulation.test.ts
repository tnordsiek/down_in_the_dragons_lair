import { describe, expect, it } from 'vitest';

import { simulationIssueTypes } from './simulationDiagnostics';
import {
  parseSimulationCliArgs,
  parseSimulationConfigCsv,
  runBatchSimulation,
  serializeRawSimulationResults,
  serializeSummarySimulationResults,
  simulationConfigColumns,
} from './batchSimulation';

const configCsv = `${simulationConfigColumns.join(',')}
scenario_alpha,1,s1,normal,0.5,hero_mage|hero_blade
scenario_beta,1,s2,easy,0.5,hero_mage|hero_rogue
scenario_gamma,1,s3,normal,0.5,hero_mage|hero_seeress
`;

const alphaScenarioCsv = `${simulationConfigColumns.join(',')}
scenario_alpha,1,s1,normal,0.5,hero_mage|hero_blade
`;

const betaScenarioCsv = `${simulationConfigColumns.join(',')}
scenario_beta,1,s2,easy,0.5,hero_mage|hero_rogue
`;

describe('batch simulation config parsing', () => {
  it('parses multiple scenario rows with defaults and fixed hero order', () => {
    expect(parseSimulationConfigCsv(configCsv)).toEqual([
      {
        scenarioId: 'scenario_alpha',
        games: 1,
        baseSeed: 's1',
        difficulty: 'normal',
        poolScale: 0.5,
        heroes: ['hero_mage', 'hero_blade'],
      },
      {
        scenarioId: 'scenario_beta',
        games: 1,
        baseSeed: 's2',
        difficulty: 'easy',
        poolScale: 0.5,
        heroes: ['hero_mage', 'hero_rogue'],
      },
      {
        scenarioId: 'scenario_gamma',
        games: 1,
        baseSeed: 's3',
        difficulty: 'normal',
        poolScale: 0.5,
        heroes: ['hero_mage', 'hero_seeress'],
      },
    ]);
  });

  it('rejects duplicate or unknown heroes', () => {
    expect(() =>
      parseSimulationConfigCsv(
        `${simulationConfigColumns.join(',')}
broken,1,seed,normal,1,hero_mage|hero_mage
`,
      ),
    ).toThrow(/unique/);

    expect(() =>
      parseSimulationConfigCsv(
        `${simulationConfigColumns.join(',')}
broken,1,seed,normal,1,hero_mage|hero_archer
`,
      ),
    ).toThrow(/unknown hero/);
  });
});

describe('batch simulation execution', () => {
  it('produces deterministic raw and summary statistics', () => {
    const scenarios = parseSimulationConfigCsv(alphaScenarioCsv);

    const first = runBatchSimulation(scenarios);
    const second = runBatchSimulation(scenarios);

    expect(first).toEqual(second);
  }, 30000);

  it('emits exactly one summary row per configured hero within each scenario', () => {
    const scenarios = parseSimulationConfigCsv(alphaScenarioCsv);
    const { summaryResults } = runBatchSimulation(scenarios);

    for (const scenario of scenarios) {
      const scenarioSummary = summaryResults.filter(
        (row) => row.scenarioId === scenario.scenarioId,
      );

      expect(scenarioSummary).toHaveLength(scenario.heroes.length);
      expect(scenarioSummary.map((row) => row.heroId)).toEqual(scenario.heroes);
      expect(new Set(scenarioSummary.map((row) => row.heroId)).size).toBe(
        scenario.heroes.length,
      );
    }
  }, 30000);

  it('serializes extended diagnostic and timeout fields in raw and summary CSV outputs', () => {
    const scenarios = parseSimulationConfigCsv(betaScenarioCsv);
    const results = runBatchSimulation(scenarios);

    const rawCsv = serializeRawSimulationResults(results.rawResults);
    const summaryCsv = serializeSummarySimulationResults(results.summaryResults);

    expect(rawCsv).toContain('completed,terminationReason');
    expect(rawCsv).toContain('lastPhase,lastActionType');
    expect(rawCsv).toContain('timeoutActiveHeroId');
    expect(rawCsv).toContain('slot1NonTerminatingGame');
    expect(summaryCsv).toContain('completedGames,timeoutGames');
    expect(summaryCsv).toContain('avgStalledTurns');
    expect(summaryCsv).toContain('avgWitchSwapLowValue');

    const easyScenario = results.rawResults.find(
      (row) => row.scenarioId === 'scenario_beta',
    );
    expect(easyScenario).toBeDefined();
    expect(easyScenario?.terminationReason).toBe('action_limit');
    expect(easyScenario?.timeoutActiveHeroId).toBeTruthy();

    const nonTerminatingPlayers =
      easyScenario?.players.filter(
        (player) => player.diagnostics.nonTerminatingGame > 0,
      ) ?? [];
    expect(nonTerminatingPlayers).toHaveLength(1);
  });

  it('tracks every configured diagnostic counter on each player result', () => {
    const scenarios = parseSimulationConfigCsv(alphaScenarioCsv);
    const { rawResults } = runBatchSimulation(scenarios);

    for (const result of rawResults) {
      for (const player of result.players) {
        expect(Object.keys(player.diagnostics).sort()).toEqual(
          [...simulationIssueTypes].sort(),
        );
      }
    }
  });
});

describe('batch simulation cli arguments', () => {
  it('parses the required cli file paths', () => {
    expect(
      parseSimulationCliArgs([
        '--config=scripts/template.csv',
        '--raw=scripts/out/raw.csv',
        '--summary=scripts/out/summary.csv',
      ]),
    ).toEqual({
      configPath: 'scripts/template.csv',
      rawPath: 'scripts/out/raw.csv',
      summaryPath: 'scripts/out/summary.csv',
    });
  });
});
