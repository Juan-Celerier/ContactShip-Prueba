import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { InjectQueue } from '@nestjs/bull';
import type { Queue, Job } from 'bull';
import { LeadsService } from '../leads/leads.service';
import { RandomUserData } from '../leads/leads.service';
import axios from 'axios';

interface RandomUserResponse {
  results: RandomUserData[];
}

interface SyncJobData {
  results: number;
}

@Injectable()
export class SyncService {
  private readonly logger = new Logger(SyncService.name);

  constructor(
    private readonly leadsService: LeadsService,
    @InjectQueue('sync') private syncQueue: Queue,
  ) {}

  @Cron(CronExpression.EVERY_HOUR)
  protected async handleCron() {
    if (process.env.NODE_ENV === 'test') {
      return;
    }

    this.logger.log('Adding sync job to queue');
    await this.syncQueue.add(
      'sync-leads',
      { results: 10 },
      {
        attempts: 3,
        backoff: {
          type: 'exponential',
          delay: 2000,
        },
        removeOnComplete: 10,
        removeOnFail: 5,
      },
    );
  }

  public async processSync(job: Job<SyncJobData>) {
    const { results } = job.data;
    this.logger.log(`Processing sync job for ${results} leads`);

    try {
      const response = await axios.get<RandomUserResponse>(
        `https://randomuser.me/api/?results=${results}`,
      );
      const users = response.data.results;
      let synced = 0;

      for (const user of users) {
        try {
          const lead = await this.leadsService.createFromExternal(user);
          if (lead) {
            synced++;
          }
        } catch (error) {
          this.logger.error(
            `Failed to create lead for user ${user.name.first} ${user.name.last}`,
            error,
          );
        }
      }

      this.logger.log(`Synced ${synced} new leads`);
      return { synced };
    } catch (error) {
      this.logger.error('Error syncing leads', error);
      throw error;
    }
  }
}
