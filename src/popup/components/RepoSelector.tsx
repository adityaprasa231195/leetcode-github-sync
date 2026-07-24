

import { useEffect, useMemo, useState } from "react"
import { useMessage } from "../hooks/useMessage"
import type { GitHubRepo } from "~types"
import { Button } from "./Button"
import { Spinner } from "./Spinner"

interface RepoSelectorProps {
  currentRepo?: GitHubRepo
  onSelect: (repo: GitHubRepo) => void
  onCancel?: () => void
}

export function RepoSelector({ currentRepo, onSelect, onCancel }: RepoSelectorProps) {
  const [repos, setRepos] = useState<GitHubRepo[]>([])
  const [filter, setFilter] = useState("")
  const [selected, setSelected] = useState<GitHubRepo | null>(currentRepo ?? null)
  const [loadError, setLoadError] = useState("")

  const fetchRepos = useMessage<GitHubRepo[]>("GET_REPOS")
  const setRepo = useMessage<GitHubRepo>("SET_REPO")

  useEffect(() => {
    fetchRepos
      .send()
      .then(setRepos)
      .catch((err) => setLoadError(err.message))
    
  }, [])

  const filtered = useMemo(
    () =>
      repos.filter((r) =>
        r.fullName.toLowerCase().includes(filter.toLowerCase())
      ),
    [repos, filter]
  )

  async function handleConfirm() {
    if (!selected) return
    try {
      await setRepo.send(selected)
      onSelect(selected)
    } catch {
      
    }
  }

  if (fetchRepos.loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Spinner size={20} />
      </div>
    )
  }

  if (loadError || fetchRepos.error) {
    return (
      <div className="p-4 text-center">
        <p className="text-sm text-red-600 mb-3">{loadError || fetchRepos.error}</p>
        <Button variant="secondary" size="sm" onClick={() => fetchRepos.send().then(setRepos).catch(() => {})}>
          Retry
        </Button>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-3 animate-slide-up">
      <div className="px-4 pt-4">
        <p className="text-xs font-medium text-brand-500 uppercase tracking-wide mb-2">
          Select Repository
        </p>
        <input
          type="search"
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          placeholder="Filter repositories…"
          className="w-full rounded-lg border border-brand-300 bg-white px-3 py-2 text-sm placeholder:text-brand-400 focus:border-black focus:outline-none focus:ring-1 focus:ring-black"
          autoFocus
        />
      </div>

      {}
      <ul className="max-h-52 overflow-y-auto divide-y divide-brand-100 border-y border-brand-100">
        {filtered.length === 0 && (
          <li className="py-6 text-center text-sm text-brand-400">
            No repositories found
          </li>
        )}
        {filtered.map((repo) => {
          const isSelected = selected?.fullName === repo.fullName
          return (
            <li key={repo.fullName}>
              <button
                onClick={() => setSelected(repo)}
                className={`w-full flex items-start gap-3 px-4 py-3 text-left transition-colors ${
                  isSelected
                    ? "bg-black text-white"
                    : "hover:bg-brand-50 text-brand-900"
                }`}
              >
                <span className="flex-1 min-w-0">
                  <span className="block text-sm font-medium truncate">
                    {repo.fullName}
                  </span>
                  {repo.description && (
                    <span
                      className={`block text-xs truncate mt-0.5 ${
                        isSelected ? "text-brand-300" : "text-brand-400"
                      }`}
                    >
                      {repo.description}
                    </span>
                  )}
                </span>
                <span
                  className={`shrink-0 text-xs rounded-full px-2 py-0.5 mt-0.5 font-medium ${
                    isSelected
                      ? "bg-white/20 text-white"
                      : repo.isPrivate
                      ? "bg-brand-100 text-brand-600"
                      : "bg-brand-100 text-brand-600"
                  }`}
                >
                  {repo.isPrivate ? "Private" : "Public"}
                </span>
              </button>
            </li>
          )
        })}
      </ul>

      {setRepo.error && (
        <p className="px-4 text-xs text-red-600">{setRepo.error}</p>
      )}

      {}
      <div className="flex gap-2 px-4 pb-4">
        {onCancel && (
          <Button variant="secondary" size="sm" onClick={onCancel}>
            Cancel
          </Button>
        )}
        <Button
          size="sm"
          className="flex-1"
          disabled={!selected}
          loading={setRepo.loading}
          onClick={handleConfirm}
        >
          {currentRepo ? "Change Repository" : "Select Repository"}
        </Button>
      </div>
    </div>
  )
}
