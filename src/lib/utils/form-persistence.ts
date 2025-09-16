export interface FormDraft {
  id: string;
  data: any;
  lastSaved: string;
  step: number;
  completion: number;
  qualityScore: number;
}

export class FormPersistence {
  private static readonly STORAGE_KEY = 'seller-intake-draft';
  private static readonly DRAFTS_KEY = 'seller-intake-drafts';
  private static readonly MAX_DRAFTS = 5;

  static saveDraft(data: any, step: number, completion: number, qualityScore: number): string {
    const draft: FormDraft = {
      id: this.generateDraftId(),
      data,
      lastSaved: new Date().toISOString(),
      step,
      completion,
      qualityScore
    };

    // Save current draft
    localStorage.setItem(this.STORAGE_KEY, JSON.stringify(draft));

    // Update drafts history
    this.addToDraftsHistory(draft);

    return draft.id;
  }

  static loadCurrentDraft(): FormDraft | null {
    try {
      const saved = localStorage.getItem(this.STORAGE_KEY);
      return saved ? JSON.parse(saved) : null;
    } catch (error) {
      console.warn('Could not load current draft:', error);
      return null;
    }
  }

  static loadDraftById(id: string): FormDraft | null {
    try {
      const drafts = this.getDraftsHistory();
      return drafts.find(draft => draft.id === id) || null;
    } catch (error) {
      console.warn('Could not load draft by id:', error);
      return null;
    }
  }

  static getDraftsHistory(): FormDraft[] {
    try {
      const saved = localStorage.getItem(this.DRAFTS_KEY);
      return saved ? JSON.parse(saved) : [];
    } catch (error) {
      console.warn('Could not load drafts history:', error);
      return [];
    }
  }

  static deleteDraft(id: string): void {
    try {
      // Remove from history
      const drafts = this.getDraftsHistory().filter(draft => draft.id !== id);
      localStorage.setItem(this.DRAFTS_KEY, JSON.stringify(drafts));

      // Clear current if it matches
      const current = this.loadCurrentDraft();
      if (current?.id === id) {
        localStorage.removeItem(this.STORAGE_KEY);
      }
    } catch (error) {
      console.warn('Could not delete draft:', error);
    }
  }

  static clearAllDrafts(): void {
    localStorage.removeItem(this.STORAGE_KEY);
    localStorage.removeItem(this.DRAFTS_KEY);
  }

  static exportDraft(id: string): string | null {
    const draft = this.loadDraftById(id);
    return draft ? JSON.stringify(draft, null, 2) : null;
  }

  static importDraft(jsonString: string): boolean {
    try {
      const draft = JSON.parse(jsonString) as FormDraft;

      // Validate draft structure
      if (!draft.id || !draft.data || !draft.lastSaved) {
        return false;
      }

      // Generate new ID to avoid conflicts
      draft.id = this.generateDraftId();
      draft.lastSaved = new Date().toISOString();

      // Save as current draft
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(draft));
      this.addToDraftsHistory(draft);

      return true;
    } catch (error) {
      console.warn('Could not import draft:', error);
      return false;
    }
  }

  private static generateDraftId(): string {
    return `draft_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private static addToDraftsHistory(draft: FormDraft): void {
    try {
      let drafts = this.getDraftsHistory();

      // Remove existing draft with same id
      drafts = drafts.filter(d => d.id !== draft.id);

      // Add new draft to front
      drafts.unshift(draft);

      // Limit to max drafts
      if (drafts.length > this.MAX_DRAFTS) {
        drafts = drafts.slice(0, this.MAX_DRAFTS);
      }

      localStorage.setItem(this.DRAFTS_KEY, JSON.stringify(drafts));
    } catch (error) {
      console.warn('Could not save draft to history:', error);
    }
  }
}

export class AutoSave {
  private static timers = new Map<string, NodeJS.Timeout>();
  private static readonly DEBOUNCE_DELAY = 2000; // 2 seconds

  static schedule(
    key: string,
    saveFunction: () => void,
    delay: number = this.DEBOUNCE_DELAY
  ): void {
    // Clear existing timer
    const existingTimer = this.timers.get(key);
    if (existingTimer) {
      clearTimeout(existingTimer);
    }

    // Set new timer
    const timer = setTimeout(() => {
      saveFunction();
      this.timers.delete(key);
    }, delay);

    this.timers.set(key, timer);
  }

  static cancel(key: string): void {
    const timer = this.timers.get(key);
    if (timer) {
      clearTimeout(timer);
      this.timers.delete(key);
    }
  }

  static cancelAll(): void {
    for (const [key, timer] of this.timers) {
      clearTimeout(timer);
    }
    this.timers.clear();
  }
}

export function formatLastSaved(dateString: string): string {
  try {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / (1000 * 60));
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;

    return date.toLocaleDateString();
  } catch (error) {
    return 'Unknown';
  }
}

export function validateFormData(data: any): { isValid: boolean; errors: string[] } {
  const errors: string[] = [];

  // Basic validation
  if (!data || typeof data !== 'object') {
    errors.push('Invalid form data structure');
    return { isValid: false, errors };
  }

  // Check for required step 1 data
  if (!data.step1?.platformName?.trim()) {
    errors.push('Platform name is required');
  }

  if (!data.step1?.elevatorPitch?.trim()) {
    errors.push('Elevator pitch is required');
  }

  if (!data.step1?.detailedDescription?.trim()) {
    errors.push('Detailed description is required');
  }

  return {
    isValid: errors.length === 0,
    errors
  };
}