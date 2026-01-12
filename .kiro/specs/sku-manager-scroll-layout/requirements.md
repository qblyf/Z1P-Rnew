# Requirements Document: SKU Manager Scroll Layout

## Introduction

The SKU Manager component needs to be reorganized to implement a fixed/scrollable layout pattern. The SPU ID information should remain fixed at the top and not scroll, while the version/configuration/color selectors and SKU table should be in a scrollable area, with action buttons fixed at the bottom of the scrollable region and always visible.

## Glossary

- **SPU ID Information**: The header section displaying "SPU ID: {id}, 名称: {name}"
- **Selector Area**: The form section containing version (版本), configuration (配置), and color (颜色) selectors
- **SKU Table**: The data table displaying all SKU entries with their properties
- **Action Buttons**: The footer buttons including "+ 新增" (Add New) and "确认修改" (Confirm Changes)
- **Scrollable Region**: The area that scrolls when content exceeds viewport height
- **Fixed Region**: The area that remains visible and does not scroll

## Requirements

### Requirement 1: Fixed SPU ID Header

**User Story:** As a user, I want the SPU ID information to remain visible at the top of the screen, so that I always know which SPU I'm working with.

#### Acceptance Criteria

1. WHEN the SKU Manager component is displayed, THE SPU ID information section SHALL remain fixed at the top
2. WHEN the user scrolls through the selector area and SKU table, THE SPU ID information SHALL NOT scroll with the content
3. THE SPU ID information SHALL be positioned outside the scrollable region

### Requirement 2: Scrollable Selector and Table Area

**User Story:** As a user, I want the version, configuration, and color selectors along with the SKU table to scroll together, so that I can manage large lists of SKUs.

#### Acceptance Criteria

1. WHEN the content height exceeds the available viewport, THE selector area and SKU table SHALL be scrollable
2. WHEN the user scrolls, THE version, configuration, and color selectors SHALL scroll together with the SKU table
3. THE scrollable region SHALL have proper scrollbar styling and behavior

### Requirement 3: Action Buttons in Scrollable Region

**User Story:** As a user, I want the action buttons to scroll with the table content, so that I can access them by scrolling to the bottom of the scrollable area.

#### Acceptance Criteria

1. WHEN the SKU Manager is displayed, THE action buttons (+ 新增 and 确认修改) SHALL be positioned at the bottom of the scrollable region
2. WHEN the user scrolls the table content, THE action buttons SHALL scroll together with the table and selectors
3. THE scrollable region SHALL have sufficient height and padding to ensure action buttons are fully visible and not cut off
4. THE action buttons SHALL be part of the scrollable content, not fixed to the viewport
5. THE action buttons SHALL have proper spacing and styling to distinguish them from the table content

### Requirement 4: Layout Structure

**User Story:** As a developer, I want a clear layout structure with proper flex containers, so that the component is maintainable and responsive.

#### Acceptance Criteria

1. THE component SHALL use flexbox layout with proper flex properties
2. THE SPU ID section SHALL have `flexShrink: 0` to prevent shrinking
3. THE scrollable region SHALL have `flex: 1` and `minHeight: 0` to enable proper scrolling
4. THE action buttons SHALL be positioned using CSS to remain fixed within the scrollable container

