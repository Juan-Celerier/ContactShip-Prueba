import { Test, TestingModule } from '@nestjs/testing';
import { AiService } from './ai.service';
import { Lead } from '../leads/lead.entity';

describe('AiService', () => {
  let service: AiService;

  const mockLead: Lead = {
    id: 1,
    first_name: 'John',
    last_name: 'Doe',
    email: 'john.doe@example.com',
    phone: '123-456-7890',
    cell: '098-765-4321',
    picture_large: 'https://example.com/picture.jpg',
    summary: undefined,
    next_action: undefined,
    created_at: new Date(),
    updated_at: new Date(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [AiService],
    }).compile();

    service = module.get<AiService>(AiService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('generateSummaryAndAction', () => {
    it('should return fallback response when OpenAI is not available', async () => {
      delete process.env.OPENAI_API_KEY;

      const result = await service.generateSummaryAndAction(mockLead);

      expect(result).toEqual({
        summary: `Lead: ${mockLead.first_name} ${mockLead.last_name} (${mockLead.email})`,
        next_action: 'Contact the lead via email or phone',
      });
    });

    it('should generate summary using OpenAI and return JSON response', async () => {
      process.env.OPENAI_API_KEY = 'test-key';

      const mockResponse = {
        choices: [
          {
            message: {
              content:
                '{"summary": "Potential high-value client", "next_action": "Schedule a discovery call"}',
            },
          },
        ],
      };

      const module: TestingModule = await Test.createTestingModule({
        providers: [AiService],
      }).compile();

      service = module.get<AiService>(AiService);

      const mockCreate = jest.fn().mockResolvedValue(mockResponse);
      const mockOpenAI = {
        chat: {
          completions: {
            create: mockCreate,
          },
        },
      };
      Object.defineProperty(service, 'openai', {
        value: mockOpenAI,
        writable: true,
      });

      const result = await service.generateSummaryAndAction(mockLead);

      expect(result).toEqual({
        summary: 'Potential high-value client',
        next_action: 'Schedule a discovery call',
      });

      expect(mockCreate).toHaveBeenCalledWith({
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'user',
            // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
            content: expect.stringMatching(/John Doe.*john\.doe@example\.com/),
          },
        ],
        max_tokens: 200,
      });
    });

    it('should handle malformed JSON response and use fallback parsing', async () => {
      process.env.OPENAI_API_KEY = 'test-key';

      const mockResponse = {
        choices: [
          {
            message: {
              content: 'Invalid JSON response',
            },
          },
        ],
      };

      const module: TestingModule = await Test.createTestingModule({
        providers: [AiService],
      }).compile();

      service = module.get<AiService>(AiService);

      const mockOpenAI = {
        chat: {
          completions: {
            create: jest.fn().mockResolvedValue(mockResponse),
          },
        },
      };
      Object.defineProperty(service, 'openai', {
        value: mockOpenAI,
        writable: true,
      });

      const result = await service.generateSummaryAndAction(mockLead);

      expect(result).toEqual({
        summary: 'Invalid JSON response',
        next_action: 'Contact the lead',
      });
    });

    it('should handle OpenAI API errors and retry with exponential backoff', async () => {
      process.env.OPENAI_API_KEY = 'test-key';

      const mockError = new Error('API Error');

      const module: TestingModule = await Test.createTestingModule({
        providers: [AiService],
      }).compile();

      service = module.get<AiService>(AiService);

      const mockCreate = jest
        .fn()
        .mockRejectedValueOnce(mockError)
        .mockRejectedValueOnce(mockError)
        .mockResolvedValue({
          choices: [
            {
              message: {
                content:
                  '{"summary": "Success after retry", "next_action": "Follow up"}',
              },
            },
          ],
        });
      const mockOpenAI = {
        chat: {
          completions: {
            create: mockCreate,
          },
        },
      };
      Object.defineProperty(service, 'openai', {
        value: mockOpenAI,
        writable: true,
      });

      const result = await service.generateSummaryAndAction(mockLead);

      expect(mockCreate).toHaveBeenCalledTimes(3);
      expect(result).toEqual({
        summary: 'Success after retry',
        next_action: 'Follow up',
      });
    });

    it('should return fallback after all retries fail', async () => {
      process.env.OPENAI_API_KEY = 'test-key';

      const mockError = new Error('API Error');

      const module: TestingModule = await Test.createTestingModule({
        providers: [AiService],
      }).compile();

      service = module.get<AiService>(AiService);

      const mockOpenAI = {
        chat: {
          completions: {
            create: jest.fn().mockRejectedValue(mockError),
          },
        },
      };
      Object.defineProperty(service, 'openai', {
        value: mockOpenAI,
        writable: true,
      });

      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();

      const result = await service.generateSummaryAndAction(mockLead);

      expect(consoleSpy).toHaveBeenCalledWith(
        'AI generation failed after retries, using defaults:',
        mockError,
      );

      expect(result).toEqual({
        summary: `Lead: ${mockLead.first_name} ${mockLead.last_name} (${mockLead.email})`,
        next_action: 'Contact the lead via email or phone',
      });

      consoleSpy.mockRestore();
    });

    it('should handle empty response from OpenAI', async () => {
      process.env.OPENAI_API_KEY = 'test-key';

      const mockResponse = {
        choices: [
          {
            message: {
              content: '{}',
            },
          },
        ],
      };

      const module: TestingModule = await Test.createTestingModule({
        providers: [AiService],
      }).compile();

      service = module.get<AiService>(AiService);

      const mockOpenAI = {
        chat: {
          completions: {
            create: jest.fn().mockResolvedValue(mockResponse),
          },
        },
      };
      Object.defineProperty(service, 'openai', {
        value: mockOpenAI,
        writable: true,
      });

      const result = await service.generateSummaryAndAction(mockLead);

      expect(result).toEqual({
        summary: 'No summary generated',
        next_action: 'No action suggested',
      });
    });
  });
});
