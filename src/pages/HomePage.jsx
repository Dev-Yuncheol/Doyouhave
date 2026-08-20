import { useState } from "react"
import { Link } from "react-router-dom"
import { Button } from "@/components/ui/button"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { AppHeader } from "@/components/AppHeader"
import { EmptyState } from "@/components/EmptyState"
import { FilterChips } from "@/components/FilterChips"
import { WantCard } from "@/components/WantCard"
import { useOwns } from "@/hooks/useOwns"
import { useWants } from "@/hooks/useWants"

export function HomePage() {
  const [status, setStatus] = useState("pending")
  const [category, setCategory] = useState("")
  const { wants: statusWants } = useWants({ status })
  const { similar } = useOwns()
  const wants = category
    ? statusWants.filter((want) => want.category === category)
    : statusWants

  const isFilterEmpty = statusWants.length > 0 && wants.length === 0
  const isHomeEmpty = status === "pending" && !category && statusWants.length === 0

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <AppHeader />
      <div className="flex min-h-0 flex-1 flex-col">
        <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto px-5 pt-4">
          <h1 className="text-2xl font-semibold leading-[1.3]">살까</h1>

          <Tabs value={status} onValueChange={setStatus}>
            <TabsList variant="line" className="h-auto w-full justify-start gap-1 rounded-none bg-transparent p-0">
              <TabsTrigger value="pending" className="flex-none px-3">
                진행 중
              </TabsTrigger>
              <TabsTrigger value="bought" className="flex-none px-3">
                샀다
              </TabsTrigger>
              <TabsTrigger value="skipped" className="flex-none px-3">
                안 샀다
              </TabsTrigger>
            </TabsList>
          </Tabs>

          <FilterChips value={category} onChange={setCategory} />

          {wants.length > 0 ? (
            <div className="flex flex-col gap-3 pb-4">
              {wants.map((want) => (
                <WantCard
                  key={want.id}
                  want={want}
                  hasSimilar={
                    similar({
                      category: want.category,
                      categoryDetail: want.categoryDetail,
                      color: want.color,
                      colorDetail: want.colorDetail,
                    }).length > 0
                  }
                />
              ))}
            </div>
          ) : isHomeEmpty ? (
            <EmptyState kind="home" />
          ) : isFilterEmpty || wants.length === 0 ? (
            <EmptyState
              kind="filter"
              onClear={() => {
                setCategory("")
                setStatus("pending")
              }}
            />
          ) : null}
        </div>

        <div
          className="border-t bg-background px-5 pt-3"
          style={{
            paddingBottom: "calc(12px + env(safe-area-inset-bottom))",
          }}
        >
          <Button className="h-10 w-full" asChild>
            <Link to="/wants/new">후보 추가</Link>
          </Button>
        </div>
      </div>
    </div>
  )
}
