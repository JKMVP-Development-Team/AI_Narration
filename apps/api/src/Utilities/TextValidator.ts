import { ITextValidator, ValidationResult } from '@shared/types/logger'

export class TTSTextValidator implements ITextValidator {
  constructor(
    private readonly maxLength: number,
    private readonly warningLength: number
  ) {}

  validate(text: string): ValidationResult {
    if (!text || typeof text !== 'string') {
      return { isValid: false, error: 'Text is required and must be a string' }
    }

    const trimmedText = text.trim()
    if (trimmedText.length === 0) {
      return { isValid: false, error: 'Text cannot be empty' }
    }

    if (trimmedText.length > this.maxLength) {
      const truncatedText = this.truncateText(trimmedText, this.maxLength)
      return {
        isValid: true,
        error: `Text length (${trimmedText.length}) exceeds maximum (${this.maxLength}). Text has been truncated.`,
        truncatedText
      }
    }

    if (trimmedText.length > this.warningLength) {
      return {
        isValid: true,
        error: `Warning: Text length (${trimmedText.length}) is quite long. Consider breaking it into smaller chunks for better performance.`,
        truncatedText: trimmedText
      }
    }

    return { isValid: true, truncatedText: trimmedText }
  }

  private truncateText(text: string, maxLength: number): string {
    if (text.length <= maxLength) return text
    
    // Try to truncate at sentence boundary
    const sentences = text.substring(0, maxLength).split(/[.!?]+/)
    if (sentences.length > 1) {
      sentences.pop() // Remove incomplete sentence
      const result = sentences.join('.') + '.'
      if (result.length > 10) return result
    }

    // Fallback to word boundary
    const words = text.substring(0, maxLength).split(' ')
    words.pop() // Remove incomplete word
    return words.join(' ') + '...'
  }
}