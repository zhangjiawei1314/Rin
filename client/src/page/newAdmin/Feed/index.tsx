import { Helmet } from 'react-helmet'
import { Link } from 'wouter'
import { useState, useMemo, useEffect } from 'react'
import { Button, Card, Popconfirm, Select, Space, Table, Tag } from 'antd'
import { client } from '../../../app/runtime'
import { AntdAdminLayout } from '../../../components/ui/admin-layout'
import { formatDateTime } from '../../../utils/format-date'
import { EditOutlined, EyeOutlined, PlusCircleOutlined, ReloadOutlined, DeleteOutlined } from '@ant-design/icons'

type FeedType = 'normal' | 'draft' | 'unlisted' | 'all'

interface FeedRow {
  id: number
  title: string
  summary: string
  status: 'draft' | 'unlisted' | 'published'
  views: number
  createdAt: string
  updatedAt: string
  hashtags: Array<{ id: number; name: string }>
  top?: number
}

export function FeedAdminPage() {
  const [type, setType] = useState<FeedType>('normal')
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(10)
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(false)
  const [data, setData] = useState<FeedRow[]>([])

  const fetchFeeds = useMemo(
    () => async (overrideType: FeedType = type, overridePage: number = page) => {
      setLoading(true)
      const { data, error } = await client.feed.list({
        type: overrideType === 'all' ? undefined : overrideType,
        page: overridePage,
        limit: pageSize,
      })
      if (!error && data) {
        setTotal(data.data.length)
        const rows: FeedRow[] = data.data.map((feed) => ({
          id: feed.id,
          title: feed.title || '',
          summary: feed.summary,
          status: 'published', // 需要根据实际的响应数据确定
          views: feed.pv || 0,
          createdAt: feed.createdAt,
          updatedAt: feed.updatedAt,
          hashtags: feed.hashtags || [],
        }))
        setData(rows)
      }
      setLoading(false)
    },
    [type, page, pageSize]
  )

  useEffect(() => {
    fetchFeeds()
  }, [fetchFeeds])

  const handleDelete = async (id: number) => {
    try {
      const { error } = await client.feed.delete(id)
      if (!error) {
        fetchFeeds()
      }
    } catch (err) {
      console.error('Failed to delete feed:', err)
    }
  }

  const getStatusTag = (status: 'draft' | 'unlisted' | 'published') => {
    switch (status) {
      case 'draft':
        return <Tag color="default">草稿</Tag>
      case 'unlisted':
        return <Tag color="orange">未发布</Tag>
      case 'published':
        return <Tag color="green">已发布</Tag>
    }
  }

  const columns = [
    {
      title: 'ID',
      dataIndex: 'id',
      key: 'id',
      width: 60,
    },
    {
      title: '标题',
      dataIndex: 'title',
      key: 'title',
      ellipsis: true,
    },
    {
      title: '摘要',
      dataIndex: 'summary',
      key: 'summary',
      ellipsis: true,
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      render: getStatusTag,
    },
    {
      title: '浏览',
      dataIndex: 'views',
      key: 'views',
      align: 'center' as const,
    },
    {
      title: '创建时间',
      dataIndex: 'createdAt',
      key: 'createdAt',
      render: (date: string) => formatDateTime(date),
    },
    {
      title: '更新时间',
      dataIndex: 'updatedAt',
      key: 'updatedAt',
      render: (date: string) => formatDateTime(date),
    },
    {
      title: '操作',
      key: 'action',
      width: 200,
      fixed: 'right' as const,
      render: (_: any, record: FeedRow) => (
        <Space size={4}>
          <Button
            type="link"
            size="small"
            style={{ paddingInline: 0 }}
            icon={<EyeOutlined />}
            onClick={() => window.location.href = `/feed/${record.id}`}
          >
            查看
          </Button>
          <Button
            type="link"
            size="small"
            style={{ paddingInline: 0 }}
            icon={<EditOutlined />}
            onClick={() => window.location.href = `/admin/feed/edit/${record.id}`}
          >
            编辑
          </Button>
          <Popconfirm
            title="确定要删除这篇文章吗？"
            onConfirm={() => handleDelete(record.id)}
            okText="确定"
            cancelText="取消"
          >
            <Button
              type="link"
              size="small"
              danger
              style={{ paddingInline: 0 }}
              icon={<DeleteOutlined />}
            >
              删除
            </Button>
          </Popconfirm>
        </Space>
      ),
    },
  ]

  return (
    <>
      <Helmet>
        <title>文章管理 - 后台管理</title>
      </Helmet>
      <AntdAdminLayout>
        <div className="container mx-auto p-4">
          <Card
            title={
              <div className="flex items-center justify-between">
                <span>文章管理</span>
                <Space>
                  <Link to="/admin/feed/edit">
                    <Button type="primary" icon={<PlusCircleOutlined />}>
                      新建文章
                    </Button>
                  </Link>
                  <Button
                    icon={<ReloadOutlined />}
                    onClick={() => fetchFeeds()}
                    loading={loading}
                  >
                    刷新
                  </Button>
                </Space>
              </div>
            }
            extra={
              <Select
                value={type}
                onChange={(value) => {
                  setType(value)
                  setPage(1)
                }}
                style={{ width: 120 }}
              >
                <Select.Option value="normal">已发布</Select.Option>
                <Select.Option value="unlisted">未发布</Select.Option>
                <Select.Option value="draft">草稿</Select.Option>
                <Select.Option value="all">全部</Select.Option>
              </Select>
            }
          >
            <Table
              columns={columns}
              dataSource={data}
              rowKey="id"
              loading={loading}
              scroll={{ x: 1000 }}
              pagination={{
                current: page,
                pageSize,
                total,
                showSizeChanger: true,
                showQuickJumper: true,
                showTotal: (total, range) => `共 ${total} 条，显示 ${range[0]}-${range[1]}` as React.ReactNode,
                onChange: (newPage, newPageSize) => {
                  setPage(newPage)
                  setPageSize(newPageSize)
                },
              }}
            />
          </Card>
        </div>
      </AntdAdminLayout>
    </>
  )
}