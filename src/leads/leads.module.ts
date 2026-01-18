import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CacheModule } from '@nestjs/cache-manager';
import { AiModule } from '../ai/ai.module';
import { LeadsController } from './leads.controller';
import { LeadsService } from './leads.service';
import { Lead } from './lead.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Lead]), CacheModule.register(), AiModule],
  controllers: [LeadsController],
  providers: [LeadsService],
  exports: [LeadsService],
})
export class LeadsModule {}
