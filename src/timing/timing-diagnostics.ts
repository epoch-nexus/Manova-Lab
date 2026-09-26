import type { TimingResult } from './timing-types.js';

export interface TimingRunSummary {
  trialsCompleted: number;
  responsesCaptured: number;
  timeouts: number;
  minRtMs: number | null;
  maxRtMs: number | null;
  meanRtMs: number | null;
  medianRtMs: number | null;
  stdDevRtMs: number | null;
  hiddenTabsDetected: number;
}

/**
 * Diagnostic accumulator used strictly for testing, auditing, and validating
 * the browser timing engine during PoC runs (e.g. 50+ trials).
 *
 * NOTE: This is NOT the Phase 5 researcher analytics system.
 */
export class TimingDiagnostics {
  private results: TimingResult[] = [];

  record(result: TimingResult): void {
    this.results.push(result);
  }

  getResults(): readonly TimingResult[] {
    return this.results;
  }

  clear(): void {
    this.results = [];
  }

  computeSummary(): TimingRunSummary {
    const totalTrials = this.results.length;
    let timeouts = 0;
    let responsesCaptured = 0;
    let hiddenTabs = 0;

    const rts: number[] = [];

    for (const r of this.results) {
      if (r.timedOut) {
        timeouts++;
      } else if (r.reactionTimeMs !== null) {
        responsesCaptured++;
        rts.push(r.reactionTimeMs);
      }
      if (r.timingMeasurement?.hardwarePrecision.hiddenTabDetected) {
        hiddenTabs++;
      }
    }

    if (rts.length === 0) {
      return {
        trialsCompleted: totalTrials,
        responsesCaptured: 0,
        timeouts,
        minRtMs: null,
        maxRtMs: null,
        meanRtMs: null,
        medianRtMs: null,
        stdDevRtMs: null,
        hiddenTabsDetected: hiddenTabs,
      };
    }

    rts.sort((a, b) => a - b);
    const minRt = rts[0]!;
    const maxRt = rts[rts.length - 1]!;
    const sum = rts.reduce((acc, v) => acc + v, 0);
    const meanRt = sum / rts.length;

    // Median
    const mid = Math.floor(rts.length / 2);
    const medianRt =
      rts.length % 2 !== 0
        ? rts[mid]!
        : (rts[mid - 1]! + rts[mid]!) / 2;

    // Standard deviation
    const variance =
      rts.reduce((acc, v) => acc + Math.pow(v - meanRt, 2), 0) / rts.length;
    const stdDevRt = Math.sqrt(variance);

    return {
      trialsCompleted: totalTrials,
      responsesCaptured,
      timeouts,
      minRtMs: Number(minRt.toFixed(3)),
      maxRtMs: Number(maxRt.toFixed(3)),
      meanRtMs: Number(meanRt.toFixed(3)),
      medianRtMs: Number(medianRt.toFixed(3)),
      stdDevRtMs: Number(stdDevRt.toFixed(3)),
      hiddenTabsDetected: hiddenTabs,
    };
  }

  formatTrialLog(trialIndex: number, result: TimingResult): string {
    const stimTs = result.stimulusPresentationTimestamp.toFixed(3);
    if (result.timedOut) {
      return `Trial ${trialIndex}: Stimulus presentation: ${stimTs} ms | TIMED OUT (no response within window)`;
    }
    const respTs = (result.responseTimestamp ?? 0).toFixed(3);
    const rt = (result.reactionTimeMs ?? 0).toFixed(3);
    return `Trial ${trialIndex}: Stimulus presentation: ${stimTs} ms | Response: ${respTs} ms | Reaction time: ${rt} ms (key: ${result.submittedResponse})`;
  }

  formatSummaryReport(): string {
    const s = this.computeSummary();
    return [
      '========================================',
      '      MANOVA LABS TIMING DIAGNOSTICS    ',
      '========================================',
      `Trials completed:     ${s.trialsCompleted}`,
      `Responses captured:   ${s.responsesCaptured}`,
      `Timeouts:             ${s.timeouts}`,
      `Minimum RT:           ${s.minRtMs !== null ? s.minRtMs + ' ms' : 'N/A'}`,
      `Maximum RT:           ${s.maxRtMs !== null ? s.maxRtMs + ' ms' : 'N/A'}`,
      `Mean RT:              ${s.meanRtMs !== null ? s.meanRtMs + ' ms' : 'N/A'}`,
      `Median RT:            ${s.medianRtMs !== null ? s.medianRtMs + ' ms' : 'N/A'}`,
      `Std Dev RT:           ${s.stdDevRtMs !== null ? s.stdDevRtMs + ' ms' : 'N/A'}`,
      `Hidden tabs detected: ${s.hiddenTabsDetected}`,
      '========================================',
    ].join('\n');
  }
}
