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
import { Github, Target, User } from "lucide-react";

type AboutModalProps = {
    open: boolean;
    onOpenChange: (open: boolean) => void;
};

export function AboutModal({ open, onOpenChange }: AboutModalProps) {
    return (
        <Dialog open={open} onOpenChange={onOpenChange}>

            <DialogContent className="sm:max-w-sm" showCloseButton={false}>
                <WindowControls onClose={() => {
                    onOpenChange(false);
                }} bgColor="bg-none" className="py-3" />
                <DialogHeader>

                    <DialogTitle>About uSQL</DialogTitle>
                    <DialogDescription>
                        Lightweight SQL client for local workflows.
                    </DialogDescription>
                </DialogHeader>
                <div className="space-y-3 px-4 text-sm">
                    <div className="flex items-center justify-between">
                        <div className="text-muted-foreground flex flex-row items-center">
                            <Target size={15} />
                            <span className="ml-2">Version</span>
                        </div>
                        <span className="font-medium">v1.0.0</span>
                    </div>
                    <div className="flex items-center justify-between">
                        <div className="text-muted-foreground flex flex-row items-center">
                            <User size={15} />
                            <span className="ml-2">Author</span>
                        </div>
                        <span className="font-medium">Nguyen Phuc Thinh</span>
                    </div>
                    <div className="flex items-center justify-between">
                        <div className="text-muted-foreground flex flex-row items-center">
                            <Github size={15} />
                            <span className="ml-2">GitHub</span>
                        </div>
                        <a
                            className="font-medium text-sky-600 hover:text-sky-700"
                            href="https://github.com/kidp2h"
                            target="_blank"
                            rel="noreferrer"
                        >
                            https://github.com/kidp2h
                        </a>
                    </div>
                </div>
                <DialogFooter>
                    <span className="text-muted-foreground text-xs">
                        Thanks for trying uSQL.
                    </span>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}