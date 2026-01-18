import { Injectable } from '@nestjs/common';
import OpenAI from 'openai';
import { Lead } from '../leads/lead.entity';

interface ParsedResponse {
  summary: string;
  next_action: string;
}

@Injectable()
export class AiService {
  private openai: OpenAI | null;

  constructor() {
    if (process.env.OPENAI_API_KEY) {
      this.openai = new OpenAI({
        apiKey: process.env.OPENAI_API_KEY,
      });
    } else {
      this.openai = null;
      console.warn(
        'OpenAI API key not provided, AI features will use fallback defaults',
      );
    }
  }

  async generateSummaryAndAction(
    lead: Lead,
  ): Promise<{ summary: string; next_action: string }> {
    if (!this.openai) {
      return {
        summary: `Lead: ${lead.first_name} ${lead.last_name} (${lead.email})`,
        next_action: 'Contact the lead via email or phone',
      };
    }

    const prompt = `
Given the following lead information:
- Name: ${lead.first_name} ${lead.last_name}
- Email: ${lead.email}
- Phone: ${lead.phone}
- Cell: ${lead.cell}

Generate a brief summary of the lead and suggest the next action to take. Respond in JSON format with keys "summary" and "next_action".
    `;

    const maxRetries = 2;
    let lastError: Error | null = null;

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        const response = await this.openai.chat.completions.create({
          model: 'gpt-4o-mini',
          messages: [{ role: 'user', content: prompt }],
          max_tokens: 200,
        });

        const content = response.choices[0]?.message?.content;
        if (!content) {
          throw new Error('No content in AI response');
        }

        try {
          const parsed = JSON.parse(content) as ParsedResponse;
          return {
            summary: parsed.summary || 'No summary generated',
            next_action: parsed.next_action || 'No action suggested',
          };
        } catch {
          return {
            summary:
              content.split('Next action:')[0]?.trim() || 'Summary generated',
            next_action:
              content.split('Next action:')[1]?.trim() || 'Contact the lead',
          };
        }
      } catch (error) {
        lastError = error as Error;
        console.warn(`AI generation attempt ${attempt + 1} failed:`, error);
        if (attempt < maxRetries) {
          await new Promise((resolve) =>
            setTimeout(resolve, Math.pow(2, attempt) * 1000),
          );
        }
      }
    }

    console.error(
      'AI generation failed after retries, using defaults:',
      lastError,
    );
    return {
      summary: `Lead: ${lead.first_name} ${lead.last_name} (${lead.email})`,
      next_action: 'Contact the lead via email or phone',
    };
  }
}
