import Image from "next/image"
import { Kbd } from "./ui/kbd"
import { Separator } from "./ui/separator"
import { fa } from "zod/locales"
import { CommandIcon, File, FolderOpen, Palette, PanelLeft, PanelLeftDashed } from "lucide-react"


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
                        <Kbd className="ml-2 font-medium">⌘ + O</Kbd>
                    </div>
                    <div className="flex justify-between flex-row">
                        <div className="flex flex-row gap-x-1 items-center justify-center">
                            <File className="size-4 mr-1 text-purple-500" />
                            <span className="text-muted-foreground text-xs font-medium ">New query</span>
                        </div>
                        <Kbd className="ml-2 font-medium">⌘ + N</Kbd>
                    </div>
                    <div className="flex justify-between flex-row">
                        <div className="flex flex-row gap-x-1 items-center justify-center">
                            <PanelLeft className="size-4 mr-1 text-blue-500" />
                            <span className="text-muted-foreground text-xs font-medium ">Toggle sidebar</span>
                        </div>
                        <Kbd className="ml-2 font-medium">⌘ + B</Kbd>

                    </div>
                    <div className="flex justify-between flex-row">
                        <div className="flex flex-row gap-x-1 items-center justify-center">
                            <Palette className="size-4 mr-1 text-green-500" />
                            <span className="text-muted-foreground text-xs font-medium ">Switch Dark/Light mode</span>
                        </div>
                        <Kbd className="ml-2 font-medium">⌘ + ⇧ + D</Kbd>
                    </div>
                    <div className=" flex justify-between flex-row">
                        <div className="flex flex-row gap-x-1 items-center justify-center">
                            <CommandIcon className="size-4 mr-1 text-red-500" />
                            <span className="text-muted-foreground text-xs font-medium">Command Palette</span>
                        </div>
                        <Kbd className="ml-2 font-medium">⌘ + ⇧ + P</Kbd>
                    </div>
                </div>
            </div>

        </div>
    )
}