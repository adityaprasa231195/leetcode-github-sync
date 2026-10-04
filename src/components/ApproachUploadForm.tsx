import { useState, useRef, type ChangeEvent, type DragEvent } from "react"
import type { ApproachPayload, SubmissionDetail, UploadRecord } from "~types"
import { Spinner } from "~popup/components/Spinner"

export interface ApproachUploadFormProps {
  submission: SubmissionDetail
  onSuccess: (record: UploadRecord) => void
  onCancel?: () => void
  isPopup?: boolean
}

type TabType = "file" | "write"

const ALLOWED_EXTENSIONS = ["md", "pdf", "png", "jpg", "jpeg", "txt"]
const MAX_FILE_SIZE_BYTES = 25 * 1024 * 1024

export function ApproachUploadForm({
  submission,
  onSuccess,
  onCancel,
  isPopup = false
}: ApproachUploadFormProps) {
  const [activeTab, setActiveTab] = useState<TabType>("file")
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [filePreview, setFilePreview] = useState<string | null>(null)
  const [fileSnippet, setFileSnippet] = useState<string | null>(null)

  const [writtenText, setWrittenText] = useState("")
  const [writeFormat, setWriteFormat] = useState<"md" | "txt">("md")

  const [isDragging, setIsDragging] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [successRecord, setSuccessRecord] = useState<UploadRecord | null>(null)

  const fileInputRef = useRef<HTMLInputElement>(null)

  function getFileExtension(filename: string): string {
    const parts = filename.split(".")
    return parts.length > 1 ? parts.pop()!.toLowerCase() : ""
  }

  function handleFileSelect(file: File) {
    setErrorMessage(null)
    const ext = getFileExtension(file.name)

    if (!ALLOWED_EXTENSIONS.includes(ext)) {
      setErrorMessage(
        `Invalid file type (.${ext}). Supported types: .md, .pdf, .png, .jpg, .jpeg, .txt`
      )
      return
    }

    if (file.size > MAX_FILE_SIZE_BYTES) {
      setErrorMessage("File exceeds the 25MB size limit.")
      return
    }

    setSelectedFile(file)

    if (["png", "jpg", "jpeg"].includes(ext)) {
      const url = URL.createObjectURL(file)
      setFilePreview(url)
      setFileSnippet(null)
    } else if (["md", "txt"].includes(ext)) {
      setFilePreview(null)
      const reader = new FileReader()
      reader.onload = (e) => {
        const text = (e.target?.result as string) || ""
        setFileSnippet(text.slice(0, 300) + (text.length > 300 ? "..." : ""))
      }
      reader.readAsText(file.slice(0, 1024))
    } else {
      setFilePreview(null)
      setFileSnippet(null)
    }
  }

  function handleDrop(e: DragEvent<HTMLDivElement>) {
    e.preventDefault()
    setIsDragging(false)
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFileSelect(e.dataTransfer.files[0])
    }
  }

  function handleDragOver(e: DragEvent<HTMLDivElement>) {
    e.preventDefault()
    setIsDragging(true)
  }

  function handleDragLeave(e: DragEvent<HTMLDivElement>) {
    e.preventDefault()
    setIsDragging(false)
  }

  function clearSelectedFile() {
    setSelectedFile(null)
    setFilePreview(null)
    setFileSnippet(null)
    if (fileInputRef.current) {
      fileInputRef.current.value = ""
    }
  }

  async function buildPayload(): Promise<ApproachPayload> {
    if (activeTab === "file") {
      if (!selectedFile) throw new Error("Please select an approach file.")
      const ext = getFileExtension(selectedFile.name)
      const isBinary = ["png", "jpg", "jpeg", "pdf"].includes(ext)

      return new Promise((resolve, reject) => {
        const reader = new FileReader()
        if (isBinary) {
          reader.onload = () => {
            const dataUrl = reader.result as string
            const base64 = dataUrl.split(",")[1] || ""
            resolve({
              extension: ext,
              mimeType:
                selectedFile.type ||
                (ext === "pdf" ? "application/pdf" : `image/${ext}`),
              contentBase64: base64,
              isBinary: true
            })
          }
          reader.onerror = () => reject(new Error("Failed to read file."))
          reader.readAsDataURL(selectedFile)
        } else {
          reader.onload = () => {
            const text = (reader.result as string) || ""
            const bytes = new TextEncoder().encode(text)
            let binary = ""
            bytes.forEach((b) => (binary += String.fromCharCode(b)))
            const base64 = btoa(binary)
            resolve({
              extension: ext,
              mimeType: selectedFile.type || "text/plain",
              contentBase64: base64,
              isBinary: false,
              rawText: text
            })
          }
          reader.onerror = () => reject(new Error("Failed to read file."))
          reader.readAsText(selectedFile)
        }
      })
    } else {
      if (!writtenText.trim()) {
        throw new Error("Please write or paste your approach before syncing.")
      }
      const bytes = new TextEncoder().encode(writtenText)
      let binary = ""
      bytes.forEach((b) => (binary += String.fromCharCode(b)))
      const base64 = btoa(binary)
      return {
        extension: writeFormat,
        mimeType: writeFormat === "md" ? "text/markdown" : "text/plain",
        contentBase64: base64,
        isBinary: false,
        rawText: writtenText
      }
    }
  }

  async function handleSubmit() {
    setErrorMessage(null)
    setSubmitting(true)
    try {
      const approach = await buildPayload()
      const response = await chrome.runtime.sendMessage({
        type: "SUBMIT_APPROACH",
        payload: {
          submission,
          approach
        }
      })

      if (!response || !response.success) {
        throw new Error(response?.error || "Failed to push to GitHub.")
      }

      setSuccessRecord(response.data as UploadRecord)
      setTimeout(() => {
        onSuccess(response.data as UploadRecord)
      }, 1400)
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : String(err))
    } finally {
      setSubmitting(false)
    }
  }

  const isReady =
    activeTab === "file" ? !!selectedFile : writtenText.trim().length > 0

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
  }

  if (successRecord) {
    return (
      <div className="p-6 text-center space-y-4">
        <div className="w-12 h-12 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto text-2xl font-bold">
          ✓
        </div>
        <div>
          <h3 className="text-base font-semibold text-gray-900">
            Pushed to GitHub Successfully
          </h3>
          <p className="text-xs text-gray-500 mt-1">
            Solution and approach notes have been committed to your repository.
          </p>
        </div>
        {successRecord.fileUrl && (
          <a
            href={successRecord.fileUrl}
            target="_blank"
            rel="noreferrer"
            className="inline-block text-xs font-medium text-black hover:underline"
          >
            View Solution on GitHub →
          </a>
        )}
      </div>
    )
  }

  return (
    <div className={`space-y-4 ${isPopup ? "p-4 text-xs" : "text-sm"}`}>
      <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-amber-800 flex items-start gap-2.5">
        <span className="text-base leading-none">⚠️</span>
        <div className="flex-1 text-xs leading-relaxed">
          <span className="font-semibold block text-amber-900">
            Auto-push paused: Approach required
          </span>
          Upload your notes or write your explanation to finish pushing #
          {submission.problemId} {submission.problemTitle} to GitHub.
        </div>
      </div>

      <div className="flex border-b border-gray-200">
        <button
          type="button"
          onClick={() => setActiveTab("file")}
          className={`flex-1 pb-2 font-medium text-center border-b-2 transition-colors ${
            activeTab === "file"
              ? "border-black text-black"
              : "border-transparent text-gray-500 hover:text-gray-800"
          }`}
        >
          📁 Upload File (.md, .pdf, image, .txt)
        </button>
        <button
          type="button"
          onClick={() => setActiveTab("write")}
          className={`flex-1 pb-2 font-medium text-center border-b-2 transition-colors ${
            activeTab === "write"
              ? "border-black text-black"
              : "border-transparent text-gray-500 hover:text-gray-800"
          }`}
        >
          ✍️ Write Approach
        </button>
      </div>

      {activeTab === "file" ? (
        <div className="space-y-3">
          <input
            ref={fileInputRef}
            type="file"
            accept=".md,.markdown,.pdf,.png,.jpg,.jpeg,.txt"
            onChange={(e: ChangeEvent<HTMLInputElement>) => {
              if (e.target.files && e.target.files[0]) {
                handleFileSelect(e.target.files[0])
              }
            }}
            className="hidden"
          />

          {!selectedFile ? (
            <div
              onDrop={handleDrop}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onClick={() => fileInputRef.current?.click()}
              className={`border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-all ${
                isDragging
                  ? "border-black bg-gray-50 scale-[0.99]"
                  : "border-gray-300 hover:border-gray-400 bg-white"
              }`}
            >
              <div className="text-2xl mb-1.5">📄</div>
              <p className="font-medium text-gray-800 text-sm">
                Drop your approach file here, or{" "}
                <span className="text-black underline underline-offset-2">
                  browse
                </span>
              </p>
              <p className="text-xs text-gray-500 mt-1">
                Markdown (.md), PDF (.pdf), Photos (.png, .jpg, .jpeg), or Text
                (.txt)
              </p>
              <p className="text-[11px] text-gray-400 mt-0.5">
                Up to 25MB · Saved as approach.&lt;ext&gt;
              </p>
            </div>
          ) : (
            <div className="border border-gray-200 bg-gray-50 rounded-xl p-3.5 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5 truncate">
                  <span className="text-xl">
                    {selectedFile.name.endsWith(".pdf")
                      ? "📕"
                      : ["png", "jpg", "jpeg"].some((e) =>
                            selectedFile.name.toLowerCase().endsWith(e)
                          )
                        ? "🖼️"
                        : "📝"}
                  </span>
                  <div className="truncate">
                    <p className="text-xs font-semibold text-gray-900 truncate">
                      {selectedFile.name}
                    </p>
                    <p className="text-[11px] text-gray-500">
                      {formatFileSize(selectedFile.size)} · will be saved as{" "}
                      <code className="bg-gray-200 px-1 py-0.5 rounded text-[10px]">
                        approach.{getFileExtension(selectedFile.name)}
                      </code>
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={clearSelectedFile}
                  className="text-xs text-red-600 hover:text-red-800 font-medium px-2 py-1 rounded hover:bg-red-50 transition-colors"
                >
                  Change
                </button>
              </div>

              {filePreview && (
                <div className="rounded-lg overflow-hidden border border-gray-200 max-h-48 bg-white flex items-center justify-center p-1">
                  <img
                    src={filePreview}
                    alt="Approach preview"
                    className="max-h-44 object-contain rounded"
                  />
                </div>
              )}

              {fileSnippet && (
                <div className="bg-white border border-gray-200 rounded p-2.5 text-[11px] font-mono text-gray-700 whitespace-pre-wrap max-h-28 overflow-y-auto">
                  {fileSnippet}
                </div>
              )}

              {selectedFile.name.toLowerCase().endsWith(".pdf") && (
                <div className="bg-red-50 border border-red-100 rounded p-2.5 flex items-center gap-2 text-xs text-red-800">
                  <span>📄</span>
                  <span>
                    PDF document ready for upload. A view link will be added to
                    README.md.
                  </span>
                </div>
              )}
            </div>
          )}
        </div>
      ) : (
        <div className="space-y-2.5">
          <div className="flex items-center justify-between text-xs">
            <span className="text-gray-500 font-medium">Format:</span>
            <div className="flex gap-2">
              <label className="flex items-center gap-1 cursor-pointer">
                <input
                  type="radio"
                  name="format"
                  value="md"
                  checked={writeFormat === "md"}
                  onChange={() => setWriteFormat("md")}
                />
                <span>Markdown (.md)</span>
              </label>
              <label className="flex items-center gap-1 cursor-pointer">
                <input
                  type="radio"
                  name="format"
                  value="txt"
                  checked={writeFormat === "txt"}
                  onChange={() => setWriteFormat("txt")}
                />
                <span>Plain text (.txt)</span>
              </label>
            </div>
          </div>

          <textarea
            value={writtenText}
            onChange={(e) => setWrittenText(e.target.value)}
            rows={isPopup ? 6 : 8}
            placeholder={`Describe your intuition, approach, and complexity...\n\nExample:\n### Intuition\nUse two pointers starting from both ends...\n\n### Complexity\n- Time: O(n)\n- Space: O(1)`}
            className="w-full rounded-lg border border-gray-300 p-2.5 text-xs font-mono focus:border-black focus:outline-none focus:ring-1 focus:ring-black placeholder:text-gray-400"
          />

          <div className="flex items-center justify-between text-[11px] text-gray-400">
            <span>
              {writtenText.trim()
                ? `${writtenText.trim().split(/\s+/).length} words · ${writtenText.length} chars`
                : "Empty"}
            </span>
            <span>Saved as approach.{writeFormat}</span>
          </div>
        </div>
      )}

      {errorMessage && (
        <div className="bg-red-50 border border-red-200 text-red-700 text-xs rounded-lg p-2.5 flex items-start gap-2">
          <span>⚠️</span>
          <span>{errorMessage}</span>
        </div>
      )}

      <div className="flex items-center justify-between pt-1 gap-2">
        {onCancel ? (
          <button
            type="button"
            disabled={submitting}
            onClick={onCancel}
            className="px-3 py-1.5 text-xs font-medium text-gray-600 hover:text-black rounded hover:bg-gray-100 transition-colors"
          >
            Later (Keep in queue)
          </button>
        ) : (
          <div />
        )}

        <button
          type="button"
          disabled={!isReady || submitting}
          onClick={handleSubmit}
          className="px-4 py-2 bg-black hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed text-white text-xs font-semibold rounded-lg flex items-center gap-2 transition-all shadow-sm"
        >
          {submitting ? (
            <>
              <Spinner size={13} />
              <span>Syncing to GitHub...</span>
            </>
          ) : (
            <span>Upload & Sync to GitHub →</span>
          )}
        </button>
      </div>
    </div>
  )
}
