"use client";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog"
import { WindowControls } from "./window-controls";
import { Button } from "./ui/button";
import { Select, SelectContent, SelectGroup, SelectItem, SelectLabel, SelectTrigger, SelectValue } from "./ui/select";
import { getPreferredTheme, Theme, useTheme } from "@/hooks/use-theme";
import React from "react";
import { Field, FieldDescription, FieldLabel } from "./ui/field";
import { Input } from "./ui/input";

type SettingsModalProps = {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    theme: Theme;
    setThemeMode: (mode: Theme) => void;
};
const themes = [
    { value: "dark", label: "Dark" },
    { value: "light", label: "Light" },
]
export function SettingsModal({ open, onOpenChange, theme, setThemeMode }: SettingsModalProps) {
    const [selectedTheme, setSelectedTheme] = React.useState<Theme>(theme);
    React.useEffect(() => {
        setSelectedTheme(theme);
    }, [theme])
    return (
        <Dialog open={open} onOpenChange={onOpenChange}>

            <DialogContent className="sm:max-w-sm" showCloseButton={false}>
                <WindowControls onClose={() => {
                    onOpenChange(false);
                }} bgColor="bg-none" className="py-3" />
                <DialogHeader>

                    <DialogTitle>Settings uSQL</DialogTitle>
                    <DialogDescription>
                        Configure your uSQL preferences and settings.
                    </DialogDescription>
                </DialogHeader>
                <div className="flex flex-col">
                    <Select defaultValue={theme} onValueChange={(val: Theme) => {
                        setSelectedTheme(val);
                    }}>
                        <SelectTrigger className="w-full max-w-48">
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectGroup>
                                <SelectLabel>Themes</SelectLabel>
                                {themes.map((item) => (
                                    <SelectItem key={item.value} value={item.value}>
                                        {item.label}
                                    </SelectItem>
                                ))}
                            </SelectGroup>
                        </SelectContent>
                    </Select>
                    <Field>
                        <FieldLabel htmlFor="input-field-username">Limit page size</FieldLabel>
                        <Input
                            id="input-field-username"
                            type="text"
                            placeholder="Limit page size for query results"
                        />
                        <FieldDescription>
                            Set a limit for the number of rows returned in query results to prevent overwhelming the interface and improve performance.
                        </FieldDescription>
                    </Field>
                </div>
                <DialogFooter>
                    <Button variant="outline" onClick={() => {
                        onOpenChange(false);
                    }}>Close</Button>
                    <Button onClick={() => {
                        setThemeMode(selectedTheme);
                        onOpenChange(false);
                    }}>Save Changes</Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}