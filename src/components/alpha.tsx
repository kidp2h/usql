import { CommandIcon, File, FilePlus, FolderOpen, Palette, PanelLeft } from "lucide-react"
import { Kbd, Shortcut } from "./ui/kbd"


export function Alpha() {
    return (
        <div className="flex h-full w-full items-center justify-center select-none">
            <div className="w-[70%] flex flex-col justify-center items-center">
                <div className="flex flex-col items-center justify-center">
                    {/* <img src={"/electron1.png"} width={200} height={200} className="mb-5" /> */}
                    <pre className="mb-5 leading-tight text-lg text-muted-foreground select-none">
                        {`    
             ▄▄▄▄      ▄▄▄▄    ▄▄       
           ▄█▀▀▀▀█    ██▀▀██   ██       
 ██    ██  ██▄       ██    ██  ██       
 ██    ██   ▀████▄   ██    ██  ██       
 ██    ██       ▀██  ██    ██  ██       
 ██▄▄▄███  █▄▄▄▄▄█▀   ██▄▄██▀  ██▄▄▄▄▄▄ 
  ▀▀▀▀ ▀▀   ▀▀▀▀▀      ▀▀▀██   ▀▀▀▀▀▀▀▀ 
                           ▀            
 `}
                    </pre>
                    <div className="flex flex-col justify-center items-center">

                        <span className="text-sm text-muted-foreground font-medium mb-2">
                            Welcome to uSQL
                        </span>
                        <span className="text-xs text-muted-foreground">Lightweight SQL client for local workflows.</span>
                    </div>
                </div>

                <div className="mt-10 w-[30%] flex flex-col gap-y-2.5">
                    <div className="flex justify-between flex-row">
                        <div className="flex flex-row gap-x-1 items-center justify-center">
                            <FolderOpen className="size-4 mr-1 text-sky-500" />
                            <span className="text-muted-foreground text-xs font-medium ">Open file</span>
                        </div>
                        <Shortcut className="ml-auto" shortcut="⌘ + O" />
                    </div>
                    <div className="flex justify-between flex-row">
                        <div className="flex flex-row gap-x-1 items-center justify-center">
                            <FilePlus className="size-4 mr-1 text-purple-500" />
                            <span className="text-muted-foreground text-xs font-medium ">New query</span>
                        </div>
                        <Shortcut className="ml-auto" shortcut="⌘ + N" />
                    </div>
                    <div className="flex justify-between flex-row">
                        <div className="flex flex-row gap-x-1 items-center justify-center">
                            <PanelLeft className="size-4 mr-1 text-blue-500" />
                            <span className="text-muted-foreground text-xs font-medium ">Toggle sidebar</span>
                        </div>
                        <Shortcut className="ml-auto" shortcut="⌘ + B" />

                    </div>
                    <div className="flex justify-between flex-row">
                        <div className="flex flex-row gap-x-1 items-center justify-center">
                            <Palette className="size-4 mr-1 text-green-500" />
                            <span className="text-muted-foreground text-xs font-medium ">Switch Dark/Light mode</span>
                        </div>
                        <Shortcut className="ml-auto" shortcut="⌘ + ⇧ + D" />
                    </div>
                    <div className=" flex justify-between flex-row">
                        <div className="flex flex-row gap-x-1 items-center justify-center">
                            <CommandIcon className="size-4 mr-1 text-red-500" />
                            <span className="text-muted-foreground text-xs font-medium">Command Palette</span>
                        </div>
                        <Shortcut className="ml-auto" shortcut="⌘ + ⇧ + P" />
                    </div>
                </div>
            </div>

        </div>
    )
}