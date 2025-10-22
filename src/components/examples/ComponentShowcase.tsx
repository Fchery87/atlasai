import * as React from "react";
import { Button } from "../ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "../ui/card";
import { Input } from "../ui/input";
import { Textarea } from "../ui/textarea";
import { Badge } from "../ui/badge";
import { Separator } from "../ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "../ui/dialog";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "../ui/sheet";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  FormSubmit,
} from "../ui/form";

export function ComponentShowcase() {
  const [activeTab, setActiveTab] = React.useState("forms");
  const [dialogOpen, setDialogOpen] = React.useState(false);
  const [sheetOpen, setSheetOpen] = React.useState(false);
  const [formData, setFormData] = React.useState({
    name: "",
    email: "",
    message: "",
  });

  const validateForm = (values: typeof formData) => {
    const errors: Partial<Record<keyof typeof formData, string>> = {};
    if (!values.name) errors.name = "Name is required";
    if (!values.email) errors.email = "Email is required";
    if (!values.message) errors.message = "Message is required";
    return errors;
  };

  const handleSubmit = (values: typeof formData) => {
    console.log("Form submitted:", values);
    setDialogOpen(false);
  };

  return (
    <div className="space-y-6 p-6">
      <div className="space-y-2">
        <h1 className="text-2xl font-bold">UI Component Showcase</h1>
        <p className="text-muted-foreground">
          Demonstrating consistent UI patterns with the new component library
        </p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="forms">Forms</TabsTrigger>
          <TabsTrigger value="dialogs">Dialogs & Sheets</TabsTrigger>
          <TabsTrigger value="cards">Cards & Layout</TabsTrigger>
        </TabsList>

        <TabsContent value="forms" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Form Validation Example</CardTitle>
            </CardHeader>
            <CardContent>
              <Form
                initialValues={formData}
                validate={validateForm}
                onSubmit={handleSubmit}
              >
                <FormField name="name">
                  {(field) => (
                    <FormItem>
                      <FormLabel>Name</FormLabel>
                      <FormControl>
                        <Input
                          value={field.value}
                          onChange={(e) => field.onChange(e.target.value)}
                          onBlur={field.onBlur}
                          disabled={field.disabled}
                          placeholder="Enter your name"
                        />
                      </FormControl>
                      <FormDescription>Enter your full name</FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                </FormField>

                <FormField name="email">
                  {(field) => (
                    <FormItem>
                      <FormLabel>Email</FormLabel>
                      <FormControl>
                        <Input
                          type="email"
                          value={field.value}
                          onChange={(e) => field.onChange(e.target.value)}
                          onBlur={field.onBlur}
                          disabled={field.disabled}
                          placeholder="Enter your email"
                        />
                      </FormControl>
                      <FormDescription>
                        We'll never share your email
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                </FormField>

                <FormField name="message">
                  {(field) => (
                    <FormItem>
                      <FormLabel>Message</FormLabel>
                      <FormControl>
                        <Textarea
                          value={field.value}
                          onChange={(e) => field.onChange(e.target.value)}
                          onBlur={field.onBlur}
                          disabled={field.disabled}
                          placeholder="Enter your message"
                          rows={4}
                        />
                      </FormControl>
                      <FormDescription>Tell us what you think</FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                </FormField>

                <div className="flex gap-2">
                  <FormSubmit>Submit Form</FormSubmit>
                  <Button
                    type="button"
                    variant="ghost"
                    onClick={() =>
                      setFormData({ name: "", email: "", message: "" })
                    }
                  >
                    Reset
                  </Button>
                </div>
              </Form>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="dialogs" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card>
              <CardHeader>
                <CardTitle>Dialog Example</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-sm text-muted-foreground">
                  Dialogs are perfect for confirmations and important actions
                  that require user attention.
                </p>
                <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
                  <DialogTrigger asChild>
                    <Button>Open Dialog</Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Confirm Action</DialogTitle>
                      <DialogDescription>
                        This is an example dialog with proper accessibility and
                        keyboard navigation. Press ESC or click outside to
                        close.
                      </DialogDescription>
                    </DialogHeader>
                    <div className="py-4">
                      <p className="text-sm">
                        Dialogs can contain any content, including forms,
                        confirmations, or important information.
                      </p>
                    </div>
                    <DialogFooter>
                      <Button
                        variant="ghost"
                        onClick={() => setDialogOpen(false)}
                      >
                        Cancel
                      </Button>
                      <Button onClick={() => setDialogOpen(false)}>
                        Confirm
                      </Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Sheet Example</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-sm text-muted-foreground">
                  Sheets are ideal for side panels, additional options, and
                  mobile-friendly navigation.
                </p>
                <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
                  <SheetTrigger asChild>
                    <Button>Open Sheet</Button>
                  </SheetTrigger>
                  <SheetContent>
                    <SheetHeader>
                      <SheetTitle>Side Panel</SheetTitle>
                      <SheetDescription>
                        This sheet slides in from the right side of the screen.
                      </SheetDescription>
                    </SheetHeader>
                    <div className="py-6 space-y-4">
                      <div className="space-y-2">
                        <h4 className="font-medium">Settings</h4>
                        <div className="space-y-2">
                          <label className="flex items-center space-x-2">
                            <input type="checkbox" className="rounded" />
                            <span className="text-sm">
                              Enable notifications
                            </span>
                          </label>
                          <label className="flex items-center space-x-2">
                            <input type="checkbox" className="rounded" />
                            <span className="text-sm">Dark mode</span>
                          </label>
                          <label className="flex items-center space-x-2">
                            <input type="checkbox" className="rounded" />
                            <span className="text-sm">Auto-save</span>
                          </label>
                        </div>
                      </div>
                      <Separator />
                      <div className="space-y-2">
                        <h4 className="font-medium">Actions</h4>
                        <div className="space-y-2">
                          <Button
                            variant="ghost"
                            className="w-full justify-start"
                          >
                            Export data
                          </Button>
                          <Button
                            variant="ghost"
                            className="w-full justify-start"
                          >
                            Import settings
                          </Button>
                          <Button
                            variant="ghost"
                            className="w-full justify-start"
                          >
                            Reset to defaults
                          </Button>
                        </div>
                      </div>
                    </div>
                  </SheetContent>
                </Sheet>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="cards" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  Feature One
                  <Badge variant="success">Active</Badge>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground mb-4">
                  This card demonstrates consistent styling with badges and
                  proper spacing.
                </p>
                <Button className="w-full">Learn More</Button>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  Feature Two
                  <Badge variant="secondary">Beta</Badge>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground mb-4">
                  Cards can contain any content and maintain consistent visual
                  hierarchy.
                </p>
                <div className="flex gap-2">
                  <Button variant="secondary" className="flex-1">
                    Preview
                  </Button>
                  <Button className="flex-1">Enable</Button>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  Feature Three
                  <Badge variant="error">Disabled</Badge>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground mb-4">
                  Status badges provide clear visual indicators for component
                  states.
                </p>
                <Button disabled className="w-full">
                  Coming Soon
                </Button>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Consistent Layout Example</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-muted-foreground">
                This demonstrates how to create consistent layouts using the
                component system.
              </p>
              <Separator />
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="text-center space-y-2">
                  <div className="text-2xl font-bold">100%</div>
                  <div className="text-sm text-muted-foreground">
                    Consistent
                  </div>
                </div>
                <div className="text-center space-y-2">
                  <div className="text-2xl font-bold">50+</div>
                  <div className="text-sm text-muted-foreground">
                    Components
                  </div>
                </div>
                <div className="text-center space-y-2">
                  <div className="text-2xl font-bold">A+</div>
                  <div className="text-sm text-muted-foreground">
                    Accessibility
                  </div>
                </div>
              </div>
              <Separator />
              <div className="flex justify-between items-center">
                <p className="text-sm text-muted-foreground">
                  All components follow the same design patterns
                </p>
                <Button variant="ghost">View Documentation</Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
