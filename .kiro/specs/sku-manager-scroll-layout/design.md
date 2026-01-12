# Design Document: SKU Manager Scroll Layout

## Overview

The SKU Manager component will be restructured to implement a three-zone layout pattern:
1. **Fixed Header Zone** - SPU ID information that remains visible at the top
2. **Scrollable Content Zone** - Version/configuration/color selectors and SKU table that scroll together
3. **Scrollable Footer Zone** - Action buttons that scroll with the content

This design ensures users always see the SPU context while being able to scroll through selectors and table content, with action buttons accessible at the bottom of the scrollable area.

## Architecture

### Layout Structure

The component uses a flexbox-based layout with three distinct regions:

```
┌─────────────────────────────────┐
│  SPU ID Information (Fixed)     │  ← flexShrink: 0, height: auto
├─────────────────────────────────┤
│                                 │
│  Scrollable Container           │  ← flex: 1, minHeight: 0, overflow-y: auto
│  ┌───────────────────────────┐  │
│  │ Version Selector          │  │
│  │ Configuration Selector    │  │
│  │ Color Selector            │  │
│  │ Parameter Info            │  │
│  │                           │  │
│  │ SKU Table                 │  │
│  │ (with padding-bottom)     │  │
│  │                           │  │
│  │ Action Buttons            │  │
│  │ (+ 新增, 确认修改)        │  │
│  └───────────────────────────┘  │
│                                 │
└─────────────────────────────────┘
```

### CSS Implementation

The scrollable region uses:
- `flex: 1` - Takes remaining space
- `minHeight: 0` - Allows flex container to shrink below content size
- `overflow-y: auto` - Enables vertical scrolling
- `padding-bottom` - Reserves space for action buttons to be fully visible

The action buttons are positioned at the bottom of the scrollable container using:
- Flexbox layout within the scrollable region
- Margin-top: auto - Pushes buttons to bottom
- Or positioned as the last element in the scrollable content

## Components and Interfaces

### SKUManager Component Structure

```typescript
SKUManager
├── SPU ID Header (fixed, flexShrink: 0)
└── Scrollable Container (flex: 1, minHeight: 0, overflow-y: auto)
    ├── Form with Selectors
    │   ├── Version Selector
    │   ├── Configuration Selector
    │   ├── Color Selector
    │   └── Parameter Info
    ├── EditRelationshipSPUwithSKUs
    │   ├── SKU Table
    │   └── Action Buttons (at bottom)
    └── SKU Add Drawer (separate)
```

### CSS Classes

- `.sku-form-scroll` - Main scrollable container wrapper
- `.sku-table-wrapper` - Inner scrollable region with overflow handling
- Scrollbar styling for consistent appearance

## Data Models

No new data models required. The component continues to use:
- `SPU` - SPU information
- `SKU` - SKU entries with color, spec, combo properties
- Filter states for version, configuration, color

## Correctness Properties

A property is a characteristic or behavior that should hold true across all valid executions of a system—essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.

### Property 1: SPU Header Remains Fixed During Scroll

**For any** SKU Manager instance with scrollable content, when the user scrolls the scrollable region, the SPU ID header section should remain at the top of the viewport and not scroll away.

**Validates: Requirements 1.1, 1.2, 1.3**

### Property 2: Selectors and Table Scroll Together

**For any** SKU Manager instance, when the user scrolls the scrollable region, the version/configuration/color selectors and SKU table should move together as a single scrollable unit.

**Validates: Requirements 2.1, 2.2, 2.3**

### Property 3: Action Buttons Remain in Scrollable Region

**For any** SKU Manager instance with scrollable content, the action buttons should be positioned at the bottom of the scrollable container and should scroll with the content, remaining fully visible within the scrollable region.

**Validates: Requirements 3.1, 3.2, 3.3, 3.4, 3.5**

### Property 4: Layout Uses Proper Flexbox Properties

**For any** SKU Manager instance, the component structure should use flexbox with SPU header having `flexShrink: 0`, scrollable region having `flex: 1` and `minHeight: 0`, ensuring proper space distribution and scrolling behavior.

**Validates: Requirements 4.1, 4.2, 4.3, 4.4**

## Error Handling

- If SPU data is missing, display appropriate error message in fixed header
- If table content is empty, scrollable region should still be properly sized
- Scrollbar should appear/disappear based on content height

## Testing Strategy

### Unit Tests

- Verify SPU header is rendered with correct styling (flexShrink: 0)
- Verify scrollable container has correct flex properties (flex: 1, minHeight: 0)
- Verify action buttons are positioned at the bottom of scrollable content
- Verify scrollbar appears when content exceeds container height
- Verify scrollbar styling is applied correctly

### Property-Based Tests

- **Property 1**: Verify SPU header position remains fixed when scrolling
- **Property 2**: Verify selectors and table scroll together as one unit
- **Property 3**: Verify action buttons remain visible and scroll with content
- **Property 4**: Verify flexbox layout properties are correctly applied

### Integration Tests

- Test scrolling behavior with various content sizes
- Test responsive behavior on different screen sizes
- Test interaction with selectors while scrolling
- Test action button functionality after scrolling

