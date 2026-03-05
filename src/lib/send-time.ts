/**
 * Compute optimal send hour from a list of open timestamps.
 * Returns the hour (0-23) that has the most opens.
 */
export function computeOptimalHour(openTimestamps: Date[]): number | null {
    if (openTimestamps.length < 2) return null;

    const hourCounts = new Array(24).fill(0);
    for (const ts of openTimestamps) {
        hourCounts[ts.getHours()]++;
    }

    let maxHour = 0;
    let maxCount = 0;
    for (let h = 0; h < 24; h++) {
        if (hourCounts[h] > maxCount) {
            maxCount = hourCounts[h];
            maxHour = h;
        }
    }

    return maxHour;
}

/**
 * Given an optimal hour and a base date, return the next occurrence of that hour.
 * If the hour hasn't passed today, return today at that hour.
 * Otherwise, return tomorrow at that hour.
 */
export function getNextSendTime(optimalHour: number, now: Date = new Date()): Date {
    const target = new Date(now);
    target.setMinutes(0, 0, 0);
    target.setHours(optimalHour);

    if (target <= now) {
        target.setDate(target.getDate() + 1);
    }

    return target;
}
