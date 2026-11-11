import { AudioLines, BookOpen, ClipboardPaste, House, Layers, MessagesSquare, NotebookPen, PartyPopper, PenLine, Route, TrendingUp, Wrench, type LucideIcon } from 'lucide-react';
import type { StepKind } from '../core/session/plan';

/**
 * The colour and icon of each step and each section (docs/THIET-KE.md 2.1). Everything toned reads
 * from here, so a step looks the same in the step bar, its header and wherever it is mentioned.
 */
export type Tone = 'review' | 'input' | 'shadow' | 'produce' | 'wrap' | 'fix';

export const STEP_LOOK: Record<StepKind, { tone: Tone; icon: LucideIcon }> = {
  review: { tone: 'review', icon: Layers },
  input: { tone: 'input', icon: BookOpen },
  shadow: { tone: 'shadow', icon: AudioLines },
  produce: { tone: 'produce', icon: PenLine },
  wrap: { tone: 'wrap', icon: PartyPopper },
};

export const SECTION_LOOK = {
  today: { tone: 'produce', icon: House },
  path: { tone: 'input', icon: Route },
  capture: { tone: 'shadow', icon: ClipboardPaste },
  errors: { tone: 'fix', icon: NotebookPen },
  progress: { tone: 'wrap', icon: TrendingUp },
  roleplay: { tone: 'review', icon: MessagesSquare },
  fix: { tone: 'fix', icon: Wrench },
} satisfies Record<string, { tone: Tone; icon: LucideIcon }>;

export const toneClass = (tone: Tone) => `tone-${tone}`;
