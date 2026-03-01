"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import * as React from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { dbTypeOptions, dbTypes } from "@/lib/db-types";

const formSchema = z.object({
  name: z.string().min(1, "Connection name is required"),
  dbType: z.enum(dbTypes),
  host: z.string().min(1, "Host is required"),
  port: z.string().regex(/^\d+$/, "Port must be a number"),
  database: z.string().min(1, "Database is required"),
  username: z.string().min(1, "Username is required"),
  password: z.string().min(1, "Password is required"),
  ssl: z.boolean(),
  readOnly: z.boolean(),
});

type FormValues = z.infer<typeof formSchema>;

type ConnectionFormProps = {
  defaultValues?: Partial<FormValues>;
  onSubmit: (values: FormValues) =>
    | undefined
    | Promise<
      | undefined
      | {
        ok: boolean;
        message?: string;
      }
    >;
  onTest?: (values: FormValues) => void;
};

export function ConnectionForm({
  defaultValues,
  onSubmit,
  onTest,
}: ConnectionFormProps) {
  const [testState, setTestState] = React.useState<
    "idle" | "testing" | "success" | "error"
  >("idle");
  const [testMessage, setTestMessage] = React.useState("");
  const [submitState, setSubmitState] = React.useState<
    "idle" | "saving" | "success" | "error"
  >("idle");
  const [submitMessage, setSubmitMessage] = React.useState("");

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: "",
      dbType: "postgres",
      host: "localhost",
      port: "5432",
      database: "",
      username: "",
      password: "",
      ssl: false,
      readOnly: false,
      ...defaultValues,
    },
  });

  const handleTest = React.useCallback(() => {
    form.handleSubmit(async (values) => {
      if (onTest) {
        onTest(values);
      }

      if (!window.electron?.testConnection) {
        setTestState("error");
        setTestMessage("Test connection is only available in the desktop app.");
        return;
      }

      setTestState("testing");
      setTestMessage("");

      const result = await window.electron.testConnection(values);

      if (result.ok) {
        setTestState("success");
        setTestMessage("Succeeded.");
      } else {
        setTestState("error");
        setTestMessage(result.message || "Failed.");
      }
    })();
  }, [form, onTest]);

  const handleSubmit = React.useCallback(
    async (values: FormValues) => {
      setSubmitState("saving");
      setSubmitMessage("");

      const result = await onSubmit(values);

      if (result && typeof result === "object" && "ok" in result) {
        if (result.ok) {
          setSubmitState("success");
          setSubmitMessage(result.message ?? "Connection saved.");
        } else {
          setSubmitState("error");
          setSubmitMessage(result.message ?? "Connection failed.");
        }
      } else {
        setSubmitState("idle");
      }
    },
    [onSubmit],
  );

  return (
    <Form {...form}>
      <form
        className="flex flex-1 flex-col gap-4"
        onSubmit={form.handleSubmit(handleSubmit)}
      >
        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Connection name</FormLabel>
              <FormControl>
                <Input placeholder="Production Postgres" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="dbType"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Database type</FormLabel>
              <Select onValueChange={field.onChange} value={field.value}>
                <FormControl>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Select a database" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {dbTypeOptions.map((option) => (
                    <SelectItem key={option.value} value={option.value} disabled={option.disabled}>
                      {option.label} {option.disabled && "(Unsupported)"}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="host"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Host</FormLabel>
              <FormControl>
                <Input placeholder="localhost" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <div className="grid grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="port"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Port</FormLabel>
                <FormControl>
                  <Input placeholder="5432" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="database"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Database</FormLabel>
                <FormControl>
                  <Input placeholder="postgres" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
        <FormField
          control={form.control}
          name="username"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Username</FormLabel>
              <FormControl>
                <Input placeholder="admin" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="password"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Password</FormLabel>
              <FormControl>
                <Input type="password" placeholder="••••••••" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="ssl"
          render={({ field }) => (
            <FormItem className="flex items-center gap-2">
              <FormControl>
                <Checkbox
                  checked={field.value}
                  onCheckedChange={field.onChange}
                />
              </FormControl>
              <FormLabel className="font-normal">Use SSL</FormLabel>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="readOnly"
          render={({ field }) => (
            <FormItem className="flex items-center gap-2">
              <FormControl>
                <Checkbox
                  checked={field.value}
                  onCheckedChange={field.onChange}
                />
              </FormControl>
              <FormLabel className="font-normal">Read-only mode</FormLabel>
              <FormMessage />
            </FormItem>
          )}
        />
        <div className="flex items-center justify-between gap-2">
          <div className="flex flex-col gap-1">
            <span
              className={
                testState === "error"
                  ? "text-destructive text-sm"
                  : testState === "success"
                    ? "text-emerald-600 text-sm"
                    : "text-muted-foreground text-sm"
              }
            >
              {testMessage}
            </span>
            <span
              className={
                submitState === "error"
                  ? "text-destructive text-sm"
                  : submitState === "success"
                    ? "text-emerald-600 text-sm"
                    : "text-muted-foreground text-sm"
              }
            >
              {submitMessage}
            </span>
          </div>
          <div className="flex gap-2">
            <Button
              type="button"
              variant="ghost"
              onClick={handleTest}
              disabled={testState === "testing"}
            >
              Test connection
            </Button>
            <Button type="submit" disabled={submitState === "saving"}>
              Save connection
            </Button>
          </div>
        </div>
      </form>
    </Form>
  );
}

export type { FormValues as ConnectionFormValues };
