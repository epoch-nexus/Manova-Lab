/**
 * Timing Engine (Phase 4 Proof of Concept)
 * Provides millisecond-level measurement using requestAnimationFrame and performance.now()
 */

export interface TrialRecord {
    trialId: number;
    stimulusOnsetTimestamp: number;
    responseTimestamp: number;
    reactionTimeMs: number;
    correct: boolean;
}

export class TimingEngine {
    private currentStimulusOnset: number | null = null;
    private records: TrialRecord[] = [];
    private animationFrameId: number | null = null;

    // Start a trial, record when the stimulus is painted
    public showStimulus(onPaint: () => void) {
        this.animationFrameId = requestAnimationFrame(() => {
            // This runs before the next repaint, so we capture the time 
            // the frame starts rendering.
            this.currentStimulusOnset = performance.now();
            onPaint();
        });
    }

    // Record user response
    public recordResponse(trialId: number, isCorrect: boolean): TrialRecord | null {
        if (!this.currentStimulusOnset) return null;
        
        const responseTimestamp = performance.now();
        const reactionTimeMs = responseTimestamp - this.currentStimulusOnset;
        
        const record: TrialRecord = {
            trialId,
            stimulusOnsetTimestamp: this.currentStimulusOnset,
            responseTimestamp,
            reactionTimeMs,
            correct: isCorrect
        };
        
        this.records.push(record);
        this.currentStimulusOnset = null; // Reset for next trial
        
        if (this.animationFrameId) {
            cancelAnimationFrame(this.animationFrameId);
            this.animationFrameId = null;
        }

        return record;
    }

    public getRecords(): TrialRecord[] {
        return this.records;
    }

    public clearRecords() {
        this.records = [];
    }
}
