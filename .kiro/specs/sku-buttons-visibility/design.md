# Design Document: SKU Management Buttons Visibility

## Overview

The SKU Manager component currently uses a flexbox layout with a scrollable middle section, but the table footer (containing action buttons) is not properly constrained. When many SKUs are present, the table grows beyond the available space and the footer buttons become hidden below the viewport.

The solution involves restructuring the component's layout to ensure:
1. The top section (SPU info, filters) remains fixed
2. The middle section (SKU table) becomes scrollable with a maximum height
3. The bottom section (action buttons) remains fixed and always visible

## Architecture

The SKUManager component uses a three-section layout:

```
┌─────────────────────────────────────┐
│ SPU Info & Filter Controls (Fixed)  │  ← flexShrink: 0
├─────────────────────────────────────┤
│                                     │
│  SKU Table (Scrollable)             │  ← flex: 1, overflowY: auto
│  - Header (sticky)                  │
│  - Rows                             │
│                                     │
├─────────────────────────────────────┤
│ Action Buttons (Fixed)              │  ← flexShrink: 0
└─────────────────────────────────────┘
```

## Components and Interfaces

### SKUManager Component Structure

**Current Issue:**
- The outer container uses `display: flex` with `flexDirection: column` and `height: 100%`
- The middle scrollable section has `flex: 1` and `overflowY: auto`
- However, the table footer is inside the scrollable area, causing it to scroll out of view

**Solution:**
- Separate the table and footer into distinct sections
- Keep the table in the scrollable area
- Move the footer outside the scrollable area to a fixed bottom section
- Ensure the scrollable area has proper height constraints

### Layout Structure

```typescript
<div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
  {/* Section 1: Fixed Top - SPU Info */}
  <div style={{ flexShrink: 0 }}>
    SPU ID and name info
  </div>

  {/* Section 2: Scrollable Middle - Form and Table */}
  <div style={{ flex: 1, overflowY: 'auto' }}>
    <Form>
      {/* Filter controls */}
    </Form>
    <Table>
      {/* Table content only, no footer */}
    </Table>
  </div>

  {/* Section 3: Fixed Bottom - Action Buttons */}
  <div style={{ flexShrink: 0, borderTop: '1px solid #f0f0f0', padding: '16px' }}>
    <Button>+ 新增</Button>
    <Button>确认修改</Button>
  </div>
</div>
```

## Data Models

No new data models are required. The component structure remains the same; only the layout is reorganized.

## Correctness Properties

A property is a characteristic or behavior that should hold true across all valid executions of a system—essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.

### Property 1: Action Buttons Always Visible

**For any** SKU list size (0 to 1000+ items), the action buttons in the footer SHALL remain visible within the viewport and not be scrolled out of view when the table content is scrolled.

**Validates: Requirements 1.1, 1.2, 1.3**

### Property 2: Table Scrollability

**For any** SKU list that exceeds the available vertical space, the table area SHALL be scrollable while the header and footer remain fixed in their positions.

**Validates: Requirements 2.1, 2.2, 2.3**

### Property 3: Layout Stability

**For any** viewport height and SKU list size, the component layout SHALL maintain consistent spacing and alignment without overflow or layout shifts.

**Validates: Requirements 3.1, 3.2, 3.3**

## Error Handling

No error handling changes are required. The layout fix does not affect error handling logic.

## Testing Strategy

### Unit Tests

- Test that the component renders with various SKU list sizes (0, 1, 10, 100, 1000 items)
- Verify that the action buttons are present in the DOM
- Verify that the scrollable area has the correct CSS properties (overflow, flex, height)
- Test that the component maintains proper layout on different screen sizes

### Property-Based Tests

- **Property 1 Test**: For any generated SKU list, verify that action buttons remain in the viewport
- **Property 2 Test**: For any SKU list exceeding available space, verify table scrollability
- **Property 3 Test**: For any viewport height, verify layout stability and no overflow

### Integration Tests

- Test that clicking the "Add" button works when the table is scrolled
- Test that clicking the "Confirm Changes" button works when the table is scrolled
- Test that the form controls remain functional when the table is scrolled
