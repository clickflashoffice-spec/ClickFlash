# Photo Editor API Documentation

## Hooks

### `useHistory<T>(initialState: T, capacity: number = 50)`

A state management hook with built-in undo/redo capabilities.

- **Parameters**:
  - `initialState`: The starting value.
  - `capacity`: Maximum number of history states to retain.
- **Returns**: `[state, setState, undo, redo, canUndo, canRedo, reset]`
- **Usage**:

  ```typescript
  const [filters, setFilters, undo, redo, canUndo, canRedo] = useHistory(defaultFilterState);
  ```

### `useDebounce<T>(value: T, delay: number)`

Debounces a rapidly changing value to optimize performance.

- **Usage**:

  ```typescript
  const debouncedFilters = useDebounce(localFilters, 16);
  ```

## Component Architecture

The editor is composed of several high-performance layers:

1. **`EnhancedEditor`**: Root container managing state, history, and export.
2. **`ImageViewer`**: Handles high-resolution image rendering and retouch interactions.
3. **`InteractiveViewport`**: Provides performant zoom/pan using CSS transforms.
4. **`LayerManager`**: Orchestrates overlays (Retouch, Crop, Drawing).
5. **`EditorSidebar`**: Modular tools panel with debounced controls and tabbed interface.

## Styling standards

- **CSS Modules**: All styles must reside in `.module.css` files.
- **Dynamic Values**: Use CSS Variables (`--var-name`) passed via `style` attribute for high-frequency updates (cursor, transforms).
- **Prefixes**: `-webkit-appearance` should be balanced with modern `appearance` for cross-platform support.
