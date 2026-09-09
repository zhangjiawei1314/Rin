import { useState } from 'react'
import { Card, Row, Col, Statistic, Button, Table, Tag, Space } from 'antd'
import { ArrowUpOutlined, PlusOutlined, EditOutlined, ReloadOutlined, PlusCircleOutlined } from '@ant-design/icons'
import { useTranslation } from 'react-i18next'
import { Helmet } from 'react-helmet'
import { AntdAdminLayout } from "../../../components/ui/admin-layout";
import { Link } from 'wouter'

export function DashboardPage() {
  const { t } = useTranslation()

  // 模拟数据
  const [stats] = useState([
    { title: '总文章', value: 112, prefix: <EditOutlined />, suffix: '篇' },
    { title: '本月访问', value: 8642, prefix: <ArrowUpOutlined />, suffix: '次' },
    { title: '新增评论', value: 23, prefix: <PlusOutlined />, suffix: '条' },
    { title: '待审核', value: 5, prefix: <EditOutlined />, suffix: '篇' },
  ])

  const columns = [
    {
      title: t('antd.table.title', '标题'),
      dataIndex: 'title',
      key: 'title',
    },
    {
      title: t('antd.table.status', '状态'),
      dataIndex: 'status',
      key: 'status',
      render: (status: string) => (
        <Tag color={status === 'published' ? 'green' : 'orange'}>
          {status === 'published' ? t('antd.table.published', '已发布') : t('antd.table.draft', '草稿')}
        </Tag>
      ),
    },
    {
      title: t('antd.table.views', '浏览量'),
      dataIndex: 'views',
      key: 'views',
    },
    {
      title: t('antd.table.created_at', '创建时间'),
      dataIndex: 'createdAt',
      key: 'createdAt',
    },
    {
      title: t('antd.table.actions', '操作'),
      key: 'action',
      render: () => (
        <Space size="middle">
          <Button type="link">{t('antd.table.edit', '编辑')}</Button>
          <Button type="link" danger>{t('antd.table.delete', '删除')}</Button>
        </Space>
      ),
    },
  ]

  const data = [
    { key: '1', title: '示例文章 1', status: 'published', views: 123, createdAt: '2024-01-01' },
    { key: '2', title: '示例文章 2', status: 'draft', views: 45, createdAt: '2024-01-02' },
  ]

  return (
    <>
      <Helmet>
        <title>{t('antd.dashboard.title')} - Rin Admin</title>
      </Helmet>
      <AntdAdminLayout>
        <div>
          {/* 页面标题 */}
          <div className="mb-6">
            <h1 className="text-2xl font-bold">{t('antd.dashboard.title')}</h1>
            <p className="text-gray-600 mt-2">{t('antd.dashboard.description')}</p>
          </div>

          {/* 统计卡片 */}
          <Row gutter={16} className="mb-6">
            {stats.map((stat, index) => (
              <Col span={6} key={index}>
                <Card>
                  <Statistic
                    title={stat.title}
                    value={stat.value}
                    prefix={stat.prefix}
                    suffix={stat.suffix}
                  />
                </Card>
              </Col>
            ))}
          </Row>

          {/* 数据表格 */}
          <Card
            title={t('antd.table.recent_articles', '最近文章')}
            extra={
              <Button icon={<ReloadOutlined />}>
                {t('antd.table.refresh', '刷新')}
              </Button>
            }
            className="mb-6"
          >
            <Table
              columns={columns}
              dataSource={data}
              pagination={{ pageSize: 10 }}
            />
          </Card>

          {/* 操作按钮 */}
          <Space>
            <Link to="/admin/feed/edit">
              <Button type="primary" icon={<PlusCircleOutlined />}>
                新建文章
              </Button>
            </Link>
            <Button>
              {t('antd.table.export', '导出数据')}
            </Button>
          </Space>
        </div>
      </AntdAdminLayout>
    </>
  )
}