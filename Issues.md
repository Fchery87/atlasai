# BoltForge Project Issues

## Critical Issues

### 1. ✅ Missing Redo Functionality - FIXED

**Location**: [`App.tsx`](src/App.tsx:236-243)
**Issue**: The redo button exists but has an empty onClick handler
**Fix**: Connected the redo button to the `redoLastApply` method and added keyboard shortcut (Ctrl+Shift+Z)
**Impact**: Users can now redo actions after undoing them

### 2. ✅ Undo/Redo Stack Bug - FIXED

**Location**: [`projectStore.ts`](src/lib/store/projectStore.ts:271)
**Issue**: Inconsistent state references in undo/redo implementation
**Fix**: Updated both `undoLastApply` and `redoLastApply` to use cached `state` variable instead of multiple `get()` calls
**Impact**: Eliminated potential race conditions and unexpected behavior

### 3. ✅ Incomplete E2E Testing - FIXED

**Location**: [`prompt-diff-apply-preview.spec.ts`](e2e/prompt-diff-apply-preview.spec.ts:37)
**Issue**: Test manually injects output rather than testing actual streaming response
**Fix**:

- Enhanced GPT-5 placeholder provider to stream realistic responses
- Updated test to wait for streaming completion and verify actual streamed content
  **Impact**: Now properly tests the core AI streaming functionality

## Missing Features

### 4. Token/Cost Estimation

**PRD Reference**: Section 6.1
**Issue**: Token/cost estimation in chat header is not implemented
**Impact**: Users cannot track LLM usage costs

### 5. LLM Relay Implementation

**PRD Reference**: Section 10.3
**Issue**: Optional LLM relay for secure API key proxy is missing
**Impact**: Users must expose API keys directly in the browser

### 6. Full Shadcn Component Integration

**PRD Reference**: Section 9
**Issue**: Only basic Shadcn components implemented, missing:

- Full Tabs implementation
- Dialog/Sheet components
- Form components with validation
- Advanced patterns
  **Impact**: Inconsistent UI and missing functionality

### 7. Performance Optimizations

**PRD Reference**: Section 7 (Performance)
**Issues**:

- Monaco editor loaded eagerly instead of lazily
- No debouncing for preview updates on file changes
- Missing optimizations for large projects
  **Impact**: Slower load times and poor performance with large codebases

## Accessibility Gaps

### 8. Missing Accessibility Features

**PRD Reference**: Section 7 (Accessibility)
**Issues**:

- No focus management in modals
- Incomplete keyboard navigation for all interactive elements
- Missing screen reader announcements for dynamic content
  **Impact**: Poor experience for users with disabilities

## Testing Gaps

### 9. Missing Provider Contract Tests

**Task Reference**: Section 13 (TDD Strategy)
**Issue**: Contract tests for ProviderAdapter compliance are missing
**Impact**: Inconsistent behavior between different LLM providers

### 10. Incomplete Test Coverage

**Issues**:

- Limited E2E scenarios for core workflows
- Missing integration tests for Git/deploy flows
- No accessibility automated tests
  **Impact**: Higher risk of regressions

## Phase 4 Features Not Implemented

### 11. PWA/Electron Features

**PRD Reference**: Section 14 (Phase 4)
**Issues**:

- No offline caching/PWA implementation
- No Electron packaging for desktop distribution
  **Impact**: Limited deployment options

## Recommendations

### Immediate Fixes (High Priority)

1. Implement redo functionality by connecting existing `redoLastApply` method
2. Fix undo/redo stack management to use consistent state references
3. Add token/cost estimation to chat interface
4. Complete E2E test for full prompt-to-preview flow with actual streaming

### Medium Priority

1. Implement lazy loading for Monaco editor
2. Add debouncing for preview updates
3. Expand Shadcn component usage for better consistency
4. Implement LLM relay for secure API key usage
5. Add focus management and keyboard navigation
6. Implement ProviderAdapter contract tests

### Lower Priority

1. Add PWA capabilities for offline usage
2. Implement Electron packaging for desktop distribution
3. Expand template catalog with more project types
4. Add comprehensive accessibility automated tests

## Architecture Strengths

Despite these issues, the project has several strengths:

- Solid provider abstraction with extensible LLM registry
- Good separation of concerns with feature-based organization
- Comprehensive type safety with TypeScript and Zod validation
- Encrypted client-side storage for API keys
- Well-structured diff approval workflow

## Conclusion

The project is functional and meets most core requirements from the PRD, but needs polish in several areas to be production-ready. The core architecture is sound, but implementation gaps and missing features should be addressed to fully realize the vision outlined in the PRD.
