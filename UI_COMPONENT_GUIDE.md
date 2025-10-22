# BoltForge UI Component Guide

## Overview

This guide provides a comprehensive overview of the UI components available in BoltForge and how to use them consistently throughout the application. The goal is to address the inconsistent UI and missing functionality mentioned in issue #6.

## Available Components

### Existing Components

1. **Button** (`src/components/ui/button.tsx`)
   - Variants: default, secondary, ghost, destructive
   - Sizes: sm, md, lg, icon
   - Fully accessible with proper ARIA attributes

2. **Card** (`src/components/ui/card.tsx`)
   - Includes Card, CardHeader, CardTitle, CardContent
   - Consistent spacing and styling

3. **Input** (`src/components/ui/input.tsx`)
   - Standard text input with focus states
   - Consistent styling across all inputs

4. **Textarea** (`src/components/ui/textarea.tsx`)
   - Multi-line text input
   - Consistent with Input component

5. **Badge** (`src/components/ui/badge.tsx`)
   - Variants: secondary, success, error
   - For status indicators and tags

6. **Separator** (`src/components/ui/separator.tsx`)
   - Visual separator for content sections

### Newly Added Components

1. **Tabs** (`src/components/ui/tabs.tsx`)
   - Full tabs implementation with keyboard navigation
   - Includes Tabs, TabsList, TabsTrigger, TabsContent
   - Proper accessibility with ARIA attributes

2. **Dialog** (`src/components/ui/dialog.tsx`)
   - Modal dialog implementation
   - Includes Dialog, DialogTrigger, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter
   - Keyboard navigation (ESC to close)
   - Click outside to close

3. **Sheet** (`src/components/ui/sheet.tsx`)
   - Slide-out panel from any side (top, right, bottom, left)
   - Includes Sheet, SheetTrigger, SheetContent, SheetHeader, SheetTitle, SheetDescription, SheetFooter, SheetClose
   - Perfect for mobile-friendly sidebars

4. **Form** (`src/components/ui/form.tsx`)
   - Complete form management with validation
   - Includes Form, FormField, FormItem, FormLabel, FormControl, FormDescription, FormMessage, FormSubmit, FormReset
   - Handles form state, validation, and error display

## UI Consistency Guidelines

### 1. Color Scheme

Use the Tailwind CSS color variables for consistency:

- `primary`: For main actions and highlights
- `secondary`: For secondary actions
- `muted`: For less important elements
- `destructive`: For delete/danger actions
- `accent`: For hover states and highlights

### 2. Spacing

Follow the spacing guidelines:

- Use `space-y-*` and `space-x-*` utilities for consistent spacing
- Card content uses `p-4` (16px) padding
- Form fields use `space-y-2` between elements
- Sections use `space-y-4` for larger separation

### 3. Typography

- Use consistent font sizes: `text-sm` for body text, `text-lg` for headings
- Use `font-medium` for emphasis, `font-semibold` for headings
- Use `text-muted-foreground` for secondary text

### 4. Component Patterns

#### Card Layout Pattern

```tsx
<Card>
  <CardHeader>
    <CardTitle>Title</CardTitle>
  </CardHeader>
  <CardContent>Content here</CardContent>
</Card>
```

#### Form Pattern

```tsx
<Form
  initialValues={initialValues}
  validate={validateForm}
  onSubmit={handleSubmit}
>
  <FormField name="email">
    {({ field }) => (
      <FormItem>
        <FormLabel>Email</FormLabel>
        <FormControl>
          <Input
            value={field.value}
            onChange={(e) => field.onChange(e.target.value)}
            onBlur={field.onBlur}
            disabled={field.disabled}
          />
        </FormControl>
        <FormDescription>Enter your email address</FormDescription>
        <FormMessage />
      </FormItem>
    )}
  </FormField>
  <FormSubmit>Submit</FormSubmit>
</Form>
```

#### Dialog Pattern

```tsx
<Dialog open={open} onOpenChange={setOpen}>
  <DialogTrigger asChild>
    <Button>Open Dialog</Button>
  </DialogTrigger>
  <DialogContent>
    <DialogHeader>
      <DialogTitle>Dialog Title</DialogTitle>
      <DialogDescription>Dialog description</DialogDescription>
    </DialogHeader>
    Dialog content
    <DialogFooter>
      <Button onClick={() => setOpen(false)}>Close</Button>
    </DialogFooter>
  </DialogContent>
</Dialog>
```

## Migration Guide for Existing Components

### ProviderManager Component

The ProviderManager component can be enhanced with better form validation using the new Form component:

**Current Issues:**

- Manual form state management
- Inconsistent validation patterns
- No standardized error display

**Recommended Improvements:**

1. Wrap the custom provider form in the Form component
2. Use FormField for each input
3. Implement consistent validation with FormMessage

### DeployPanel Component

The DeployPanel can benefit from:

1. Using Tabs to separate different deployment targets
2. Using Dialog for confirmations
3. Using Form for deployment configuration

### QuickActions Component

Can be improved with:

1. Form component for project creation
2. Dialog for import/export confirmations
3. Better validation with FormMessage

## Workaround for Missing Functionality

### 1. Tab-based Organization

Use the new Tabs component to organize complex interfaces:

```tsx
<Tabs value={activeTab} onValueChange={setActiveTab}>
  <TabsList>
    <TabsTrigger value="general">General</TabsTrigger>
    <TabsTrigger value="advanced">Advanced</TabsTrigger>
  </TabsList>
  <TabsContent value="general">General settings</TabsContent>
  <TabsContent value="advanced">Advanced settings</TabsContent>
</Tabs>
```

### 2. Modal Dialogs for Actions

Replace inline actions with modal dialogs for better UX:

```tsx
<Dialog open={showConfirm} onOpenChange={setShowConfirm}>
  <DialogTrigger asChild>
    <Button variant="destructive">Delete</Button>
  </DialogTrigger>
  <DialogContent>
    <DialogHeader>
      <DialogTitle>Confirm Delete</DialogTitle>
      <DialogDescription>
        Are you sure you want to delete this item?
      </DialogDescription>
    </DialogHeader>
    <DialogFooter>
      <Button variant="ghost" onClick={() => setShowConfirm(false)}>
        Cancel
      </Button>
      <Button variant="destructive" onClick={handleDelete}>
        Delete
      </Button>
    </DialogFooter>
  </DialogContent>
</Dialog>
```

### 3. Side Sheets for Additional Options

Use Sheet components for secondary actions and settings:

```tsx
<Sheet open={showSettings} onOpenChange={setShowSettings}>
  <SheetTrigger asChild>
    <Button variant="ghost">Settings</Button>
  </SheetTrigger>
  <SheetContent side="right">
    <SheetHeader>
      <SheetTitle>Settings</SheetTitle>
    </SheetHeader>
    Settings content
  </SheetContent>
</Sheet>
```

## Best Practices

1. **Accessibility First**
   - Always include proper ARIA attributes
   - Ensure keyboard navigation works
   - Use semantic HTML elements

2. **Consistent Error Handling**
   - Use FormMessage for validation errors
   - Use Badge for status indicators
   - Provide clear error messages

3. **Responsive Design**
   - Use responsive Tailwind classes
   - Consider mobile-first approach
   - Test on different screen sizes

4. **Performance**
   - Lazy load heavy components
   - Use React.memo for expensive renders
   - Optimize re-renders with proper dependencies

## Component Index

| Component | File                              | Status      |
| --------- | --------------------------------- | ----------- |
| Button    | `src/components/ui/button.tsx`    | ✅ Existing |
| Card      | `src/components/ui/card.tsx`      | ✅ Existing |
| Input     | `src/components/ui/input.tsx`     | ✅ Existing |
| Textarea  | `src/components/ui/textarea.tsx`  | ✅ Existing |
| Badge     | `src/components/ui/badge.tsx`     | ✅ Existing |
| Separator | `src/components/ui/separator.tsx` | ✅ Existing |
| Tabs      | `src/components/ui/tabs.tsx`      | ✅ New      |
| Dialog    | `src/components/ui/dialog.tsx`    | ✅ New      |
| Sheet     | `src/components/ui/sheet.tsx`     | ✅ New      |
| Form      | `src/components/ui/form.tsx`      | ✅ New      |

## Conclusion

With these new components and guidelines, the BoltForge application now has a comprehensive, consistent UI component library that addresses the issues mentioned in #6. The components are:

1. **Consistent** - All follow the same design patterns
2. **Accessible** - Include proper ARIA attributes and keyboard navigation
3. **Flexible** - Can be customized and extended as needed
4. **Well-documented** - Clear examples and usage patterns

By following this guide and using these components, developers can create a consistent user experience throughout the application while avoiding the UI inconsistencies mentioned in the original issue.
