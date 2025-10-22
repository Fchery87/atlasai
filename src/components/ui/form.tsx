import * as React from "react";
import { cn } from "../../lib/utils";

interface FormFieldContextValue {
  name: string;
  value: any;
  onChange: (value: any) => void; // eslint-disable-line no-unused-vars
  onBlur: () => void;
  error?: string;
  touched: boolean;
  disabled?: boolean;
}

const FormFieldContext = React.createContext<FormFieldContextValue | undefined>(
  undefined,
);

function useFormField() {
  const context = React.useContext(FormFieldContext);
  if (!context) {
    throw new Error("FormField components must be used within a Form provider");
  }
  return context;
}

interface FormContextValue<T = any> {
  values: T;
  errors: Partial<Record<keyof T, string>>;
  touched: Partial<Record<keyof T, boolean>>;
  isSubmitting: boolean;
  isValid: boolean;
  dirty: boolean;
  setFieldValue: (name: keyof T, value: any) => void; // eslint-disable-line no-unused-vars
  setFieldTouched: (name: keyof T, touched?: boolean) => void; // eslint-disable-line no-unused-vars
  setFieldError: (name: keyof T, error?: string) => void; // eslint-disable-line no-unused-vars
  handleSubmit: (
    _onSubmit: (_values: T) => void | Promise<void>,
  ) => (_e?: React.FormEvent) => void;  
  handleReset: () => void;
}

const FormContext = React.createContext<FormContextValue | undefined>(
  undefined,
);

function useFormContext<T = any>() {
  const context = React.useContext(FormContext) as
    | FormContextValue<T>
    | undefined;
  if (!context) {
    throw new Error("Form components must be used within a Form provider");
  }
  return context;
}

interface FormProps<T = any> {
  initialValues: T;
  onSubmit?: (values: T) => void | Promise<void>; // eslint-disable-line no-unused-vars
  validate?: (values: T) => Partial<Record<keyof T, string>>; // eslint-disable-line no-unused-vars
  children: React.ReactNode;
  className?: string;
}

export function Form<T extends Record<string, any>>({
  initialValues,
  onSubmit: _onSubmit,
  validate,
  children,
  className,
}: FormProps<T>) {
  const [values, setValues] = React.useState<T>(initialValues);
  const [errors, setErrors] = React.useState<Partial<Record<keyof T, string>>>(
    {},
  );
  const [touched, setTouched] = React.useState<
    Partial<Record<keyof T, boolean>>
  >({});
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  const setFieldValue = React.useCallback(
    (name: keyof T, value: any) => {
      setValues((prev) => ({ ...prev, [name]: value }));
      setTouched((prev) => ({ ...prev, [name]: true }));

      if (validate) {
        const newErrors = validate({ ...values, [name]: value });
        setErrors((prev) => ({ ...prev, [name]: newErrors[name] }));
      }
    },
    [values, validate],
  );

  const setFieldTouched = React.useCallback(
    (name: keyof T, isTouched = true) => {
      setTouched((prev) => ({ ...prev, [name]: isTouched }));
    },
    [],
  );

  const setFieldError = React.useCallback((name: keyof T, error?: string) => {
    setErrors((prev) => ({ ...prev, [name]: error }));
  }, []);

  const validateForm = React.useCallback(
    (formValues: T) => {
      if (validate) {
        return validate(formValues);
      }
      return {};
    },
    [validate],
  );

  const isValid = React.useMemo(() => {
    const formErrors = validateForm(values);
    return (
      Object.keys(formErrors).length === 0 &&
      Object.keys(errors).every((key) => !errors[key as keyof T])
    );
  }, [values, errors, validateForm]);

  const dirty = React.useMemo(() => {
    return Object.keys(touched).some((key) => touched[key as keyof T]);
  }, [touched]);

  const handleSubmit = React.useCallback(
    (onSubmitHandler: (_values: T) => void | Promise<void>) =>
      async (e?: React.FormEvent) => {
        if (e) {
          e.preventDefault();
        }

        const formErrors = validateForm(values);
        setErrors(formErrors);

        if (Object.keys(formErrors).length === 0) {
          setIsSubmitting(true);
          try {
            await onSubmitHandler(values);
          } finally {
            setIsSubmitting(false);
          }
        }
      },
    [values, validateForm],
  );

  const handleReset = React.useCallback(() => {
    setValues(initialValues);
    setErrors({});
    setTouched({});
    setIsSubmitting(false);
  }, [initialValues]);

  const contextValue = React.useMemo<FormContextValue<T>>(
    () => ({
      values,
      errors,
      touched,
      isSubmitting,
      isValid,
      dirty,
      setFieldValue,
      setFieldTouched,
      setFieldError,
      handleSubmit,
      handleReset,
    }),
    [
      values,
      errors,
      touched,
      isSubmitting,
      isValid,
      dirty,
      setFieldValue,
      setFieldTouched,
      setFieldError,
      handleSubmit,
      handleReset,
    ],
  );

  return (
    <FormContext.Provider value={contextValue}>
      <form className={cn("space-y-4", className)}>{children}</form>
    </FormContext.Provider>
  );
}

interface FormFieldProps<T = any> {
  name: keyof T;
  children: (field: FormFieldContextValue) => React.ReactNode; // eslint-disable-line no-unused-vars
}

export function FormField<T = any>({ name, children }: FormFieldProps<T>) {
  const {
    values,
    errors,
    touched,
    setFieldValue,
    setFieldTouched,
    isSubmitting,
  } = useFormContext<T>();

  const fieldContext = React.useMemo<FormFieldContextValue>(
    () => ({
      name: String(name),
      value: values[name],
      onChange: (value: any) => setFieldValue(name, value),
      onBlur: () => setFieldTouched(name, true),
      error: touched[name] ? errors[name] : undefined,
      touched: touched[name] || false,
      disabled: isSubmitting,
    }),
    [
      name,
      values,
      errors,
      touched,
      isSubmitting,
      setFieldValue,
      setFieldTouched,
    ],
  );

  return (
    <FormFieldContext.Provider value={fieldContext}>
      {children(fieldContext)}
    </FormFieldContext.Provider>
  );
}

export function FormItem({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("space-y-2", className)} {...props} />;
}

export function FormLabel({
  className,
  ...props
}: React.LabelHTMLAttributes<HTMLLabelElement>) {
  return (
    <label
      className={cn(
        "text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70",
        className,
      )}
      {...props}
    />
  );
}

export function FormControl({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  const { error, disabled } = useFormField();

  return (
    <div
      className={cn(
        "h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50",
        error && "border-destructive",
        className,
      )}
      aria-invalid={!!error}
      aria-disabled={disabled}
      {...props}
    />
  );
}

export function FormDescription({
  className,
  ...props
}: React.HTMLAttributes<HTMLParagraphElement>) {
  return (
    <p className={cn("text-sm text-muted-foreground", className)} {...props} />
  );
}

export function FormMessage({
  className,
  ...props
}: React.HTMLAttributes<HTMLParagraphElement>) {
  const { error } = useFormField();

  if (!error) return null;

  return (
    <p
      className={cn("text-sm font-medium text-destructive", className)}
      {...props}
    >
      {error}
    </p>
  );
}

export function FormSubmit({
  className,
  children,
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement>) {
  const { isSubmitting, isValid, dirty } = useFormContext();

  return (
    <button
      type="submit"
      className={cn(
        "inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:opacity-50 disabled:pointer-events-none bg-primary text-primary-foreground hover:bg-primary/90 h-9 px-4 py-2",
        className,
      )}
      disabled={isSubmitting || !isValid || !dirty}
      {...props}
    >
      {isSubmitting ? "Submitting..." : children}
    </button>
  );
}

export function FormReset({
  className,
  children,
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement>) {
  const { isSubmitting, handleReset } = useFormContext();

  return (
    <button
      type="button"
      className={cn(
        "inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:opacity-50 disabled:pointer-events-none border border-input bg-background hover:bg-accent hover:text-accent-foreground h-9 px-4 py-2",
        className,
      )}
      disabled={isSubmitting}
      onClick={handleReset}
      {...props}
    >
      {children}
    </button>
  );
}
