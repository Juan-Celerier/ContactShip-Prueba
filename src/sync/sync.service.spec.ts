import { Test, TestingModule } from '@nestjs/testing';
import { SyncService } from './sync.service';
import { LeadsService } from '../leads/leads.service';
import { getQueueToken } from '@nestjs/bull';
import type { Job } from 'bull';
import axios from 'axios';

interface SyncJobData {
  results: number;
}

jest.mock('axios');
const mockedAxios = axios as jest.Mocked<typeof axios>;

class TestSyncService extends SyncService {
  public async testHandleCron() {
    return this.handleCron();
  }

  public async testProcessSync(job: Job<SyncJobData>) {
    return this.processSync(job);
  }
}

describe('SyncService', () => {
  let service: TestSyncService;

  const mockLeadsService = {
    createFromExternal: jest.fn(),
  };

  const mockQueue = {
    add: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TestSyncService,
        {
          provide: LeadsService,
          useValue: mockLeadsService,
        },
        {
          provide: getQueueToken('sync'),
          useValue: mockQueue,
        },
      ],
    }).compile();

    service = module.get<TestSyncService>(TestSyncService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('handleCron', () => {
    it('should add sync job to queue every hour', async () => {
      mockQueue.add.mockResolvedValue({});

      await service.testHandleCron();

      expect(mockQueue.add).toHaveBeenCalledWith(
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
    });
  });

  describe('processSync', () => {
    it('should successfully sync leads from external API', async () => {
      const mockJob = {
        data: { results: 10 },
      };

      const mockApiResponse = {
        data: {
          results: [
            {
              name: { first: 'John', last: 'Doe' },
              email: 'john.doe@example.com',
              phone: '123-456-7890',
              cell: '098-765-4321',
              picture: { large: 'https://example.com/picture.jpg' },
            },
            {
              name: { first: 'Jane', last: 'Smith' },
              email: 'jane.smith@example.com',
              phone: '098-765-4321',
              cell: '123-456-7890',
              picture: { large: 'https://example.com/picture2.jpg' },
            },
          ],
        },
      };

      mockedAxios.get.mockResolvedValue(mockApiResponse);
      mockLeadsService.createFromExternal
        .mockResolvedValueOnce({ id: 1 })
        .mockResolvedValueOnce(null);

      const result = await service.testProcessSync(mockJob as Job<SyncJobData>);

      // eslint-disable-next-line @typescript-eslint/unbound-method
      expect(mockedAxios.get).toHaveBeenCalledWith(
        'https://randomuser.me/api/?results=10',
      );
      expect(mockLeadsService.createFromExternal).toHaveBeenCalledTimes(2);
      expect(result).toEqual({ synced: 1 });
    });

    it('should handle API errors gracefully', async () => {
      const mockJob = {
        data: { results: 10 },
      };

      const mockError = new Error('API Error');
      mockedAxios.get.mockRejectedValue(mockError);

      await expect(
        service.testProcessSync(mockJob as Job<SyncJobData>),
      ).rejects.toThrow('API Error');
    });

    it('should handle empty results from API', async () => {
      const mockJob = {
        data: { results: 10 },
      };

      const mockApiResponse = {
        data: {
          results: [],
        },
      };

      mockedAxios.get.mockResolvedValue(mockApiResponse);

      const result = await service.testProcessSync(mockJob as Job<SyncJobData>);

      expect(mockLeadsService.createFromExternal).not.toHaveBeenCalled();
      expect(result).toEqual({ synced: 0 });
    });

    it('should handle partial failures in lead creation', async () => {
      const mockJob = {
        data: { results: 10 },
      };

      const mockApiResponse = {
        data: {
          results: [
            {
              name: { first: 'John', last: 'Doe' },
              email: 'john.doe@example.com',
              phone: '123-456-7890',
              cell: '098-765-4321',
              picture: { large: 'https://example.com/picture.jpg' },
            },
            {
              name: { first: 'Jane', last: 'Smith' },
              email: 'jane.smith@example.com',
              phone: '098-765-4321',
              cell: '123-456-7890',
              picture: { large: 'https://example.com/picture2.jpg' },
            },
          ],
        },
      };

      mockedAxios.get.mockResolvedValue(mockApiResponse);
      mockLeadsService.createFromExternal
        .mockRejectedValueOnce(new Error('DB Error'))
        .mockResolvedValueOnce({ id: 2 });

      const result = await service.testProcessSync(mockJob as Job<SyncJobData>);

      expect(mockLeadsService.createFromExternal).toHaveBeenCalledTimes(2);
      expect(result).toEqual({ synced: 1 });
    });
  });
});
