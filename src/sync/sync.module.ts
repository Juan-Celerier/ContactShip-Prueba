import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bull';
import { LeadsModule } from '../leads/leads.module';
import { SyncService } from './sync.service';
import { SyncProcessor } from './sync.processor';

@Module({
  imports: [
    LeadsModule,
    BullModule.registerQueue({
      name: 'sync',
    }),
  ],
  providers: [SyncService, SyncProcessor],
  exports: [SyncService],
})
export class SyncModule {}
