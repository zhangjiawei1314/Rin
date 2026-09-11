import { Helmet } from 'react-helmet'
import { useState, useEffect, useCallback } from 'react'
import { Card, Space, Table, Avatar, Tag, Button, Tooltip, Popconfirm, message } from 'antd'
import { UserOutlined, ReloadOutlined, SafetyCertificateOutlined, GithubOutlined, LockOutlined, UnlockOutlined } from '@ant-design/icons'
import { client } from '../../../app/runtime'
import { AntdAdminLayout } from '../../../components/ui/admin-layout'
import { formatDateTime } from '../../../utils/format-date'
import type { UserAdminInfo } from '@rin/api'
import { UserStatus } from '@rin/api'

export function UserAdminPage() {
  const [loading, setLoading] = useState(false)
  const [users, setUsers] = useState<UserAdminInfo[]>([])

  const fetchUsers = useCallback(async () => {
    setLoading(true)
    try {
      const { data, error } = await client.user.list()
      if (!error && data) {
        setUsers(data)
      }
    } catch (err) {
      console.error('Failed to fetch users:', err)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchUsers()
  }, [fetchUsers])

  const columns = [
    {
      title: 'ID',
      dataIndex: 'id',
      key: 'id',
      width: 80,
      sorter: (a: UserAdminInfo, b: UserAdminInfo) => a.id - b.id,
    },
    {
      title: '用户',
      key: 'user',
      render: (_: any, record: UserAdminInfo) => (
        <Space>
          <Avatar src={record.avatar} icon={<UserOutlined />} />
          <span className="font-medium text-slate-900">{record.username}</span>
        </Space>
      ),
    },
    {
      title: 'OpenID / 来源',
      dataIndex: 'openid',
      key: 'openid',
      render: (openid: string) => (
        <Space size="small">
          <GithubOutlined className="text-slate-400" />
          <code className="text-xs bg-slate-100 px-1 py-0.5 rounded text-slate-600">{openid}</code>
        </Space>
      ),
    },
    {
      title: '权限',
      dataIndex: 'permission',
      key: 'permission',
      render: (permission: number | null) => (
        permission === 1 ? (
          <Tag color="blue" icon={<SafetyCertificateOutlined />}>管理员</Tag>
        ) : (
          <Tag color="default">普通用户</Tag>
        )
      ),
    },
    {
      title: '状态',
      dataIndex: 'frozen',
      key: 'frozen',
      render: (frozen: number) => (
        frozen === UserStatus.Frozen ? (
          <Tag color="red" icon={<LockOutlined />}>已冻结</Tag>
        ) : (
          <Tag color="green" icon={<UnlockOutlined />}>正常</Tag>
        )
      ),
    },
    {
      title: '注册时间',
      dataIndex: 'createdAt',
      key: 'createdAt',
      render: (date: string) => (
        <Tooltip title={date}>
          <span className="text-slate-500">{formatDateTime(date)}</span>
        </Tooltip>
      ),
      sorter: (a: UserAdminInfo, b: UserAdminInfo) =>
        new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
    },
    {
      title: '最后更新',
      dataIndex: 'updatedAt',
      key: 'updatedAt',
      render: (date: string) => (
        <span className="text-slate-400 text-xs">{formatDateTime(date)}</span>
      ),
    },
    {
      title: '操作',
      key: 'action',
      width: 120,
      render: (_: any, record: UserAdminInfo) => (
        <Popconfirm
          title={record.frozen === 1 ? '确认解冻此用户？' : '确认冻结此用户？'}
          description={record.frozen === 1 ? '解冻后用户将可以正常登录。' : '冻结后用户将无法登录，直到管理员解冻。'}
          onConfirm={async () => {
            try {
              const { error } = await client.user.updateFreeze(record.id, { frozen: record.frozen === 1 ? 0 : 1 })
              if (!error) {
                fetchUsers()
                message.success(record.frozen === 1 ? '已解冻用户' : '已冻结用户')
              } else {
                message.error('操作失败')
              }
            } catch {
              message.error('操作失败')
            }
          }}
          okText={record.frozen === 1 ? '解冻' : '冻结'}
          cancelText="取消"
          okButtonProps={{ danger: record.frozen !== 1 }}
        >
          <Button
            size="small"
            type="primary"
            icon={record.frozen === 1 ? <UnlockOutlined /> : <LockOutlined />}
          >
            {record.frozen === 1 ? '解冻' : '冻结'}
          </Button>
        </Popconfirm>
      ),
    },
  ]

  return (
    <>
      <Helmet>
        <title>用户管理 - Rin Admin</title>
      </Helmet>
      <AntdAdminLayout>
        <div className="max-w-6xl mx-auto p-2">
          <div className="mb-8 flex items-end justify-between">
            <div>
              <h1 className="text-3xl font-bold tracking-tight text-slate-900">用户管理</h1>
              <p className="mt-2 text-slate-500">
                查看并管理所有注册用户的基本信息与权限等级。
              </p>
            </div>
            <Button
              icon={<ReloadOutlined />}
              onClick={fetchUsers}
              loading={loading}
              className="rounded-lg shadow-sm"
            >
              刷新列表
            </Button>
          </div>

          <Card className="shadow-sm border-slate-200 overflow-hidden" bodyStyle={{ padding: 0 }}>
            <Table
              columns={columns}
              dataSource={users}
              rowKey="id"
              loading={loading}
              pagination={{
                pageSize: 20,
                showSizeChanger: true,
                className: "px-6",
              }}
              scroll={{ x: 900 }}
              className="rin-admin-table"
            />
          </Card>
        </div>
      </AntdAdminLayout>
    </>
  )
}
