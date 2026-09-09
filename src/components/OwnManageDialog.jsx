import { useEffect, useState } from "react"
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { Button } from "@/components/ui/button"
import {
  Field,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { getPriceError, MAX_PRICE } from "@/lib/price"
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Spinner } from "@/components/ui/spinner"
import { ColorSwatch } from "@/components/ColorSwatch"
import { CATEGORIES, COLORS } from "@/lib/constants"

export function OwnManageDialog({
  panel,
  saving,
  onClose,
  onAskDelete,
  onBackToEdit,
  onDelete,
  onSave,
}) {
  const own = panel?.own
  const view = panel?.view

  return (
    <AlertDialog open={Boolean(panel)} onOpenChange={(open) => !open && onClose()}>
      <AlertDialogContent>
        {view === "edit" && own ? (
          <EditView
            own={own}
            saving={saving}
            onClose={onClose}
            onAskDelete={onAskDelete}
            onSave={onSave}
          />
        ) : null}
        {view === "delete" && own ? (
          <DeleteView
            own={own}
            saving={saving}
            onClose={onBackToEdit}
            onDelete={onDelete}
          />
        ) : null}
      </AlertDialogContent>
    </AlertDialog>
  )
}

function DeleteView({ own, saving, onClose, onDelete }) {
  return (
    <>
      <AlertDialogHeader>
        <AlertDialogTitle>이 줄을 지울까요?</AlertDialogTitle>
        <AlertDialogDescription>
          {own.title} — 집에 있는 것에서 사라집니다.
        </AlertDialogDescription>
      </AlertDialogHeader>
      <AlertDialogFooter className="grid grid-cols-2 gap-2">
        <Button variant="outline" className="h-10 w-full" onClick={onClose} disabled={saving}>
          취소
        </Button>
        <Button variant="destructive" className="h-10 w-full" onClick={onDelete} disabled={saving}>
          {saving ? <Spinner data-icon="inline-start" /> : null}
          삭제
        </Button>
      </AlertDialogFooter>
    </>
  )
}

function EditView({ own, saving, onClose, onAskDelete, onSave }) {
  const [values, setValues] = useState(() => formFromOwn(own))
  const [errors, setErrors] = useState({})

  useEffect(() => {
    setValues(formFromOwn(own))
    setErrors({})
  }, [own])

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

  async function handleSave() {
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
    const priceError = getPriceError(values.price)
    if (priceError) next.price = priceError
    if (values.url.trim() && !URL.canParse(values.url.trim())) {
      next.url = "올바른 URL을 입력해 주세요."
    }
    setErrors(next)
    if (Object.keys(next).length) return
    await onSave({
      url: values.url.trim() || null,
      price: values.price === "" ? null : Number(values.price),
      note: values.note.trim() || null,
      title: values.title.trim(),
      category: values.category,
      categoryDetail:
        values.category === "etc" ? values.categoryDetail.trim() : undefined,
      color: values.color,
      colorDetail:
        values.color === "other" ? values.colorDetail.trim() : undefined,
    })
  }

  return (
    <>
      <AlertDialogHeader>
        <AlertDialogTitle className="truncate">{own.title}</AlertDialogTitle>
        <AlertDialogDescription>
          이름·카테고리·색과 가격·링크·메모를 고칠 수 있어요.
        </AlertDialogDescription>
      </AlertDialogHeader>
      <FieldGroup className="gap-3">
        <Field data-invalid={errors.title ? true : undefined}>
          <FieldLabel htmlFor="own-title">이름</FieldLabel>
          <Input
            id="own-title"
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
            <FieldLabel htmlFor="own-category-detail">다른 종류</FieldLabel>
            <Input
              id="own-category-detail"
              placeholder="종류를 입력하세요"
              value={values.categoryDetail}
              onChange={(event) => update("categoryDetail", event.target.value)}
              aria-invalid={Boolean(errors.categoryDetail)}
              className="h-10"
            />
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
            <FieldLabel htmlFor="own-color-detail">다른 색</FieldLabel>
            <Input
              id="own-color-detail"
              placeholder="예: 카키"
              value={values.colorDetail}
              onChange={(event) => update("colorDetail", event.target.value)}
              aria-invalid={Boolean(errors.colorDetail)}
              className="h-10"
            />
            <FieldError>{errors.colorDetail}</FieldError>
          </Field>
        ) : null}
        <Field data-invalid={errors.price ? true : undefined}>
          <FieldLabel htmlFor="own-price">가격</FieldLabel>
          <Input
            id="own-price"
            type="number"
            min="0"
            max={String(MAX_PRICE)}
            step="1"
            inputMode="numeric"
            placeholder="선택"
            value={values.price}
            onChange={(event) => update("price", event.target.value)}
            aria-invalid={Boolean(errors.price)}
            className="h-10"
          />
          <FieldError>{errors.price}</FieldError>
        </Field>
        <Field data-invalid={errors.url ? true : undefined}>
          <FieldLabel htmlFor="own-url">링크</FieldLabel>
          <Input
            id="own-url"
            type="url"
            inputMode="url"
            placeholder="선택"
            maxLength={2048}
            value={values.url}
            onChange={(event) => update("url", event.target.value)}
            aria-invalid={Boolean(errors.url)}
            className="h-10"
          />
          <FieldError>{errors.url}</FieldError>
        </Field>
        <Field>
          <FieldLabel htmlFor="own-note">메모</FieldLabel>
          <Textarea
            id="own-note"
            placeholder="선택"
            maxLength={2000}
            value={values.note}
            onChange={(event) => update("note", event.target.value)}
          />
        </Field>
      </FieldGroup>
      <AlertDialogFooter className="flex-col gap-2">
        <div className="grid w-full grid-cols-2 gap-2">
          <Button
            type="button"
            variant="outline"
            className="h-10 w-full"
            onClick={onClose}
            disabled={saving}
          >
            취소
          </Button>
          <Button
            type="button"
            className="h-10 w-full"
            onClick={handleSave}
            disabled={saving}
          >
            {saving ? <Spinner data-icon="inline-start" /> : null}
            저장
          </Button>
        </div>
        <Button
          type="button"
          variant="ghost"
          className="h-10 w-full text-destructive hover:text-destructive"
          onClick={onAskDelete}
          disabled={saving}
        >
          삭제
        </Button>
      </AlertDialogFooter>
    </>
  )
}

function formFromOwn(own) {
  return {
    url: own.url ?? "",
    price: own.price == null ? "" : String(own.price),
    note: own.note ?? "",
    title: own.title ?? "",
    category: own.category ?? "",
    categoryDetail: own.categoryDetail ?? "",
    color: own.color ?? "",
    colorDetail: own.colorDetail ?? "",
  }
}
