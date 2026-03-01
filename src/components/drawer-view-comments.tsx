"use client";

import React from "react";
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer";
import { Skeleton } from "@/components/ui/skeleton";

type TableComment = {
  column_name: string;
  comment: string | null;
};

type DrawerViewCommentsProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  tableName?: string;
  schemaName?: string;
  comments: TableComment[];
  loading: boolean;
  error?: string;
};

export function DrawerViewComments({
  open,
  onOpenChange,
  tableName,
  schemaName,
  comments,
  loading,
  error,
}: DrawerViewCommentsProps) {
  return (
    <Drawer direction="bottom" open={open} onOpenChange={onOpenChange}>
      <DrawerContent>
        <DrawerHeader>
          <DrawerTitle>Table Comments</DrawerTitle>
          <DrawerDescription>
            {schemaName && tableName
              ? `Comments for ${schemaName}.${tableName}`
              : "Column comments"}
          </DrawerDescription>
        </DrawerHeader>

        <div className="no-scrollbar overflow-y-auto px-4 pb-4 max-h-96 select-text">
          {loading && (
            <div className="space-y-1">
              {[1, 2, 3].map((i) => (
                <div key={i} className="space-y-2">
                  <Skeleton className="h-4 w-32" />
                  <Skeleton className="h-3 w-full" />
                </div>
              ))}
            </div>
          )}

          {error && (
            <div className="text-red-500 text-sm py-4">
              Error loading comments: {error}
            </div>
          )}

          {!loading && !error && comments.length === 0 && (
            <p className="text-gray-500 text-sm py-4">No comments found</p>
          )}

          {!loading && comments.length > 0 && (
            <div className="space-y-4">
              {comments.map((item, index) => (
                <div key={index} className="border-b pb-2 last:border-b-0">
                  <h4 className="font-semibold text-sm text-gray-900 dark:text-gray-100">
                    {item.column_name}
                  </h4>
                  {item.comment ? (
                    <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                      {item.comment}
                    </p>
                  ) : (
                    <p className="text-sm text-gray-400 dark:text-gray-600 italic mt-1">
                      No comment
                    </p>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </DrawerContent>
    </Drawer>
  );
}
