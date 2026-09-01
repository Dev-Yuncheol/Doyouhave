import { useState } from "react"
import { AppHeader } from "@/components/AppHeader"
import { EmptyState } from "@/components/EmptyState"
import { DataLoadState } from "@/components/DataLoadState"
import { FilterChips } from "@/components/FilterChips"
import { OwnManageDialog } from "@/components/OwnManageDialog"
import { OwnCard } from "@/components/WantCard"
import { useOwns } from "@/hooks/useOwns"

export function OwnsPage() {
  const [category, setCategory] = useState("")
  const [color, setColor] = useState("")
  const [panel, setPanel] = useState(null)
  const { owns, allOwns, saving, loading, loadError, reload, updateOwn, deleteOwn } = useOwns({
    category: category || undefined,
    color: color || undefined,
  })

  const isEmpty = allOwns.length === 0
  const isFilterEmpty = !isEmpty && owns.length === 0
  const activeOwn = panel?.own

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-y-auto">
      <AppHeader backTo="/" backLabel="살까" />
      <div
        className="flex flex-1 flex-col gap-4 px-5 pt-4"
        style={{ paddingBottom: "calc(20px + env(safe-area-inset-bottom))" }}
      >
        <div>
          <h1 className="text-2xl font-semibold leading-[1.3]">집에 있는 것</h1>
          <p className="text-[13px] text-muted-foreground">
            길게 누르면 수정하거나 지울 수 있어요.
          </p>
        </div>

        <FilterChips value={category} onChange={setCategory} />
        <FilterChips type="color" value={color} onChange={setColor} />

        {loading || loadError ? (
          <DataLoadState loading={loading} error={loadError} onRetry={reload} />
        ) : owns.length > 0 ? (
          <div className="flex flex-col gap-3">
            {owns.map((own) => (
              <OwnCard
                key={own.id}
                own={own}
                onLongPress={(item) => setPanel({ own: item, view: "edit" })}
              />
            ))}
          </div>
        ) : isEmpty ? (
          <EmptyState kind="owns" />
        ) : isFilterEmpty ? (
          <EmptyState
            kind="filter"
            onClear={() => {
              setCategory("")
              setColor("")
            }}
          />
        ) : null}
      </div>

      <OwnManageDialog
        panel={panel}
        saving={saving}
        onClose={() => setPanel(null)}
        onAskDelete={() =>
          activeOwn ? setPanel({ own: activeOwn, view: "delete" }) : null
        }
        onBackToEdit={() =>
          activeOwn ? setPanel({ own: activeOwn, view: "edit" }) : null
        }
        onDelete={async () => {
          if (!activeOwn) return
          try {
            await deleteOwn(activeOwn.id)
            setPanel(null)
          } catch {
            /* toast in hook */
          }
        }}
        onSave={async (payload) => {
          if (!activeOwn) return
          try {
            await updateOwn(activeOwn.id, payload)
            setPanel(null)
          } catch {
            /* toast in hook */
          }
        }}
      />
    </div>
  )
}
