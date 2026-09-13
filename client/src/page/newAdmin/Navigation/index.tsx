import { useCallback, useEffect, useMemo, useState } from 'react'
import { Helmet } from 'react-helmet'
import {
  App as AntApp,
  Button,
  Card,
  Empty,
  Form,
  Input,
  Modal,
  Popconfirm,
  Space,
  Switch,
  Table,
  Tabs,
  Tooltip,
  Typography,
} from 'antd'
import {
  PlusOutlined,
  EditOutlined,
  DeleteOutlined,
  ArrowUpOutlined,
  ArrowDownOutlined,
  GlobalOutlined,
  LinkOutlined,
  AppstoreOutlined,
} from '@ant-design/icons'
import { client } from '../../../app/runtime'
import { AntdAdminLayout } from '../../../components/ui/admin-layout'
import {
  NAV_SITE_CONFIG_KEY,
  isExternalUrl,
  isImageUrl,
  parseNavSiteItems,
  resolveNavSiteItems,
  serializeNavSiteItems,
  type NavSiteItem,
} from '../../../components/site-header/nav-site-items'

const { Text } = Typography

export function NavigationAdminPage() {
  const { message } = AntApp.useApp()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [items, setItems] = useState<NavSiteItem[]>([])
  const [originalJson, setOriginalJson] = useState<string>('[]')
  const [editingItem, setEditingItem] = useState<NavSiteItem | null>(null)
  const [modalOpen, setModalOpen] = useState(false)
  const [form] = Form.useForm<NavSiteItem>()

  const fetchConfig = useCallback(async () => {
    setLoading(true)
    try {
      const { data, error } = await client.config.get('client')
      if (error) {
        message.error(error.value || '加载配置失败')
        return
      }
      const raw = (data as Record<string, unknown>)?.[NAV_SITE_CONFIG_KEY]
      const parsed = parseNavSiteItems(raw) ?? []
      setItems(parsed)
      setOriginalJson(serializeNavSiteItems(parsed))
    } catch {
      message.error('加载配置失败')
    } finally {
      setLoading(false)
    }
  }, [message])

  useEffect(() => {
    fetchConfig()
  }, [fetchConfig])

  const hasChanges = useMemo(
    () => serializeNavSiteItems(items) !== originalJson,
    [items, originalJson],
  )

  const handleSave = async () => {
    setSaving(true)
    try {
      const { error } = await client.config.update('client', {
        [NAV_SITE_CONFIG_KEY]: items,
      })
      if (error) {
        message.error(error.value || '保存失败')
        return
      }
      setOriginalJson(serializeNavSiteItems(items))
      message.success('导航配置已保存')
    } catch {
      message.error('保存失败')
    } finally {
      setSaving(false)
    }
  }

  const handleReset = () => {
    const parsed = parseNavSiteItems(originalJson) ?? []
    setItems(parsed)
  }

  const openCreate = () => {
    form.resetFields()
    form.setFieldsValue({ icon: '🔗', enabled: true })
    setEditingItem(null)
    setModalOpen(true)
  }

  const openEdit = (item: NavSiteItem, index: number) => {
    form.setFieldsValue({ ...item, order: item.order ?? index })
    setEditingItem(item)
    setModalOpen(true)
  }

  const handleModalOk = async () => {
    try {
      const values = await form.validateFields()
      const newItem: NavSiteItem = {
        title: values.title.trim(),
        url: values.url.trim(),
        icon: values.icon?.trim() || '🔗',
        description: values.description?.trim() || undefined,
        order: values.order,
        enabled: values.enabled !== false,
      }
      if (editingItem) {
        setItems(prev => prev.map(it => (it === editingItem ? newItem : it)))
      } else {
        setItems(prev => [...prev, newItem])
      }
      setModalOpen(false)
    } catch {
      // validation errors are shown inline
    }
  }

  const handleDelete = (index: number) => {
    setItems(prev => prev.filter((_, i) => i !== index))
  }

  const moveItem = (index: number, direction: -1 | 1) => {
    const target = index + direction
    if (target < 0 || target >= items.length) return
    const next = [...items]
    ;[next[index], next[target]] = [next[target], next[index]]
    setItems(next)
  }

  const toggleEnabled = (index: number, enabled: boolean) => {
    setItems(prev => prev.map((it, i) => (i === index ? { ...it, enabled } : it)))
  }

  const columns = [
    {
      title: '排序',
      key: 'sort',
      width: 80,
      render: (_: unknown, __: NavSiteItem, index: number) => (
        <Space size="small" direction="vertical">
          <Button
            size="small"
            type="text"
            icon={<ArrowUpOutlined />}
            disabled={index === 0}
            onClick={() => moveItem(index, -1)}
          />
          <Button
            size="small"
            type="text"
            icon={<ArrowDownOutlined />}
            disabled={index === items.length - 1}
            onClick={() => moveItem(index, 1)}
          />
        </Space>
      ),
    },
    {
      title: '图标',
      dataIndex: 'icon',
      key: 'icon',
      width: 64,
      render: (icon: string) => (
        <div style={{ fontSize: 24, textAlign: 'center' }}>
          {isImageUrl(icon) ? (
            <img src={icon} alt="icon" style={{ width: 28, height: 28, objectFit: 'contain' }} />
          ) : (
            <span>{icon || '🔗'}</span>
          )}
        </div>
      ),
    },
    {
      title: '标题',
      dataIndex: 'title',
      key: 'title',
      render: (title: string, record: NavSiteItem) => (
        <Tooltip title={record.description} placement="top">
          <Text strong>{title}</Text>
        </Tooltip>
      ),
    },
    {
      title: '链接地址',
      dataIndex: 'url',
      key: 'url',
      render: (url: string) => {
        const external = isExternalUrl(url)
        return (
          <Space size="small">
            {external ? <GlobalOutlined style={{ color: '#1677ff' }} /> : <LinkOutlined style={{ color: '#52c41a' }} />}
            <code style={{ fontSize: 13 }}>{url}</code>
          </Space>
        )
      },
    },
    {
      title: '启用',
      dataIndex: 'enabled',
      key: 'enabled',
      width: 80,
      render: (enabled: boolean | undefined, _: NavSiteItem, index: number) => (
        <Switch checked={enabled !== false} onChange={(checked) => toggleEnabled(index, checked)} />
      ),
    },
    {
      title: '操作',
      key: 'action',
      width: 140,
      render: (_: unknown, record: NavSiteItem, index: number) => (
        <Space>
          <Button size="small" icon={<EditOutlined />} onClick={() => openEdit(record, index)} />
          <Popconfirm
            title="确认删除此导航项？"
            onConfirm={() => handleDelete(index)}
            okText="删除"
            cancelText="取消"
            okButtonProps={{ danger: true }}
          >
            <Button size="small" danger icon={<DeleteOutlined />} />
          </Popconfirm>
        </Space>
      ),
    },
  ]

  return (
    <AntdAdminLayout>
      <Helmet>
        <title>导航栏管理 - 管理后台</title>
      </Helmet>
      <Card
        title={
          <Space>
            <AppstoreOutlined />
            <span>导航栏管理</span>
          </Space>
        }
        style={{ marginBottom: 24 }}
      >
        <Tabs
          defaultActiveKey="custom"
          items={[
            {
              key: 'custom',
              label: '自定义导航栏',
              children: (
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                    <Text type="secondary">
                      添加自定义导航入口（图标 + 标题），保存后可在独立导航页面路由展示。
                    </Text>
                    <Space>
                      {hasChanges && (
                        <>
                          <Button onClick={handleReset} disabled={saving || loading}>重置</Button>
                          <Button type="primary" onClick={handleSave} loading={saving} disabled={loading}>
                            保存配置
                          </Button>
                        </>
                      )}
                      <Button type="primary" icon={<PlusOutlined />} onClick={openCreate}>
                        添加导航项
                      </Button>
                    </Space>
                  </div>
                  <Table
                    dataSource={items}
                    columns={columns}
                    loading={loading}
                    rowKey={(_, index) => String(index)}
                    pagination={false}
                    locale={{
                      emptyText: (
                        <Empty
                          description="暂无导航项"
                          imageStyle={{ height: 60 }}
                        />
                      ),
                    }}
                  />
                </div>
              ),
            },
            {
              key: 'preview',
              label: '页面效果预览',
              children: <NavPreviewTab items={items} />,
            },
          ]}
        />
      </Card>

      <Modal
        title={editingItem ? '编辑导航项' : '添加导航项'}
        open={modalOpen}
        onOk={handleModalOk}
        onCancel={() => setModalOpen(false)}
        okText={editingItem ? '保存' : '添加'}
        cancelText="取消"
        destroyOnClose
      >
        <Form form={form} layout="vertical" style={{ marginTop: 16 }}>
          <Form.Item
            name="title"
            label="标题"
            rules={[{ required: true, message: '请输入标题' }]}
          >
            <Input placeholder="例如：博客、GitHub、知乎" maxLength={30} />
          </Form.Item>
          <Form.Item
            name="url"
            label="链接地址"
            rules={[{ required: true, message: '请输入链接地址' }]}
            extra="站内路径如 /timeline；外部链接需以 http:// 或 https:// 开头"
          >
            <Input placeholder="/timeline 或 https://github.com/..." />
          </Form.Item>
          <Form.Item
            name="icon"
            label="图标"
            extra="支持 emoji（如 📖）或图片 URL（.png/.ico/.svg 等）"
          >
            <Input placeholder="📖 或 https://example.com/icon.png" />
          </Form.Item>
          <Form.Item name="description" label="描述（可选）">
            <Input.TextArea placeholder="鼠标悬停时显示的简短描述" rows={2} maxLength={80} />
          </Form.Item>
        </Form>
      </Modal>
    </AntdAdminLayout>
  )
}

/**
 * Tab 2 — 预览效果：以卡片网格的方式模拟独立导航页面的展示效果。
 */
function NavPreviewTab({ items }: { items: NavSiteItem[] }) {
  const resolved = resolveNavSiteItems(items)

  return (
    <div>
      <Text type="secondary" style={{ display: 'block', marginBottom: 16 }}>
        以下为当前编辑中导航项的实时预览效果（仅展示已启用的项目）。
      </Text>

      {resolved.length === 0 ? (
        <Empty description="暂无已启用的导航项" imageStyle={{ height: 60 }} />
      ) : (
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(120px, 1fr))',
            gap: 16,
          }}
        >
          {resolved.map((item, i) => (
            <a
              key={i}
              href={item.url}
              target={isExternalUrl(item.url) ? '_blank' : undefined}
              rel={isExternalUrl(item.url) ? 'noopener noreferrer' : undefined}
              style={{ textDecoration: 'none' }}
            >
              <div
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: 8,
                  padding: '20px 12px',
                  background: '#fff',
                  border: '1px solid #f0f0f0',
                  borderRadius: 12,
                  transition: 'all 0.2s',
                  cursor: 'pointer',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.borderColor = '#1677ff'
                  e.currentTarget.style.boxShadow = '0 2px 8px rgba(22,119,255,0.15)'
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.borderColor = '#f0f0f0'
                  e.currentTarget.style.boxShadow = 'none'
                }}
              >
                <div style={{ fontSize: 32 }}>
                  {isImageUrl(item.icon) ? (
                    <img src={item.icon} alt={item.title} style={{ width: 32, height: 32, objectFit: 'contain' }} />
                  ) : (
                    <span>{item.icon || '🔗'}</span>
                  )}
                </div>
                <Text style={{ fontSize: 13, textAlign: 'center' }}>{item.title}</Text>
                {item.description && (
                  <Text type="secondary" style={{ fontSize: 11, textAlign: 'center' }}>
                    {item.description}
                  </Text>
                )}
              </div>
            </a>
          ))}
        </div>
      )}
    </div>
  )
}
