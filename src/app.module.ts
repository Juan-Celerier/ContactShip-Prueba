import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { CacheModule, CacheModuleOptions } from '@nestjs/cache-manager';
import { ScheduleModule } from '@nestjs/schedule';
import { BullModule } from '@nestjs/bull';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { LeadsModule } from './leads/leads.module';
import { Lead } from './leads/lead.entity';
import { SyncModule } from './sync/sync.module';
import { AuthModule } from './auth/auth.module';
import { HealthModule } from './health/health.module';
import { redisStore } from 'cache-manager-redis-yet';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    TypeOrmModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        type: 'postgres',
        host: config.get<string>('DB_HOST'),
        port: parseInt(config.get<string>('DB_PORT') || '5432', 10),
        username: config.get<string>('DB_USERNAME'),
        password: config.get<string>('DB_PASSWORD'),
        database: config.get<string>('DB_NAME'),
        entities: [Lead],
        synchronize: process.env.NODE_ENV !== 'production',
      }),
    }),

    CacheModule.registerAsync({
      isGlobal: true,
      useFactory: (configService: ConfigService): CacheModuleOptions => ({
        store: redisStore({
          socket: {
            host: configService.get('REDIS_HOST') || 'localhost',
            port: parseInt(configService.get('REDIS_PORT') || '6379', 10),
          },
        }),
        ttl: 300,
      }),
      inject: [ConfigService],
    }),
    ScheduleModule.forRoot(),
    BullModule.forRoot({
      redis: {
        host: process.env.REDIS_HOST || 'localhost',
        port: (() => {
          const port = parseInt(process.env.REDIS_PORT || '6379', 10);
          return isNaN(port) ? 6379 : port;
        })(),
      },
    }),
    AuthModule,
    LeadsModule,
    SyncModule,
    HealthModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
