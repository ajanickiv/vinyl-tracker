import { Injectable } from '@angular/core';
import { DatabaseService } from './database.service';
import { Release } from '../models/release.model';

@Injectable({
    providedIn: 'root'
})
export class PlaybackService {

    constructor(private db: DatabaseService) { }

    /**
     * Mark a release as played
     * Increments play count and updates last played date
     */
    async markAsPlayed(releaseId: number): Promise<Release | null> {
        try {
            const release = await this.db.getRelease(releaseId);

            if (!release) {
                console.error(`Release ${releaseId} not found`);
                return null;
            }

            const updatedRelease = {
                ...release,
                playCount: release.playCount + 1,
                lastPlayedDate: new Date()
            };

            await this.db.updateRelease(releaseId, {
                playCount: updatedRelease.playCount,
                lastPlayedDate: updatedRelease.lastPlayedDate
            });

            console.log(`✅ Marked as played: ${release.basicInfo.title} (play count: ${updatedRelease.playCount})`);

            return updatedRelease;
        } catch (error) {
            console.error('Failed to mark as played:', error);
            return null;
        }
    }

    /**
     * Get play statistics for a release
     */
    async getPlayStats(releaseId: number): Promise<{
        playCount: number;
        lastPlayedDate?: Date;
        daysSinceLastPlayed?: number;
    } | null> {
        const release = await this.db.getRelease(releaseId);

        if (!release) {
            return null;
        }

        let daysSinceLastPlayed: number | undefined;
        if (release.lastPlayedDate) {
            const now = new Date();
            const diff = now.getTime() - release.lastPlayedDate.getTime();
            daysSinceLastPlayed = Math.floor(diff / (1000 * 60 * 60 * 24));
        }

        return {
            playCount: release.playCount,
            lastPlayedDate: release.lastPlayedDate,
            daysSinceLastPlayed
        };
    }

    /**
     * Get overall collection statistics
     */
    async getCollectionStats(): Promise<{
        totalReleases: number;
        totalPlays: number;
        neverPlayed: number;
        mostPlayed?: Release;
        leastPlayed?: Release;
    }> {
        const allReleases = await this.db.getAllReleases();

        const totalReleases = allReleases.length;
        const totalPlays = allReleases.reduce((sum, r) => sum + r.playCount, 0);
        const neverPlayed = allReleases.filter(r => r.playCount === 0).length;

        const sortedByPlayCount = [...allReleases].sort((a, b) => b.playCount - a.playCount);
        const mostPlayed = sortedByPlayCount[0];

        const playedReleases = allReleases.filter(r => r.playCount > 0);
        const leastPlayed = playedReleases.sort((a, b) => a.playCount - b.playCount)[0];

        return {
            totalReleases,
            totalPlays,
            neverPlayed,
            mostPlayed,
            leastPlayed
        };
    }
}