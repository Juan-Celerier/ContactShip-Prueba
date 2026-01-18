import {
  Injectable,
  ConflictException,
  NotFoundException,
  Inject,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import type { Cache } from 'cache-manager';
import { Lead } from './lead.entity';
import { CreateLeadDto } from './dto/create-lead.dto';
import { AiService } from '../ai/ai.service';

export interface RandomUserData {
  name: { first: string; last: string };
  email: string;
  phone: string;
  cell: string;
  picture: { large: string };
}

@Injectable()
export class LeadsService {
  constructor(
    @InjectRepository(Lead)
    private readonly leadRepository: Repository<Lead>,
    @Inject(CACHE_MANAGER) private cacheManager: Cache,
    private readonly aiService: AiService,
  ) {}

  async create(createLeadDto: CreateLeadDto): Promise<Lead> {
    const existingLead = await this.leadRepository.findOne({
      where: { email: createLeadDto.email },
    });
    if (existingLead) {
      throw new ConflictException('Lead with this email already exists');
    }
    const lead = this.leadRepository.create(createLeadDto);
    return this.leadRepository.save(lead);
  }

  async findAll(): Promise<Lead[]> {
    return this.leadRepository.find();
  }

  async findOne(id: number): Promise<Lead> {
    const cacheKey = `lead:${id}`;
    const cachedLead = await this.cacheManager.get<Lead>(cacheKey);
    if (cachedLead) {
      return cachedLead;
    }
    const lead = await this.leadRepository.findOne({ where: { id } });
    if (!lead) {
      throw new NotFoundException('Lead not found');
    }
    await this.cacheManager.set(cacheKey, lead, 300000);
    return lead;
  }

  async updateSummary(
    id: number,
    summary: string,
    nextAction: string,
  ): Promise<Lead> {
    const lead = await this.findOne(id);
    lead.summary = summary;
    lead.next_action = nextAction;

    const cacheKey = `lead:${id}`;
    await this.cacheManager.del(cacheKey);

    return this.leadRepository.save(lead);
  }

  async generateSummary(
    id: number,
  ): Promise<{ summary: string; next_action: string }> {
    const lead = await this.findOne(id);
    const result = await this.aiService.generateSummaryAndAction(lead);
    await this.updateSummary(id, result.summary, result.next_action);
    return result;
  }

  async createFromExternal(data: RandomUserData): Promise<Lead | null> {
    const existingLead = await this.leadRepository.findOne({
      where: { email: data.email },
    });
    if (existingLead) {
      return null;
    }
    const lead = this.leadRepository.create({
      first_name: data.name.first,
      last_name: data.name.last,
      email: data.email,
      phone: data.phone,
      cell: data.cell,
      picture_large: data.picture.large,
    });
    return this.leadRepository.save(lead);
  }
}
