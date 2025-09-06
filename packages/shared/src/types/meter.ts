export interface UsageEvent {
    userId: string;
    eventType: 'tts_generation';
    quantity: number;
    metadata: {
        agentId?: string;
        agentName?: string;
        textLength: number;
        audioLength?: number;
        voiceModel?: string;
        quality?: string;
    };
    cost: number;
    timestamp: Date;
}


export interface MeteringResult {
    success: boolean;
    creditsDeducted: number;
    remainingCredits: number;
    usageEventId?: string;
    error?: string;
}
