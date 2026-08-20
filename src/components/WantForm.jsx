import { useMemo, useState } from "react"
import { Button } from "@/components/ui/button"
import {
  Field,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { Spinner } from "@/components/ui/spinner"
import { ColorSwatch } from "@/components/ColorSwatch"
import { SimilarOwns } from "@/components/SimilarOwns"
import { CATEGORIES, COLORS } from "@/lib/constants"

const EMPTY = {
  title: "",
  category: "",
  categoryDetail: "",
  color: "",
  colorDetail: "",
  url: "",
  price: "",
  note: "",
}

export function WantForm({ findSimilar, saving, onSubmit, onCancel }) {
  const [values, setValues] = useState(EMPTY)
  const [errors, setErrors] = useState({})

  const previewOwns = useMemo(() => {
    if (!values.category || !values.color || !findSimilar) return []
    if (values.category === "etc" && !values.categoryDetail.trim()) return []
    if (values.color === "other" && !values.colorDetail.trim()) return []
    return findSimilar({
      category: values.category,
      categoryDetail: values.categoryDetail,
      color: values.color,
      colorDetail: values.colorDetail,
    })
  }, [
    findSimilar,
    values.category,
    values.categoryDetail,
    values.color,
    values.colorDetail,
  ])

  function update(field, value) {
    setValues((prev) => {
      const next = { ...prev, [field]: value }
      if (field === "category" && value !== "etc") next.categoryDetail = ""
      if (field === "color" && value !== "other") next.colorDetail = ""
      return next
    })
    setErrors((prev) => ({
      ...prev,
      [field]: undefined,
      ...(field === "category" ? { categoryDetail: undefined } : {}),
      ...(field === "color" ? { colorDetail: undefined } : {}),
    }))
  }

  function validate() {
    const next = {}
    if (!values.title.trim()) next.title = "이름을 적어 주세요"
    if (!values.category) next.category = "카테고리를 골라 주세요"
    if (values.category === "etc" && !values.categoryDetail.trim()) {
      next.categoryDetail = "종류를 입력하세요"
    }
    if (!values.color) next.color = "색을 골라 주세요"
    if (values.color === "other" && !values.colorDetail.trim()) {
      next.colorDetail = "색 이름을 적어 주세요"
    }
    if (values.price !== "" && Number.isNaN(Number(values.price))) {
      next.price = "가격을 숫자로 적어 주세요"
    }
    setErrors(next)
    return Object.keys(next).length === 0
  }

  function handleSubmit(event) {
    event.preventDefault()
    if (!validate()) return
    onSubmit({
      title: values.title.trim(),
      category: values.category,
      categoryDetail:
        values.category === "etc" ? values.categoryDetail.trim() : undefined,
      color: values.color,
      colorDetail:
        values.color === "other" ? values.colorDetail.trim() : undefined,
      url: values.url.trim() || undefined,
      price: values.price === "" ? undefined : Number(values.price),
      note: values.note.trim() || undefined,
    })
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-5">
      {previewOwns.length > 0 ? <SimilarOwns owns={previewOwns} /> : null}

      <FieldGroup className="gap-4">
        <Field data-invalid={errors.title ? true : undefined}>
          <FieldLabel htmlFor="want-title">이름</FieldLabel>
          <Input
            id="want-title"
            value={values.title}
            onChange={(event) => update("title", event.target.value)}
            aria-invalid={Boolean(errors.title)}
            className="h-10"
          />
          <FieldError>{errors.title}</FieldError>
        </Field>

        <Field data-invalid={errors.category ? true : undefined}>
          <FieldLabel>카테고리</FieldLabel>
          <Select
            value={values.category || undefined}
            onValueChange={(value) => update("category", value)}
          >
            <SelectTrigger
              className="h-10 w-full"
              aria-invalid={Boolean(errors.category)}
            >
              <SelectValue placeholder="골라 주세요" />
            </SelectTrigger>
            <SelectContent>
              <SelectGroup>
                {CATEGORIES.map((item) => (
                  <SelectItem key={item.value} value={item.value}>
                    {item.label}
                  </SelectItem>
                ))}
              </SelectGroup>
            </SelectContent>
          </Select>
          <FieldDescription>
            기타를 누르면 다른 종류를 적을 수 있어요.
          </FieldDescription>
          <FieldError>{errors.category}</FieldError>
        </Field>

        {values.category === "etc" ? (
          <Field data-invalid={errors.categoryDetail ? true : undefined}>
            <FieldLabel htmlFor="want-category-detail">다른 종류</FieldLabel>
            <Input
              id="want-category-detail"
              placeholder="종류를 입력하세요"
              value={values.categoryDetail}
              onChange={(event) => update("categoryDetail", event.target.value)}
              aria-invalid={Boolean(errors.categoryDetail)}
              className="h-10"
            />
            <FieldDescription>
              이름을 적으면 그 종류끼리만 겹칩으로 봐요.
            </FieldDescription>
            <FieldError>{errors.categoryDetail}</FieldError>
          </Field>
        ) : null}

        <Field data-invalid={errors.color ? true : undefined}>
          <FieldLabel>색</FieldLabel>
          <Select
            value={values.color || undefined}
            onValueChange={(value) => update("color", value)}
          >
            <SelectTrigger
              className="h-10 w-full"
              aria-invalid={Boolean(errors.color)}
            >
              <SelectValue placeholder="골라 주세요" />
            </SelectTrigger>
            <SelectContent>
              <SelectGroup>
                {COLORS.map((item) => (
                  <SelectItem key={item.value} value={item.value}>
                    <span className="flex items-center gap-2">
                      <ColorSwatch color={item.value} />
                      {item.label}
                    </span>
                  </SelectItem>
                ))}
              </SelectGroup>
            </SelectContent>
          </Select>
          <FieldDescription>
            기타를 누르면 다른 색을 적을 수 있어요.
          </FieldDescription>
          <FieldError>{errors.color}</FieldError>
        </Field>

        {values.color === "other" ? (
          <Field data-invalid={errors.colorDetail ? true : undefined}>
            <FieldLabel htmlFor="want-color-detail">다른 색</FieldLabel>
            <Input
              id="want-color-detail"
              placeholder="예: 카키"
              value={values.colorDetail}
              onChange={(event) => update("colorDetail", event.target.value)}
              aria-invalid={Boolean(errors.colorDetail)}
              className="h-10"
            />
            <FieldDescription>
              이름을 적으면 그 색끼리만 겹칩으로 봐요.
            </FieldDescription>
            <FieldError>{errors.colorDetail}</FieldError>
          </Field>
        ) : null}

        <Field>
          <FieldLabel htmlFor="want-url">링크</FieldLabel>
          <Input
            id="want-url"
            type="url"
            inputMode="url"
            placeholder="선택"
            value={values.url}
            onChange={(event) => update("url", event.target.value)}
            className="h-10"
          />
        </Field>

        <Field data-invalid={errors.price ? true : undefined}>
          <FieldLabel htmlFor="want-price">가격</FieldLabel>
          <Input
            id="want-price"
            inputMode="numeric"
            placeholder="선택"
            value={values.price}
            onChange={(event) => update("price", event.target.value)}
            aria-invalid={Boolean(errors.price)}
            className="h-10"
          />
          <FieldError>{errors.price}</FieldError>
        </Field>

        <Field>
          <FieldLabel htmlFor="want-note">메모</FieldLabel>
          <Textarea
            id="want-note"
            placeholder="선택"
            value={values.note}
            onChange={(event) => update("note", event.target.value)}
          />
        </Field>
      </FieldGroup>

      <div className="flex flex-col gap-2">
        <Button type="submit" className="h-10 w-full" disabled={saving}>
          {saving ? <Spinner data-icon="inline-start" /> : null}
          넣기
        </Button>
        {onCancel ? (
          <Button type="button" variant="ghost" onClick={onCancel}>
            취소
          </Button>
        ) : null}
      </div>
    </form>
  )
}
