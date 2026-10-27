"use client"

import * as React from "react"
import {
  FileCode as FileCode2,
  UploadSimple as UploadCloud,
  X,
} from "@phosphor-icons/react"

import { cn } from "@/lib/utils"

/** Brandsync File Upload: dropzone with click + drag-and-drop and visible constraints. */
function Dropzone({
  accept,
  title,
  constraints,
  onFile,
}: {
  accept: string
  title: string
  constraints: string
  onFile: (file: File | undefined | null) => void
}) {
  const inputRef = React.useRef<HTMLInputElement>(null)
  const [dragging, setDragging] = React.useState(false)
  return (
    <label
      className={cn(
        "flex cursor-pointer flex-col items-center gap-1 rounded-[var(--bs-border-radius-150)] border border-dashed px-4 py-6 text-center has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-[var(--bs-border-neutral-focus)]",
        dragging
          ? "border-[var(--bs-color-primary-default)] bg-[var(--bs-color-primary-container)]"
          : "border-[var(--bs-border-neutral-container)] bg-[var(--bs-neutral-25)]"
      )}
      onDragOver={(e) => {
        e.preventDefault()
        setDragging(true)
      }}
      onDragLeave={() => setDragging(false)}
      onDrop={(e) => {
        e.preventDefault()
        setDragging(false)
        onFile(e.dataTransfer.files?.[0])
      }}
    >
      <input
        ref={inputRef}
        type="file"
        accept={accept}
        className="sr-only"
        onChange={(e) => onFile(e.target.files?.[0])}
      />
      <UploadCloud size={24} aria-hidden="true" className="text-[var(--bs-icon-muted)]" />
      <span className="bs-label">{title}</span>
      <span className="bs-helper">{constraints}</span>
    </label>
  )
}

function FileItem({
  name,
  meta,
  onRemove,
}: {
  name: string
  meta: string
  onRemove: () => void
}) {
  return (
    <div className="bs-file-item" role="group" aria-label={`Selected file ${name}`}>
      <FileCode2 aria-hidden="true" />
      <div>
        <div className="bs-file-name">{name}</div>
        <div className="bs-file-size">{meta}</div>
      </div>
      <button type="button" className="bs-file-remove" aria-label={`Remove ${name}`} onClick={onRemove}>
        <X aria-hidden="true" />
      </button>
    </div>
  )
}

export { Dropzone, FileItem }
