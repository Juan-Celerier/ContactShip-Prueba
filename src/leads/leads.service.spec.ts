import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { LeadsService } from './leads.service';
import { Lead } from './lead.entity';
import { AiService } from '../ai/ai.service';

describe('LeadsService', () => {
  let service: LeadsService;

  const mockLead = {
    id: 1,
    first_name: 'John',
    last_name: 'Doe',
    email: 'john.doe@example.com',
    phone: '123-456-7890',
    cell: '098-765-4321',
    picture_large: 'https://example.com/picture.jpg',
    summary: null,
    next_action: null,
  };

  const mockRepository = {
    findOne: jest.fn(),
    find: jest.fn(),
    create: jest.fn(),
    save: jest.fn(),
  };

  const mockCacheManager = {
    get: jest.fn(),
    set: jest.fn(),
    del: jest.fn(),
  };

  const mockAiService = {
    generateSummaryAndAction: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        LeadsService,
        {
          provide: getRepositoryToken(Lead),
          useValue: mockRepository,
        },
        {
          provide: CACHE_MANAGER,
          useValue: mockCacheManager,
        },
        {
          provide: AiService,
          useValue: mockAiService,
        },
      ],
    }).compile();

    service = module.get<LeadsService>(LeadsService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('create', () => {
    it('should create a new lead successfully', async () => {
      mockRepository.findOne.mockResolvedValue(null);
      mockRepository.create.mockReturnValue(mockLead);
      mockRepository.save.mockResolvedValue(mockLead);

      const createLeadDto = {
        first_name: 'John',
        last_name: 'Doe',
        email: 'john.doe@example.com',
        phone: '123-456-7890',
        cell: '098-765-4321',
        picture_large: 'https://example.com/picture.jpg',
      };

      const result = await service.create(createLeadDto);

      expect(mockRepository.findOne).toHaveBeenCalledWith({
        where: { email: createLeadDto.email },
      });
      expect(mockRepository.create).toHaveBeenCalledWith(createLeadDto);
      expect(mockRepository.save).toHaveBeenCalledWith(mockLead);
      expect(result).toEqual(mockLead);
    });

    it('should throw ConflictException if email already exists', async () => {
      mockRepository.findOne.mockResolvedValue(mockLead);

      const createLeadDto = {
        first_name: 'Jane',
        last_name: 'Smith',
        email: 'john.doe@example.com',
        phone: '123-456-7890',
        cell: '098-765-4321',
        picture_large: 'https://example.com/picture.jpg',
      };

      await expect(service.create(createLeadDto)).rejects.toThrow(
        'Lead with this email already exists',
      );
    });
  });

  describe('findAll', () => {
    it('should return all leads', async () => {
      const leads = [mockLead];
      mockRepository.find.mockResolvedValue(leads);

      const result = await service.findAll();

      expect(mockRepository.find).toHaveBeenCalled();
      expect(result).toEqual(leads);
    });
  });

  describe('findOne', () => {
    it('should return cached lead if available', async () => {
      mockCacheManager.get.mockResolvedValue(mockLead);

      const result = await service.findOne(1);

      expect(mockCacheManager.get).toHaveBeenCalledWith('lead:1');
      expect(mockRepository.findOne).not.toHaveBeenCalled();
      expect(result).toEqual(mockLead);
    });

    it('should fetch from database and cache if not cached', async () => {
      mockCacheManager.get.mockResolvedValue(null);
      mockRepository.findOne.mockResolvedValue(mockLead);

      const result = await service.findOne(1);

      expect(mockCacheManager.get).toHaveBeenCalledWith('lead:1');
      expect(mockRepository.findOne).toHaveBeenCalledWith({ where: { id: 1 } });
      expect(mockCacheManager.set).toHaveBeenCalledWith(
        'lead:1',
        mockLead,
        300000,
      );
      expect(result).toEqual(mockLead);
    });

    it('should throw NotFoundException if lead not found', async () => {
      mockCacheManager.get.mockResolvedValue(null);
      mockRepository.findOne.mockResolvedValue(null);

      await expect(service.findOne(1)).rejects.toThrow('Lead not found');
    });
  });

  describe('generateSummary', () => {
    it('should generate summary and update lead', async () => {
      const summaryResult = {
        summary: 'Test summary',
        next_action: 'Test action',
      };
      mockCacheManager.get.mockResolvedValue(mockLead);
      mockAiService.generateSummaryAndAction.mockResolvedValue(summaryResult);
      mockRepository.save.mockResolvedValue({ ...mockLead, ...summaryResult });

      const result = await service.generateSummary(1);

      expect(mockAiService.generateSummaryAndAction).toHaveBeenCalledWith(
        mockLead,
      );
      expect(mockCacheManager.del).toHaveBeenCalledWith('lead:1');
      expect(result).toEqual(summaryResult);
    });
  });

  describe('createFromExternal', () => {
    it('should create lead from external data if email not exists', async () => {
      const externalData = {
        name: { first: 'John', last: 'Doe' },
        email: 'john.doe@example.com',
        phone: '123-456-7890',
        cell: '098-765-4321',
        picture: { large: 'https://example.com/picture.jpg' },
      };

      mockRepository.findOne.mockResolvedValue(null);
      mockRepository.create.mockReturnValue(mockLead);
      mockRepository.save.mockResolvedValue(mockLead);

      const result = await service.createFromExternal(externalData);

      expect(mockRepository.findOne).toHaveBeenCalledWith({
        where: { email: externalData.email },
      });
      expect(mockRepository.create).toHaveBeenCalledWith({
        first_name: externalData.name.first,
        last_name: externalData.name.last,
        email: externalData.email,
        phone: externalData.phone,
        cell: externalData.cell,
        picture_large: externalData.picture.large,
      });
      expect(result).toEqual(mockLead);
    });

    it('should return null if email already exists', async () => {
      const externalData = {
        name: { first: 'Jane', last: 'Smith' },
        email: 'john.doe@example.com',
        phone: '123-456-7890',
        cell: '098-765-4321',
        picture: { large: 'https://example.com/picture.jpg' },
      };

      mockRepository.findOne.mockResolvedValue(mockLead);

      const result = await service.createFromExternal(externalData);

      expect(result).toBeNull();
      expect(mockRepository.create).not.toHaveBeenCalled();
      expect(mockRepository.save).not.toHaveBeenCalled();
    });
  });
});
