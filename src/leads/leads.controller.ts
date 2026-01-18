import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  ParseIntPipe,
  UseGuards,
} from '@nestjs/common';
import { LeadsService } from './leads.service';
import { CreateLeadDto } from './dto/create-lead.dto';
import { Lead } from './lead.entity';
import { JwtGuard } from '../auth/jwt.guard';

@Controller()
@UseGuards(JwtGuard)
export class LeadsController {
  constructor(private readonly leadsService: LeadsService) {}

  @Post('create-lead')
  async create(@Body() createLeadDto: CreateLeadDto): Promise<Lead> {
    return this.leadsService.create(createLeadDto);
  }

  @Get('leads')
  async findAll(): Promise<Lead[]> {
    return this.leadsService.findAll();
  }

  @Get('leads/:id')
  async findOne(@Param('id', ParseIntPipe) id: number): Promise<Lead> {
    return this.leadsService.findOne(id);
  }

  @Post('leads/:id/summarize')
  async summarize(
    @Param('id', ParseIntPipe) id: number,
  ): Promise<{ summary: string; next_action: string }> {
    return this.leadsService.generateSummary(id);
  }
}
