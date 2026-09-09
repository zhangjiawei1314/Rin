import { Helmet } from "react-helmet"
import { useParams } from "wouter"
import { useEffect, useMemo, useState } from "react"
import { client } from "../../../app/runtime"
import { Button, ButtonWithLoading, FlatPanel, Input } from "@rin/ui"
import { MarkdownEditor } from "../../../components/markdown_editor"

export default function FeedEditPage() {
  const { id } = useParams<{ id?: string }>()
  const [title, setTitle] = useState("")
  const [summary, setSummary] = useState("")
  const [alias, setAlias] = useState("")
  const [tags, setTags] = useState("")
  const [content, setContent] = useState("")
  const [isDraft, setIsDraft] = useState(false)
  const [loading, setLoading] = useState(false)
  const isEditMode = !!id

  useEffect(() => {
    if (id) {
      fetchFeed(parseInt(id))
    }
  }, [id])

  const fetchFeed = async (feedId: number) => {
    setLoading(true)
    try {
      const { data, error } = await client.feed.get(feedId)
      if (!error && data) {
        setTitle(data.title || '')
        setSummary(data.ai_summary || '')
        setAlias((data as any).alias || '')
        setContent(data.content || '')
        setTags(
          Array.isArray((data as any).hashtags)
            ? (data as any).hashtags.map((t: { name: string }) => t.name).join(', ')
            : ''
        )
        setIsDraft((data as any).draft === 1)
      }
    } catch (err) {
      console.error('Failed to fetch feed:', err)
    }
    setLoading(false)
  }

  const handleSubmit = async () => {
    setLoading(true)
    const payload = {
      title,
      content,
      summary,
      alias,
      draft: isDraft,
      listed: !isDraft,
      tags: tags ? tags.split(',').map((tag: string) => tag.trim()).filter(Boolean) : [],
    }
    try {
      const { error } = isEditMode
        ? await client.feed.update(parseInt(id!), payload)
        : await client.feed.create(payload)
      if (!error) {
        window.location.href = '/admin/feed'
      }
    } catch (err) {
      console.error('Failed to save feed:', err)
    }
    setLoading(false)
  }

  const wordCount = useMemo(
    () => content.replace(/\s+/g, '').length,
    [content]
  )

  return (
    <>
      <Helmet>
        <title>{isEditMode ? '编辑文章' : '新建文章'} - 后台管理</title>
      </Helmet>

      <div className="relative mx-auto w-full max-w-7xl px-4 py-6 sm:px-6">
        {/* subtle tech backdrop, very low */}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-x-0 -top-8 h-64 bg-[radial-gradient(60rem_14rem_at_50%_-4rem,rgb(var(--theme-rgb)/0.10),transparent_70%)]"
        />

        <div className="relative flex flex-col gap-5">
          {/* 顶部操作栏 */}
          <header className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex min-w-0 flex-col">
              <h1 className="text-lg font-semibold text-neutral-900 dark:text-neutral-50">
                {isEditMode ? '编辑文章' : '新建文章'}
              </h1>
              <p className="text-sm text-neutral-500 dark:text-neutral-400">
                {isEditMode ? '修改内容后保存' : '写好内容后即可发布'}
              </p>
            </div>
            <div className="flex items-center gap-2.5">
              <Button
                title="取消"
                secondary
                onClick={() => window.location.href = '/admin/feed'}
              />
              <ButtonWithLoading
                title={isEditMode ? '更新文章' : '发布文章'}
                loading={loading}
                onClick={handleSubmit}
                className="shadow-[0_6px_20px_-6px_rgb(var(--theme-rgb)/0.6)]"
              />
            </div>
          </header>

          {/* 左：正文 / 右：设置 */}
          <div className="grid items-start gap-4 lg:grid-cols-[minmax(0,1fr)_20rem] lg:gap-5">
            <div className="flex min-w-0 flex-col gap-4">
              <FlatPanel className="overflow-hidden p-0">
                <input
                  autoFocus
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="文章标题"
                  aria-label="文章标题"
                  className="w-full border-b border-black/10 bg-transparent px-6 py-4 text-2xl font-semibold text-neutral-900 placeholder:text-neutral-300 focus:outline-none focus:ring-0 dark:border-white/10 dark:text-neutral-50 sm:px-7"
                />
                <MarkdownEditor content={content} setContent={setContent} height="640px" />
              </FlatPanel>

              {/* 状态栏：实时字数 + 发布状态 */}
              <div className="flex flex-wrap items-center justify-between gap-3 px-1">
                <span className="font-mono text-xs text-neutral-400 dark:text-neutral-500">
                  {wordCount} 字
                </span>
                <span
                  className={
                    'inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-medium ' +
                    (isDraft
                      ? 'border-amber-300/60 bg-amber-50 text-amber-600 dark:border-amber-400/30 dark:bg-amber-400/10 dark:text-amber-300'
                      : 'border-emerald-300/60 bg-emerald-50 text-emerald-600 dark:border-emerald-400/30 dark:bg-emerald-400/10 dark:text-emerald-300')
                  }
                >
                  <span aria-hidden className="h-1.5 w-1.5 rounded-full bg-current" />
                  {isDraft ? '草稿' : '已发布'}
                </span>
              </div>
            </div>

            <aside className="flex flex-col gap-4 lg:sticky lg:top-6">
              <FlatPanel className="bg-secondary p-5">
                <div className="flex flex-col gap-4">
                  <div className="flex items-center justify-between gap-4">
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-neutral-800 dark:text-neutral-100">
                        {isDraft ? '草稿' : '已发布'}
                      </p>
                      <p className="mt-0.5 text-xs text-neutral-500 dark:text-neutral-400">
                        {isDraft ? '仅自己可见，不对外展示' : '所有人可见'}
                      </p>
                    </div>
                    <button
                      type="button"
                      role="switch"
                      aria-label="发布状态"
                      aria-checked={!isDraft}
                      onClick={() => setIsDraft((v) => !v)}
                      className={
                        'relative inline-flex h-6 w-11 shrink-0 items-center rounded-full border transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-theme/30 ' +
                        (!isDraft
                          ? 'border-transparent bg-theme'
                          : 'border-black/10 bg-neutral-200 dark:border-white/10 dark:bg-neutral-600')
                      }
                    >
                      <span
                        className={
                          'inline-block h-4 w-4 transform rounded-full bg-white shadow-sm transition-transform ' +
                          (!isDraft ? 'translate-x-6' : 'translate-x-1')
                        }
                      />
                    </button>
                  </div>

                  <div className="flex flex-col gap-4 border-t border-black/5 pt-4 dark:border-white/10">
                    <div className="flex flex-col gap-1.5">
                      <label className="text-xs font-medium text-neutral-500 dark:text-neutral-400">
                        摘要
                      </label>
                      <Input value={summary} setValue={setSummary} placeholder="一句话概括这篇文章" />
                    </div>
                    <div className="flex flex-col gap-1.5">
                      <label className="text-xs font-medium text-neutral-500 dark:text-neutral-400">
                        别名
                      </label>
                      <Input value={alias} setValue={setAlias} placeholder="可选，用于生成 URL 路径" />
                    </div>
                    <div className="flex flex-col gap-1.5">
                      <label className="text-xs font-medium text-neutral-500 dark:text-neutral-400">
                        标签
                      </label>
                      <Input value={tags} setValue={setTags} placeholder="用逗号分隔，例如：前端, 性能" />
                    </div>
                  </div>
                </div>
              </FlatPanel>
            </aside>
          </div>
        </div>
      </div>
    </>
  )
}
