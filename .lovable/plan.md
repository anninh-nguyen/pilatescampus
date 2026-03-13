

## Plan: Update Trainers Page Action Buttons Layout

**Current state**: Trainers page uses icon-only buttons (`size="icon"`) with no captions. Trainees page uses `size="sm"` buttons with icons + text captions in a horizontal row (`space-x-2`).

**Change**: Update the Trainers page action buttons cell to match the Trainees page pattern:

1. **Change the Actions column header** (line 130): Replace `<TableHead className="w-[60px]" />` with `<TableHead>{t("admin.trainers.actions")}</TableHead>` (add translation key).

2. **Update the action buttons cell** (lines 149-154): Change from icon-only buttons to `size="sm"` buttons with captions in a `space-x-2` container:
   - Change Role: `<Button variant="ghost" size="sm">` with `<ShieldCheck />` + `{t("admin.trainers.changeRole")}`
   - Delete: `<Button variant="ghost" size="sm">` with `<Trash2 />` + `{t("admin.trainers.delete")}` (or existing translation)

3. **Add translation keys** in `en.ts` and `vi.ts` for `admin.trainers.actions` and `admin.trainers.delete` if not already present.

