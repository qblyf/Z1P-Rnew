# Requirements Document: SKU Management Buttons Visibility

## Introduction

When managing SKUs in the product management system, users encounter a usability issue where the "Add" (+ 新增) and "Confirm Changes" (确认修改) buttons become hidden when there are many SKUs in the list. This occurs because the table grows beyond the viewport without proper scrolling constraints, pushing the action buttons out of view.

## Glossary

- **SKU Manager**: The component responsible for managing Stock Keeping Units (SKUs) for a given SPU (Stock Keeping Product)
- **SKU Table**: The table displaying all SKUs with their properties (version, configuration, color)
- **Action Buttons**: The "Add" and "Confirm Changes" buttons located in the table footer
- **Scrollable Container**: The container that should scroll when content exceeds viewport height
- **Viewport**: The visible area of the browser window

## Requirements

### Requirement 1: Action Buttons Always Visible

**User Story:** As a product manager, I want the "Add" and "Confirm Changes" buttons to always be visible and accessible, so that I can manage SKUs efficiently regardless of how many SKUs exist.

#### Acceptance Criteria

1. WHEN the SKU list contains many items that exceed the viewport height, THE SKUManager component SHALL display a scrollable table area while keeping the action buttons visible at the bottom
2. WHEN a user scrolls through the SKU table, THE action buttons SHALL remain fixed at the bottom of the component and not scroll out of view
3. WHEN the SKU table is scrolled to any position, THE "Add" and "Confirm Changes" buttons SHALL be clickable and functional
4. WHEN the component is rendered with any number of SKUs (0 to 1000+), THE layout SHALL maintain proper spacing and alignment without overflow

### Requirement 2: Scrollable Table Area

**User Story:** As a product manager, I want to scroll through the SKU list without losing access to the action buttons, so that I can view all SKUs and still perform actions.

#### Acceptance Criteria

1. WHEN the SKU table content exceeds the available vertical space, THE table area SHALL become scrollable with a visible scrollbar
2. WHEN scrolling the table, THE table header SHALL remain visible (sticky) at the top of the scrollable area
3. WHEN the table is scrolled, THE footer with action buttons SHALL remain fixed and not scroll with the table content

### Requirement 3: Layout Integrity

**User Story:** As a product manager, I want the SKU management interface to maintain proper layout structure, so that all components are properly aligned and accessible.

#### Acceptance Criteria

1. WHEN the SKUManager component is rendered, THE component SHALL use a flexible layout that adapts to different screen sizes
2. WHEN the viewport height changes, THE scrollable area SHALL adjust dynamically to accommodate the available space
3. WHEN the component is displayed, THE spacing between the SPU info, filter controls, table, and action buttons SHALL be consistent and visually balanced
