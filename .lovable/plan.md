

## Plan: Change trainee badge from hover to click interaction

Replace the `HoverCard` component with `Popover` in `TrainerSchedule.tsx` so trainee contact info shows on click instead of hover. This also improves mobile usability.

### Changes

**`src/pages/trainer/TrainerSchedule.tsx`**
- Replace imports: `HoverCard, HoverCardTrigger, HoverCardContent` → `Popover, PopoverTrigger, PopoverContent`
- Swap the JSX components accordingly (same content structure, just click-triggered instead of hover)

Single file, ~6 lines changed. No database or backend changes needed.

