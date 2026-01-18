import { Processor, Process } from '@nestjs/bull';
import { Injectable, Logger } from '@nestjs/common';
import type { Job } from 'bull';
import { SyncService } from './sync.service';

interface SyncJobData {
  results: number;
}

@Injectable()
@Processor('sync')
export class SyncProcessor {
  private readonly logger = new Logger(SyncProcessor.name);

  constructor(private readonly syncService: SyncService) {}

  @Process('sync-leads')
  async handleSync(job: Job<SyncJobData>) {
    this.logger.log(`Processing job ${job.id} of type ${job.name}`);
    return await this.syncService.processSync(job);
  }
}
